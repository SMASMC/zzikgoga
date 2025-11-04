import { useAuthStore } from '@/shared/stores/useAuthStore'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Awareness } from 'y-protocols/awareness'
import { acquireProvider, releaseProvider } from '../stores/yjsStore'

const CURSOR_TTL = 8000
const MESSAGE_TTL = 5000
const COLOR_PALETTE = ['#ef4444', '#22c55e', '#3b82f6', '#f97316', '#a855f7', '#14b8a6', '#facc15']

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const hashToIndex = (value: string, length: number) => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % length
}

const pickColor = (seed: string) =>
  COLOR_PALETTE[hashToIndex(seed || 'default', COLOR_PALETTE.length)]

interface CursorPosition {
  x: number
  y: number
  timestamp: number
}

interface CursorMessage {
  text: string
  timestamp: number
}

export interface CursorChatMessage {
  id: string
  clientId: number
  userId: string
  name: string
  color: string
  text: string
  timestamp: number
  isSelf: boolean
}

interface AwarenessUser {
  id?: string
  name?: string
  color?: string
  picture?: string | null
}

type AwarenessState = {
  user?: AwarenessUser
  cursor?: CursorPosition | null
  message?: CursorMessage | null
}

export interface RemoteCursor {
  clientId: number
  userId: string
  name: string
  color: string
  picture?: string | null
  cursor: CursorPosition
  message?: CursorMessage | null
}

export interface SharedCursorSession {
  remoteCursors: RemoteCursor[]
  publishCursor: (cursor: { x: number; y: number }) => void
  clearCursor: () => void
  self: {
    id: string
    name: string
    color: string
    picture?: string | null
  }
  sendMessage: (text: string) => void
  clearMessage: () => void
  selfMessage: CursorMessage | null
  chatMessages: CursorChatMessage[]
}

const buildSelfIdentity = (id: string, name: string, picture: string | null) => ({
  id,
  name,
  picture: picture ?? null,
})

interface AwarenessMessagePayload {
  clientId: number
  userId: string
  name: string
  color: string
  picture?: string | null
  message: CursorMessage | null
}

const collectAwarenessSnapshot = (
  awareness: Awareness,
  selfClientId: number
): { remoteCursors: RemoteCursor[]; messagePayloads: AwarenessMessagePayload[] } => {
  const now = Date.now()
  const remoteCursors: RemoteCursor[] = []
  const messagePayloads: AwarenessMessagePayload[] = []

  awareness.getStates().forEach((state, clientId) => {
    const typed = state as AwarenessState
    const { cursor, user, message: rawMessage } = typed

    if (!user?.id) {
      return
    }

    const normalizedMessage =
      rawMessage &&
      typeof rawMessage === 'object' &&
      typeof rawMessage.text === 'string' &&
      rawMessage.text.trim().length > 0
        ? (() => {
            const messageTimestamp =
              typeof rawMessage.timestamp === 'number' ? rawMessage.timestamp : now
            if (now - messageTimestamp <= MESSAGE_TTL) {
              return {
                text: rawMessage.text,
                timestamp: messageTimestamp,
              }
            }
            return null
          })()
        : null

    messagePayloads.push({
      clientId,
      userId: user.id,
      name: user.name ?? 'Unknown',
      color: user.color ?? pickColor(user.id),
      picture: user.picture ?? null,
      message: normalizedMessage,
    })

    if (clientId === selfClientId) {
      return
    }

    const normalizedCursor =
      cursor && typeof cursor.x === 'number' && typeof cursor.y === 'number'
        ? (() => {
            const timestamp = typeof cursor.timestamp === 'number' ? cursor.timestamp : now
            if (now - timestamp > CURSOR_TTL) {
              return null
            }
            return {
              x: clamp(cursor.x, 0, 100),
              y: clamp(cursor.y, 0, 100),
              timestamp,
            }
          })()
        : null

    if (normalizedCursor || normalizedMessage) {
      const fallbackCursor: CursorPosition = {
        x: 50,
        y: 50,
        timestamp: now,
      }

      remoteCursors.push({
        clientId,
        userId: user.id,
        name: user.name ?? 'Unknown',
        color: user.color ?? pickColor(user.id),
        picture: user.picture ?? null,
        cursor: normalizedCursor ?? fallbackCursor,
        message: normalizedMessage,
      })
    }
  })

  return {
    remoteCursors,
    messagePayloads,
  }
}

