import { useMemo, useRef } from 'react'
import { MousePointer2 } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import type { RemoteCursor } from '../hooks/useSharedCursors'

type CursorDisplay = RemoteCursor & { isSelf?: boolean }

interface RemoteCursorsProps {
  cursors: CursorDisplay[]
}

const REMOTE_CURSOR_SMOOTHING = 0.35
const MAX_SNAP_DELTA = 12
const REMOTE_CURSOR_Z_INDEX = 12
const SELF_CURSOR_Z_INDEX = 120

const getInitial = (name: string) => {
  const n = (name ?? '').trim()
  return n ? n.charAt(0).toUpperCase() : '?'
}

const RemoteCursors = ({ cursors }: RemoteCursorsProps) => {
  const previousPositionsRef = useRef<Map<string, RemoteCursor['cursor']>>(new Map())

  const renderedCursors = useMemo(() => {
    const nextPositions = new Map<string, RemoteCursor['cursor']>()

    const next = cursors.map((cursorData) => {
      if (cursorData.isSelf) {
        nextPositions.set(cursorData.userId, cursorData.cursor)
        return cursorData
      }

      const previous = previousPositionsRef.current.get(cursorData.userId)
      if (!previous) {
        nextPositions.set(cursorData.userId, cursorData.cursor)
        return cursorData
      }

      const deltaX = cursorData.cursor.x - previous.x
      const deltaY = cursorData.cursor.y - previous.y
      const shouldSnap = Math.abs(deltaX) > MAX_SNAP_DELTA || Math.abs(deltaY) > MAX_SNAP_DELTA

      const smoothedCursor = shouldSnap
        ? cursorData.cursor
        : {
            ...cursorData.cursor,
            x: previous.x + deltaX * REMOTE_CURSOR_SMOOTHING,
            y: previous.y + deltaY * REMOTE_CURSOR_SMOOTHING,
          }

      nextPositions.set(cursorData.userId, smoothedCursor)

      return {
        ...cursorData,
        cursor: smoothedCursor,
      }
    })

    previousPositionsRef.current = nextPositions
    return next
  }, [cursors])

  return (
    <>
      {renderedCursors.map(({ clientId, cursor, color, name, picture, message, isSelf }) => {
        const text = message?.text?.trim() ?? ''
        const showBubble = text.length > 0

        return (
          <div
            key={clientId}
            className="pointer-events-none absolute select-none"
            style={{
              left: `${cursor.x}%`,
              top: `${cursor.y}%`,
              zIndex: isSelf ? SELF_CURSOR_Z_INDEX : REMOTE_CURSOR_Z_INDEX,
            }}
          >
            <div className="relative -translate-x-3 -translate-y-3">
              {showBubble ? (
                <div
                  className={cn(
                    'absolute bottom-full left-0 mb-2',
                    'rounded-2xl border-2 px-4 py-3 text-2xl font-bold leading-snug',
                    'text-white shadow-2xl backdrop-blur'
                  )}
                  style={{
                    background: `linear-gradient(135deg, ${color}, ${color})`,
                    borderColor: `${color}`,
                  }}
                >
                  <p className="whitespace-nowrap">{text}</p>
                </div>
              ) : null}

              <MousePointer2
                size={36} // 커서 아이콘 크게
                strokeWidth={2}
                className={cn(
                  'transition-transform duration-150',
                  'drop-shadow-[0_6px_14px_rgba(15,23,42,0.35)]',
                  isSelf && 'scale-110'
                )}
                style={{ color, fill: color }}
              />

              <div
                className={cn(
                  'mt-1 flex items-center gap-1.5 rounded-full px-3.5 py-1.5',
                  'text-sm font-semibold text-white shadow-lg backdrop-blur',
                  'border border-white/40',
                  isSelf ? 'scale-[1.03]' : 'opacity-95'
                )}
                style={{
                  background: `linear-gradient(to right, ${color}, ${color})`,
                }}
              >
                {picture ? (
                  <img
                    src={picture}
                    alt={name}
                    className="h-6 w-6 rounded-full border border-white/30 object-cover"
                  />
                ) : (
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-white/30 text-[11px] font-bold text-white"
                    style={{ backgroundColor: color }}
                  >
                    {getInitial(name)}
                  </span>
                )}
                <span className="pr-0.5">{isSelf ? `${name} (나)` : name}</span>
                {isSelf ? (
                  <span className="rounded bg-white/25 px-2 text-[11px] font-extrabold text-white/95">
                    내 커서
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        )
      })}
    </>
  )
}

export default RemoteCursors
