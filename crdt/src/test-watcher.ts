import { WebSocket as NodeWS } from 'ws'
  ; (global as any).WebSocket = NodeWS

import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

console.log('Watcher script start')

const ydoc = new Y.Doc()
const provider = new WebsocketProvider('ws://localhost:3100', 'trip-101', ydoc)

const tripInfo = ydoc.getMap('tripInfo')

tripInfo.observe(() => {
  console.log('[Watcher] tripInfo changed')
  console.log('[Watcher] title =', tripInfo.get('title'))
})

provider.on('status', (event: { status: string }) => {
  console.log(`[Watcher] Status: ${event.status}`)
  if (event.status === 'connected') {
    console.log('[Watcher] initial title =', tripInfo.get('title'))
  }
})

// 💡 Node 프로세스가 즉시 종료되지 않게 유지 (임시)
setInterval(() => { }, 1000)
