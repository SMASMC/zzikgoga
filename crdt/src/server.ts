import * as http from 'http'
import * as dotenv from 'dotenv'
import * as Y from 'yjs'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import { WebSocketServer, WebSocket, RawData } from 'ws'

import { loadYDocFromDB } from './persistence/dbLoad'
import { setupPersistence } from './persistence/dbPersist'
import { pool } from './db'

dotenv.config()

// ---------- config ----------
const HOST = process.env.HOST || '0.0.0.0'
const PORT = Number(process.env.YJS_PORT)

// 방(룸) 정보를 메모리에 관리
interface Room {
  doc: Y.Doc
  conns: Set<WebSocket>
  awareness: awarenessProtocol.Awareness
}

const rooms = new Map<string, Room>()

/**
 * roomName: "trip-101" 같은 문자열이라고 가정
 * tripId 추출해서 DB에서 로딩하고 persistence 연결
 */
async function getOrCreateRoom(roomName: string): Promise<Room> {
  let existing = rooms.get(roomName)
  if (existing) {
    return existing
  }

  console.log(`[room] creating new room "${roomName}"`)
  const doc = new Y.Doc()
  const awareness = new awarenessProtocol.Awareness(doc)
  const conns = new Set<WebSocket>()

  // room 등록 먼저 해두고
  const room: Room = { doc, conns, awareness }
  rooms.set(roomName, room)

  // tripId 파싱해서 DB에서 문서 초기화
  const tripIdMatch = /^trip-(\d+)$/.exec(roomName)
  if (!tripIdMatch) {
    console.warn(`[room] invalid roomName "${roomName}". Skipping DB load.`)
  } else {
    const tripId = Number(tripIdMatch[1])
    console.log(`[room] loading trip ${tripId} from DB into Y.Doc ...`)

    // DB search_path 설정용
    pool.on('connect', (client) => {
      client.query('SET search_path TO test;')
      console.log('[DB] search_path set to test')
    })

    await loadYDocFromDB(tripId, doc)
    console.log(`[room] trip ${tripId} loaded into doc.`)

    // persistence 훅 (title 바뀌면 UPDATE trip 등)
    setupPersistence(doc)
    console.log(`[room] persistence attached (tripId=${tripId})`)
  }

  return room
}

/**
 * y-websocket 프로토콜에서 사용하는 메시지 타입들
 * (y-websocket 레포에 있는 기본 서버와 동일한 의미)
 */
const enum MessageType {
  SYNC = 0,
  AWARENESS = 1,
  AUTH = 2
}

