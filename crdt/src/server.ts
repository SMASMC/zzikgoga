import * as http from 'http'
import * as dotenv from 'dotenv'
import * as Y from 'yjs'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import { WebSocketServer, WebSocket, RawData } from 'ws'

import { ydocLoaderService, ydocPersistenceService, naverMapService } from './services'

dotenv.config()

// ---------- config ----------
const HOST = process.env.HOST || '0.0.0.0'
const PORT = Number(process.env.YJS_PORT)

interface Room {
  doc: Y.Doc
  conns: Set<WebSocket>
  awareness: awarenessProtocol.Awareness
}

const rooms = new Map<string, Room>()
// 같은 Doc에 persistence 중복 연결 방지
const persistedDocs = new WeakSet<Y.Doc>()

async function getOrCreateRoom(roomName: string): Promise<Room> {
  const existing = rooms.get(roomName)
  if (existing) return existing

  console.log(`[room] creating new room "${roomName}"`)
  const doc = new Y.Doc()
  const awareness = new awarenessProtocol.Awareness(doc)
  const conns = new Set<WebSocket>()
  const room: Room = { doc, conns, awareness }
  rooms.set(roomName, room)

  const m = /^trip-(\d+)$/.exec(roomName)
  if (!m) {
    console.warn(`[room] invalid roomName "${roomName}". Skipping DB load.`)
  } else {
    const tripId = Number(m[1])
    console.log(`[room] loading trip ${tripId} from DB into Y.Doc ...`)

    try {
      await ydocLoaderService.loadTripData(tripId, doc)
      console.log(`[room] trip ${tripId} loaded into doc.`)
    } catch (error) {
      console.error(`[room] Failed to load trip ${tripId} from DB:`, error)
      console.log(`[room] Creating empty doc for trip ${tripId}`)

      // 빈 문서 초기화 (tripInfo만 설정)
      const tripInfo = doc.getMap('tripInfo')
      tripInfo.set('id', tripId)
    }

    // tripInfo.id 보정 (DB 로드가 id를 안 넣었을 경우 대비)
    const tripInfo = doc.getMap('tripInfo')
    if (tripInfo.get('id') == null) {
      tripInfo.set('id', tripId)
      console.log(`[room] tripInfo.id injected: ${tripId}`)
    }

    if (!persistedDocs.has(doc)) {
      console.log(`[room] attaching persistence (tripId=${tripId})`)
      ydocPersistenceService.setupPersistence(doc)
      persistedDocs.add(doc)
    } else {
      console.log(`[room] persistence already attached (tripId=${tripId})`)
    }
  }

  return room
}

const enum MessageType {
  SYNC = 0,
  AWARENESS = 1,
  AUTH = 2
}

