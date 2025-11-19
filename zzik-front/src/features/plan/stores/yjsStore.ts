import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import type { Awareness } from 'y-protocols/awareness'

interface ProviderEntry {
  doc: Y.Doc
  provider: WebsocketProvider
  awareness: Awareness
  refCount: number
}

export interface AcquiredProvider {
  doc: Y.Doc
  provider: WebsocketProvider
  awareness: Awareness
  roomId: string
}

const providers = new Map<string, ProviderEntry>()

const resolveServerUrl = () => {
  const fromEnv = import.meta.env.VITE_CRDT_URL
  if (fromEnv && fromEnv.trim().length > 0) {
    const url = fromEnv.trim()
    // http:// -> ws://, https:// -> wss:// 변환
    if (url.startsWith('https://')) {
      return url.replace('https://', 'wss://')
    }
    if (url.startsWith('http://')) {
      return url.replace('http://', 'ws://')
    }
    // 이미 ws:// 또는 wss://로 시작하면 그대로 사용
    return url
  }

  return 'ws://localhost:3100'
}

export const acquireProvider = (roomId: string): AcquiredProvider => {
  let entry = providers.get(roomId)

  if (!entry) {
    const doc = new Y.Doc()
    const provider = new WebsocketProvider(resolveServerUrl(), roomId, doc, {
      connect: true,
    })

    entry = {
      doc,
      provider,
      awareness: provider.awareness,
      refCount: 0,
    }

    providers.set(roomId, entry)
  }

  entry.refCount += 1

  return {
    doc: entry.doc,
    provider: entry.provider,
    awareness: entry.awareness,
    roomId,
  }
}

export const releaseProvider = (roomId: string) => {
  const entry = providers.get(roomId)
  if (!entry) {
    return
  }

  entry.refCount -= 1

  if (entry.refCount <= 0) {
    entry.provider.destroy()
    entry.doc.destroy()
    providers.delete(roomId)
  }
}
