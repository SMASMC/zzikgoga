import { useAuthStore } from '@/shared/stores/useAuthStore'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Awareness } from 'y-protocols/awareness'
import { acquireProvider, releaseProvider } from '../stores/yjsStore'

const CURSOR_TTL = 2000
const MESSAGE_TTL = 5000

// HSL 기반 동적 색상 생성
// 참여자 수에 맞춰 색상환을 균등 분할하여 중복 없는 색상 생성
const generateHSLColor = (index: number, totalParticipants: number): string => {
  // 색상환(0-360도)을 참여자 수만큼 균등 분할
  const hue = (index * 360) / Math.max(totalParticipants, 1)
  // 채도 70-90%, 밝기 45-65%로 설정하여 가독성 확보
  const saturation = 75 + (index % 3) * 5 // 75%, 80%, 85% 순환
  const lightness = 50 + (index % 2) * 5 // 50%, 55% 순환

  return `hsl(${Math.round(hue)}, ${saturation}%, ${lightness}%)`
}

// 폴백용 고정 색상 팔레트 (awareness 초기화 전 등)
const COLOR_PALETTE = [
  '#ef4444', // red
  '#22c55e', // green
  '#3b82f6', // blue
  '#f97316', // orange
  '#a855f7', // purple
  '#14b8a6', // teal
  '#facc15', // yellow
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#8b5cf6', // violet
  '#f43f5e', // rose
  '#10b981', // emerald
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#84cc16', // lime
  '#d946ef', // fuchsia
]

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

// 동적 색상 할당 - 참여자 목록을 기반으로 고유 색상 생성
const assignDynamicColor = (userId: string, allUserIds: string[]): string => {
  // userId를 정렬하여 일관된 순서 보장
  const sortedUserIds = [...allUserIds].sort()
  const index = sortedUserIds.indexOf(userId)

  if (index === -1) {
    // 폴백: userId를 찾을 수 없는 경우
    return pickColor(userId)
  }

  // 참여자 수에 맞춰 HSL 색상 생성
  return generateHSLColor(index, sortedUserIds.length)
}

const GUEST_ID_STORAGE_KEY = 'plan-cursor-guest-identity'

interface StoredGuestIdentity {
  id: string
  name: string
}

const loadGuestIdentity = (): StoredGuestIdentity | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(GUEST_ID_STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as StoredGuestIdentity
    if (!parsed?.id || !parsed?.name) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

const saveGuestIdentity = (identity: StoredGuestIdentity) => {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(GUEST_ID_STORAGE_KEY, JSON.stringify(identity))
  } catch {
    // ignore write errors (e.g. storage quota)
  }
}

const generateGuestIdentity = (): StoredGuestIdentity => {
  const unique =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)

  return {
    id: `guest-${unique}`,
    name: `Guest ${unique.slice(0, 4).toUpperCase()}`,
  }
}

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
  picture?: string | null
  text: string
  timestamp: number
  isSelf: boolean
}

export interface CursorParticipant {
  clientId: number
  userId: string
  name: string
  color: string
  picture?: string | null
  lastActive: number
  hasCursor: boolean
  hasMessage: boolean
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
  participants: CursorParticipant[]
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
): {
  remoteCursors: RemoteCursor[]
  messagePayloads: AwarenessMessagePayload[]
  participants: CursorParticipant[]
} => {
  const now = Date.now()
  const remoteCursors: RemoteCursor[] = []
  const messagePayloads: AwarenessMessagePayload[] = []
  const participantsMap = new Map<string, CursorParticipant>()

  // 1단계: 모든 참여자의 userId 수집
  const allUserIds: string[] = []
  awareness.getStates().forEach((state) => {
    const typed = state as AwarenessState
    if (typed?.user?.id) {
      allUserIds.push(typed.user.id)
    }
  })

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

    // 동적 색상 할당
    const color = user.color ?? assignDynamicColor(user.id, allUserIds)
    const name = user.name ?? 'Unknown'
    const picture = user.picture ?? null
    const isSelf = clientId === selfClientId

    messagePayloads.push({
      clientId,
      userId: user.id,
      name,
      color,
      picture,
      message: normalizedMessage,
    })

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

    const lastActiveCandidate = Math.max(
      normalizedCursor?.timestamp ?? 0,
      normalizedMessage?.timestamp ?? 0
    )
    const lastActive = lastActiveCandidate > 0 ? lastActiveCandidate : now

    const participantEntry: CursorParticipant = {
      clientId,
      userId: user.id,
      name,
      color,
      picture,
      lastActive,
      hasCursor: Boolean(normalizedCursor),
      hasMessage: Boolean(normalizedMessage),
      isSelf,
    }

    const existingParticipant = participantsMap.get(user.id)
    if (!existingParticipant || lastActive >= existingParticipant.lastActive) {
      participantsMap.set(user.id, participantEntry)
    }

    if (isSelf) {
      return
    }

    if (normalizedCursor || normalizedMessage) {
      const fallbackCursor: CursorPosition = {
        x: 50,
        y: 50,
        timestamp: now,
      }

      remoteCursors.push({
        clientId,
        userId: user.id,
        name,
        color,
        picture,
        cursor: normalizedCursor ?? fallbackCursor,
        message: normalizedMessage,
      })
    }
  })

  return {
    remoteCursors,
    messagePayloads,
    participants: Array.from(participantsMap.values()),
  }
}