async function handleConnection(ws: WebSocket, req: http.IncomingMessage) {
  const { url, headers } = req
  const fullUrl = new URL(url || '', `http://${headers.host || (HOST + ':' + PORT)}`)
  const roomName = fullUrl.pathname.replace(/^\//, '') || 'default-room'
  console.log(`[server] new ws connection for room="${roomName}"`)

  let room: Room
  try {
    room = await getOrCreateRoom(roomName)
  } catch (error) {
    console.error(`[server] Failed to create room "${roomName}":`, error)
    ws.close(1011, 'Failed to initialize room')
    return
  }

  const { doc, awareness } = room
  room.conns.add(ws)

  // awareness 브로드캐스트
  const broadcastAwarenessUpdate = (originWs: WebSocket | null, changedClients: number[]) => {
    const enc = encoding.createEncoder()
    encoding.writeVarUint(enc, MessageType.AWARENESS)
    encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients))
    const buff = encoding.toUint8Array(enc)

    room.conns.forEach(conn => {
      if (conn !== originWs && conn.readyState === WebSocket.OPEN) conn.send(buff)
    })
  }

  const awarenessUpdateHandler = ({ added, updated, removed }: {
    added: number[], updated: number[], removed: number[]
  }) => {
    const changedClients = added.concat(updated).concat(removed)
    if (changedClients.length > 0) {
      broadcastAwarenessUpdate(null, changedClients)
    }
  }

  awareness.on('update', awarenessUpdateHandler)

  // 초기 sync step1 & step2
  {
    const enc1 = encoding.createEncoder()
    encoding.writeVarUint(enc1, MessageType.SYNC)
    syncProtocol.writeSyncStep1(enc1, doc)
    ws.send(encoding.toUint8Array(enc1))

    const enc2 = encoding.createEncoder()
    encoding.writeVarUint(enc2, MessageType.SYNC)
    syncProtocol.writeSyncStep2(enc2, doc)
    ws.send(encoding.toUint8Array(enc2))
  }

  // 초기 awareness snapshot
  {
    const enc = encoding.createEncoder()
    encoding.writeVarUint(enc, MessageType.AWARENESS)
    encoding.writeVarUint8Array(
      enc,
      awarenessProtocol.encodeAwarenessUpdate(
        awareness,
        Array.from(awareness.getStates().keys())
      )
    )
    ws.send(encoding.toUint8Array(enc))
  }

  ws.on('message', (data: RawData) => {
    const decoder = decoding.createDecoder(new Uint8Array(data as ArrayBufferLike))
    const messageType = decoding.readVarUint(decoder)

    switch (messageType) {
      case MessageType.SYNC: {
        console.log(`[server] Processing SYNC message for room: ${roomName}`)
        const replyEnc = encoding.createEncoder()
        encoding.writeVarUint(replyEnc, MessageType.SYNC)

        // 클라이언트 업데이트를 doc에 적용 + 필요 시 응답
        syncProtocol.readSyncMessage(decoder, replyEnc, doc, ws)
        console.log(`[server] SYNC message processed, doc may have been updated`)

        const reply = encoding.toUint8Array(replyEnc)
        if (reply.length > 1) ws.send(reply)

        // 단순 브로드캐스트(최신 상태 step2)
        const updateEnc = encoding.createEncoder()
        encoding.writeVarUint(updateEnc, MessageType.SYNC)
        syncProtocol.writeSyncStep2(updateEnc, doc)
        const updateMsg = encoding.toUint8Array(updateEnc)
        room.conns.forEach(conn => {
          if (conn !== ws && conn.readyState === WebSocket.OPEN) conn.send(updateMsg)
        })
        break
      }
      case MessageType.AWARENESS: {
        const update = decoding.readVarUint8Array(decoder)
        awarenessProtocol.applyAwarenessUpdate(awareness, update, ws)
        break
      }
      case MessageType.AUTH: {
        break
      }
      default: {
        console.warn('[server] Unknown messageType', messageType)
      }
    }
  })

  ws.on('close', () => {
    console.log('[server] ws closed for room', roomName)
    room.conns.delete(ws)
    awareness.off('update', awarenessUpdateHandler)
    if (room.conns.size === 0) {
      console.log('[room] empty, cleaning up room', roomName)
      rooms.delete(roomName)
    }
  })

  ws.on('error', err => {
    console.error('[server] ws error', err)
  })
}

// ------------------------- HTTP API Handler -------------------------
async function handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const { url = '/', method } = req

  // CORS 헤더는 프록시(Nginx)에서 처리하므로 여기서는 설정하지 않음
  // 프록시 없이 직접 접근 시에만 아래 주석 해제
  // res.setHeader('Access-Control-Allow-Origin', '*')
  // res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  // res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // OPTIONS 요청 처리
  if (method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const parsedUrl = new URL(url, `http://${req.headers.host || (HOST + ':' + PORT)}`)
  const pathname = parsedUrl.pathname

  // Naver Map Direction API
  if (pathname === '/api/naver-map/direction' && method === 'GET') {
    try {
      const startParam = parsedUrl.searchParams.get('start')
      const goalParam = parsedUrl.searchParams.get('goal')
      const option = parsedUrl.searchParams.get('option') || 'traoptimal'

      if (!startParam || !goalParam) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'start and goal parameters are required' }))
        return
      }

      const startParts = startParam.split(',').map(Number)
      const goalParts = goalParam.split(',').map(Number)

      if (startParts.length !== 2 || goalParts.length !== 2) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Coordinates must be in format: lng,lat' }))
        return
      }

      const [startLng, startLat] = startParts as [number, number]
      const [goalLng, goalLat] = goalParts as [number, number]

      if (isNaN(startLat) || isNaN(startLng) || isNaN(goalLat) || isNaN(goalLng)) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid coordinate format' }))
        return
      }

      console.log(`[API] Calculating travel time: ${startParam} -> ${goalParam}`)

      const result = await naverMapService.calculateTravelTime(
        { lat: startLat, lng: startLng },
        { lat: goalLat, lng: goalLng },
        option
      )

      if (result === null) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Failed to calculate travel time' }))
        return
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result))
    } catch (error) {
      console.error('[API] Error:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Internal server error' }))
    }
    return
  }

  // 기본 응답
  res.writeHead(200)
  res.end('y-websocket compatible server alive')
}

// ------------------------- bootstrap -------------------------
const server = http.createServer((req, res) => {
  void handleHttpRequest(req, res)
})

const wss = new WebSocketServer({ server })
wss.on('connection', (ws, req) => {
  handleConnection(ws, req).catch(error => {
    console.error('[server] Unhandled error in handleConnection:', error)
    try {
      ws.close(1011, 'Internal server error')
    } catch (closeError) {
      console.error('[server] Failed to close websocket:', closeError)
    }
  })
})

server.listen(PORT, () => {
  console.log(`y-websocket compatible server running at ws://${HOST}:${PORT}`)
})
