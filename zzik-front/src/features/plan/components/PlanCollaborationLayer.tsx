import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { cn } from '@/shared/utils/cn'
import RemoteCursors from './RemoteCursors'
import type { SharedCursorSession } from '../hooks/useSharedCursors'

interface PlanCollaborationLayerProps {
  children: ReactNode
  className?: string
  cursorSession: SharedCursorSession
}

const PlanCollaborationLayer = ({
  children,
  className = '',
  cursorSession,
}: PlanCollaborationLayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number | null>(null)
  const lastCursorRef = useRef<{ x: number; y: number } | null>(null)
  const [selfCursor, setSelfCursor] = useState<{ x: number; y: number } | null>(null)

  const { remoteCursors, publishCursor, clearCursor, self, selfMessage } = cursorSession

  const cursorFeed = useMemo(() => {
    if (!selfCursor) {
      return remoteCursors
    }

    const hasSelfCursor = remoteCursors.some((cursor) => cursor.userId === self.id)

    if (hasSelfCursor) {
      return remoteCursors.map((cursor) =>
        cursor.userId === self.id
          ? {
              ...cursor,
              isSelf: true,
            }
          : cursor
      )
    }

    return [
      ...remoteCursors,
      {
        clientId: Number.MAX_SAFE_INTEGER,
        userId: self.id,
        name: self.name,
        color: self.color,
        picture: self.picture ?? undefined,
        cursor: { x: selfCursor.x, y: selfCursor.y, timestamp: Date.now() },
        message: selfMessage ?? undefined,
        isSelf: true,
      },
    ]
  }, [remoteCursors, self.color, self.id, self.name, self.picture, selfCursor, selfMessage])

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const el = containerRef.current
      if (!el) return
      const { left, top, width, height } = el.getBoundingClientRect()
      if (width === 0 || height === 0) return

      const x = ((event.clientX - left) / width) * 100
      const y = ((event.clientY - top) / height) * 100

      lastCursorRef.current = { x, y }

      if (frameRef.current !== null) {
        return
      }

      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null
        if (!lastCursorRef.current) {
          return
        }
        publishCursor(lastCursorRef.current)
        setSelfCursor(lastCursorRef.current)
      })
    },
    [publishCursor]
  )

  const handlePointerLeave = useCallback(() => {
    if (!selfMessage?.text) {
      clearCursor()
      setSelfCursor(null)
    }
  }, [clearCursor, selfMessage])

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    if (
      target?.closest(
        '[contenteditable="true"], input, textarea, select, button, a, [role="button"]'
      )
    ) {
      return
    }
    containerRef.current?.focus()
  }, [])

  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const previousCursor = document.body.style.cursor
    document.body.style.cursor = 'none'
    return () => {
      document.body.style.cursor = previousCursor
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex min-h-0 flex-col cursor-none [&_*]:cursor-none md:h-screen md:min-h-0 md:flex-row',
        className
      )}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      tabIndex={0}
    >
      {children}

      <div className="pointer-events-none absolute inset-0">
        <RemoteCursors cursors={cursorFeed} />
      </div>
    </div>
  )
}

export default PlanCollaborationLayer