const deduplicateRemoteCursors = (cursors: RemoteCursor[]): RemoteCursor[] => {
  const map = new Map<string, RemoteCursor>()
  cursors.forEach((cursor) => {
    const existing = map.get(cursor.userId)
    if (!existing || cursor.cursor.timestamp >= existing.cursor.timestamp) {
      map.set(cursor.userId, cursor)
    }
  })
  return Array.from(map.values())
}

export const useSharedCursors = (roomId: string): SharedCursorSession => {
  const authUser = useAuthStore((state) => state.user)
  const fallbackUserRef = useRef<{ id: string; name: string; picture: string | null }>()

  if (!fallbackUserRef.current) {
    const stored = loadGuestIdentity()
    const identity = stored ?? generateGuestIdentity()
    if (!stored) {
      saveGuestIdentity(identity)
    }
    fallbackUserRef.current = buildSelfIdentity(identity.id, identity.name, null)
  }

  const guestIdentity = fallbackUserRef.current!

  const baseId = authUser?.id ? String(authUser.id) : guestIdentity.id
  const baseName = authUser?.name ?? guestIdentity.name
  const basePicture = authUser?.picture ?? null

  // 초기 색상은 기본 해시 기반으로 선택 (충돌 방지는 awareness 업데이트 시 적용)
  const color = useMemo(() => pickColor(baseId), [baseId])

  // State는 useMemo보다 먼저 선언되어야 함
  const [assignedColor, setAssignedColor] = useState<string>(color)
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([])
  const [selfMessage, setSelfMessage] = useState<CursorMessage | null>(null)
  const [chatMessages, setChatMessages] = useState<CursorChatMessage[]>([])
  const [participants, setParticipants] = useState<CursorParticipant[]>([])

  const self = useMemo(
    () => ({
      id: baseId,
      name: baseName,
      picture: basePicture,
      color: assignedColor,
    }),
    [baseId, baseName, basePicture, assignedColor]
  )

  const awarenessRef = useRef<Awareness>()
  const frameRef = useRef<number | null>(null)
  const lastCursorRef = useRef<{ x: number; y: number } | null>(null)
  const messageTimeoutRef = useRef<number | null>(null)
  const refreshIntervalRef = useRef<number | null>(null)
  const messageSeenRef = useRef<Map<number, number>>(new Map())

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
            picture: payload.picture,
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
    setParticipants([])

    // 동적 색상 할당: 모든 참여자의 userId 수집
    const allUserIds: string[] = []
    awareness.getStates().forEach((state) => {
      const typed = state as AwarenessState
      if (typed?.user?.id) {
        allUserIds.push(typed.user.id)
      }
    })

    // 자신의 userId가 목록에 없으면 추가 (초기 연결 시)
    if (!allUserIds.includes(self.id)) {
      allUserIds.push(self.id)
    }

    const finalColor = assignDynamicColor(self.id, allUserIds)
    setAssignedColor(finalColor)

    const updateFromAwareness = () => {
      const snapshot = collectAwarenessSnapshot(awareness, awareness.clientID)
      setRemoteCursors(deduplicateRemoteCursors(snapshot.remoteCursors))
      setParticipants(snapshot.participants)
      ingestMessagePayloads(snapshot.messagePayloads, awareness.clientID)
    }

    awareness.setLocalState({
      user: {
        id: self.id,
        name: self.name,
        color: finalColor,
        picture: self.picture ?? null,
      },
      cursor: null,
      message: null,
    })

    const clearCursorState = () => {
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
    }

    const disposePresence = () => {
      awareness.setLocalState(null)
    }

    const handlePageHide = () => {
      disposePresence()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        clearCursorState()
      }
    }

    window.addEventListener('beforeunload', handlePageHide)
    window.addEventListener('pagehide', handlePageHide)
    document.addEventListener('visibilitychange', handleVisibilityChange)

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
      window.removeEventListener('beforeunload', handlePageHide)
      window.removeEventListener('pagehide', handlePageHide)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
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

    // 사용자 정보가 변경되면 awareness 업데이트
    awareness.setLocalState({
      ...currentState,
      user: {
        id: self.id,
        name: self.name,
        color: assignedColor,
        picture: self.picture ?? null,
      },
    })
  }, [assignedColor, self.id, self.name, self.picture])

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
    participants,
  }
}