export const useSharedCursors = (roomId: string): SharedCursorSession => {
  const authUser = useAuthStore((state) => state.user)
  const fallbackUserRef = useRef(
    buildSelfIdentity(`guest-${Math.random().toString(36).slice(2, 10)}`, 'Guest', null)
  )

  const baseId = authUser?.id ?? fallbackUserRef.current.id
  const baseName = authUser?.name ?? 'Guest'
  const basePicture = authUser?.picture ?? null

  const color = useMemo(() => pickColor(baseId), [baseId])

  const self = useMemo(
    () => ({
      id: baseId,
      name: baseName,
      picture: basePicture,
      color,
    }),
    [baseId, baseName, basePicture, color]
  )

  const awarenessRef = useRef<Awareness>()
  const frameRef = useRef<number | null>(null)
  const lastCursorRef = useRef<{ x: number; y: number } | null>(null)
  const messageTimeoutRef = useRef<number | null>(null)
  const refreshIntervalRef = useRef<number | null>(null)
  const messageSeenRef = useRef<Map<number, number>>(new Map())

  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([])
  const [selfMessage, setSelfMessage] = useState<CursorMessage | null>(null)
  const [chatMessages, setChatMessages] = useState<CursorChatMessage[]>([])

  const ingestMessagePayloads = useCallback(
    (payloads: AwarenessMessagePayload[], selfClientId: number) => {
      setChatMessages((prev) => {
        const nextMessages = prev.length > 30 ? prev.slice(-30) : prev
        const additions: CursorChatMessage[] = []

        payloads.forEach((payload) => {
          const { message } = payload
          if (!message) {
            return
          }

          const lastSeen = messageSeenRef.current.get(payload.clientId) ?? 0
          if (message.timestamp <= lastSeen) {
            return
          }

          messageSeenRef.current.set(payload.clientId, message.timestamp)
          additions.push({
            id: `${payload.clientId}-${message.timestamp}`,
            clientId: payload.clientId,
            userId: payload.userId,
            name: payload.name,
            color: payload.color,
            text: message.text,
            timestamp: message.timestamp,
            isSelf: payload.clientId === selfClientId,
          })
        })

        if (additions.length === 0) {
          return nextMessages
        }

        const merged = [...nextMessages, ...additions]
        merged.sort((a, b) => a.timestamp - b.timestamp)
        return merged.length > 30 ? merged.slice(-30) : merged
      })
    },
    []
  )

  useEffect(() => {
    const entry = acquireProvider(roomId)
    const awareness = entry.awareness

    awarenessRef.current = awareness
    messageSeenRef.current.clear()
    setChatMessages([])
    setSelfMessage(null)

    const updateFromAwareness = () => {
      const snapshot = collectAwarenessSnapshot(awareness, awareness.clientID)
      setRemoteCursors(snapshot.remoteCursors)
      ingestMessagePayloads(snapshot.messagePayloads, awareness.clientID)
    }

    awareness.setLocalState({
      user: {
        id: self.id,
        name: self.name,
        color: self.color,
        picture: self.picture ?? null,
      },
      cursor: null,
      message: null,
    })

    updateFromAwareness()

    awareness.on('update', updateFromAwareness)
    awareness.on('change', updateFromAwareness)

    if (refreshIntervalRef.current !== null) {
      window.clearInterval(refreshIntervalRef.current)
    }
    refreshIntervalRef.current = window.setInterval(() => {
      updateFromAwareness()
    }, 1000)

    return () => {
      awareness.off('update', updateFromAwareness)
      awareness.off('change', updateFromAwareness)
      awareness.setLocalState(null)
      if (refreshIntervalRef.current !== null) {
        window.clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
      if (messageTimeoutRef.current !== null) {
        window.clearTimeout(messageTimeoutRef.current)
        messageTimeoutRef.current = null
      }
      messageSeenRef.current.clear()
      releaseProvider(roomId)
    }
  }, [ingestMessagePayloads, roomId, self.color, self.id, self.name, self.picture])

  useEffect(() => {
    const awareness = awarenessRef.current
    if (!awareness) {
      return
    }

    const currentState = awareness.getLocalState() ?? {}

    awareness.setLocalState({
      ...currentState,
      user: {
        id: self.id,
        name: self.name,
        color: self.color,
        picture: self.picture ?? null,
      },
    })
  }, [self.color, self.id, self.name, self.picture])

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
      if (messageTimeoutRef.current !== null) {
        window.clearTimeout(messageTimeoutRef.current)
        messageTimeoutRef.current = null
      }
      if (refreshIntervalRef.current !== null) {
        window.clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
    },
    []
  )

  const publishCursor = useCallback((cursor: { x: number; y: number }) => {
    lastCursorRef.current = cursor

    if (frameRef.current !== null) {
      return
    }

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      const awareness = awarenessRef.current
      if (!awareness || !lastCursorRef.current) {
        return
      }

      awareness.setLocalStateField('cursor', {
        x: clamp(lastCursorRef.current.x, 0, 100),
        y: clamp(lastCursorRef.current.y, 0, 100),
        timestamp: Date.now(),
      })
    })
  }, [])

  const clearMessage = useCallback(() => {
    if (messageTimeoutRef.current !== null) {
      window.clearTimeout(messageTimeoutRef.current)
      messageTimeoutRef.current = null
    }

    const awareness = awarenessRef.current
    if (!awareness) {
      return
    }

    awareness.setLocalStateField('message', null)
    setSelfMessage(null)
  }, [])

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) {
        return
      }

      const awareness = awarenessRef.current
      if (!awareness) {
        return
      }

      const payload: CursorMessage = {
        text: trimmed,
        timestamp: Date.now(),
      }

      awareness.setLocalStateField('message', payload)
      setSelfMessage(payload)

      if (messageTimeoutRef.current !== null) {
        window.clearTimeout(messageTimeoutRef.current)
      }

      messageTimeoutRef.current = window.setTimeout(() => {
        clearMessage()
      }, MESSAGE_TTL)
    },
    [clearMessage]
  )

  const clearCursor = useCallback(() => {
    const awareness = awarenessRef.current
    if (!awareness) {
      return
    }

    awareness.setLocalStateField('cursor', null)
  }, [])

  return {
    remoteCursors,
    publishCursor,
    clearCursor,
    self,
    sendMessage,
    clearMessage,
    selfMessage,
    chatMessages,
  }
}