// 클라이언트 하나와 room 연결 설정
async function handleConnection(ws: WebSocket, req: http.IncomingMessage) {
  const { url, headers } = req
  const fullUrl = new URL(url || '', `http://${headers.host || (HOST + ':' + PORT)}`)
  const roomName = fullUrl.pathname.replace(/^\//, '') || 'default-room'
  console.log(`[server] new ws connection for room="${roomName}"`)

  const room = await getOrCreateRoom(roomName)

  const doc = room.doc
  const awareness = room.awareness
  room.conns.add(ws)

  // ---- awareness 브로드캐스트 헬퍼 ----
  const broadcastAwarenessUpdate = (originWs: WebSocket | null, changedClients: number[]) => {
    // encode awareness update for just the changed clients
    const enc = encoding.createEncoder()
    encoding.writeVarUint(enc, MessageType.AWARENESS)
    encoding.writeVarUint8Array(
      enc,
      awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
    )
    const buff = encoding.toUint8Array(enc)

    room.conns.forEach(conn => {
      if (conn !== originWs && conn.readyState === WebSocket.OPEN) {
        conn.send(buff)
      }
    })
  }

  // awareness 변경 시 호출될 핸들러
  const awarenessUpdateHandler = ({ added, updated, removed }: {
    added: number[], updated: number[], removed: number[]
  }) => {
    const changedClients = added.concat(updated).concat(removed)
    if (changedClients.length > 0) {
      broadcastAwarenessUpdate(null, changedClients)
    }
  }

  awareness.on('update', awarenessUpdateHandler)

  // ---- 초기 sync: step1 + step2 둘 다 보낸다 ----
  {
    // step1
    const enc1 = encoding.createEncoder()
    encoding.writeVarUint(enc1, MessageType.SYNC)
    syncProtocol.writeSyncStep1(enc1, doc)
    ws.send(encoding.toUint8Array(enc1))

    // step2
    const enc2 = encoding.createEncoder()
    encoding.writeVarUint(enc2, MessageType.SYNC)
    syncProtocol.writeSyncStep2(enc2, doc)
    ws.send(encoding.toUint8Array(enc2))
  }

  // ---- 초기 awareness snapshot을 새 클라이언트에게 한 번 쏘기 ----
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

  // 메시지 수신
  ws.on('message', (data: RawData) => {
    const decoder = decoding.createDecoder(new Uint8Array(data as ArrayBufferLike))
    const messageType = decoding.readVarUint(decoder)

    switch (messageType) {
      case MessageType.SYNC: {
        const replyEnc = encoding.createEncoder()
        encoding.writeVarUint(replyEnc, MessageType.SYNC)

        // 이 호출이 핵심이다. 클라 업데이트를 doc에 적용하고,
        // 필요한 경우 replyEnc에 응답(step2)을 쓴다.
        syncProtocol.readSyncMessage(decoder, replyEnc, doc, ws)

        const reply = encoding.toUint8Array(replyEnc)
        if (reply.length > 1) {
          ws.send(reply)
        }

        // 업데이트 브로드캐스트:
        // 여기서 전체 문서 diff를 재송신하는 naive 방식 대신
        // 변경분만 브로드캐스트하려면 writeUpdate를 써야 한다.
        // 다만 안정적으로 하려면 decoder에서 이미 읽은 update buffer를
        // 캐치해서 재사용하는 게 이상적이다. 여기선 단순화 버전으로,
        // doc 전체 update를 다시 만들어 뿌리는 방식으로 갈 수도 있다.
        //
        // 하지만 writeUpdate(doc)는 "doc 전체" 스냅샷을 다시 보내서
        // 비효율적일 수 있다. 간단하게는 다음처럼 직접 apply된 업데이트를
        // 다시 room의 다른 소켓에만 뿌리는 게 정석이다.
        //
        // y-websocket 기본 서버는 readSyncMessage 내부에서
        // syncProtocol message type 0/1/2를 구분하고,
        // type === messageSync.Update일 때 받은 update를 그대로 다른 소켓에 broadcast 한다.
        //
        // 여기선 안전하게 "브로드캐스트 다른 애들한테도 SYNC/Update 보내기"만 하자.

        // naive broadcast: ask doc state again
        const updateEnc = encoding.createEncoder()
        encoding.writeVarUint(updateEnc, MessageType.SYNC)
        syncProtocol.writeSyncStep2(updateEnc, doc)
        const updateMsg = encoding.toUint8Array(updateEnc)

        room.conns.forEach(conn => {
          if (conn !== ws && conn.readyState === WebSocket.OPEN) {
            conn.send(updateMsg)
          }
        })

        break
      }

      case MessageType.AWARENESS: {
        const update = decoding.readVarUint8Array(decoder)
        // 클라이언트가 awareness 보냈을 때 서버 doc에 반영
        awarenessProtocol.applyAwarenessUpdate(
          awareness,
          update,
          ws
        )

        // 그리고 이 변경 내용을 다른 소켓들에게 뿌린다
        // applyAwarenessUpdate 내부적으로 awareness.setStates()를 호출하고
        // 그 결과로 awareness.on('update')가 불리므로
        // 여기서 굳이 broadcastAwarenessUpdate를 직접 또 안 불러도 된다.
        break
      }

      case MessageType.AUTH: {
        // 아직 인증 안 쓰니까 무시
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

    // 연결 닫힌 클라이언트의 awareness 상태 정리
    // 기본 y-websocket 서버는 클라별 clientID를 awareness.clientID로 관리해서
    // 거기 상태를 제거한다. 우리는 아직 clientID를 별도로 안 할당했기 때문에
    // 이 부분은 심플하게 둘 수 있다.

    if (room.conns.size === 0) {
      console.log('[room] empty, cleaning up room', roomName)
      rooms.delete(roomName)
    }
  })

  ws.on('error', err => {
    console.error('[server] ws error', err)
  })
}


// ------------------------- 부트스트랩 -------------------------

// HTTP 서버 (헬스체크 용)
const server = http.createServer((_req, res) => {
  res.writeHead(200)
  res.end('y-websocket compatible server alive')
})

// WebSocket 서버를 붙임
const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  // 연결 들어오면 우리가 만든 핸들러로 처리
  void handleConnection(ws, req)
})

// 리슨 시작
server.listen(PORT, () => {
  console.log(`y-websocket compatible server running at ws://${HOST}:${PORT}`)
})
