import { MousePointer2 } from 'lucide-react'
import type { RemoteCursor } from '../hooks/useSharedCursors'

interface RemoteCursorsProps {
  cursors: RemoteCursor[]
}

const getInitial = (name: string) => {
  if (!name) {
    return '?'
  }
  return name.trim().charAt(0).toUpperCase()
}

const RemoteCursors = ({ cursors }: RemoteCursorsProps) => {
  return (
    <>
      {cursors.map(({ clientId, cursor, color, name, picture, message }) => (
        <div
          key={clientId}
          className="pointer-events-none absolute select-none"
          style={{
            left: `${cursor.x}%`,
            top: `${cursor.y}%`,
          }}
        >
          <div className="relative -translate-x-2 -translate-y-2">
            {message?.text ? (
              <div className="absolute bottom-full left-0 mb-1 max-w-[240px] rounded-xl border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-lg backdrop-blur">
                {message.text}
              </div>
            ) : null}
            <MousePointer2
              size={20}
              strokeWidth={2}
              className="drop-shadow-[0_4px_8px_rgba(15,23,42,0.25)]"
              style={{ color }}
            />
            <div className="mt-1 flex items-center gap-1 rounded-full bg-slate-900/85 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg backdrop-blur">
              {picture ? (
                <img
                  src={picture}
                  alt={name}
                  className="h-4 w-4 rounded-full border border-white/30 object-cover"
                />
              ) : (
                <span
                  className="flex h-4 w-4 items-center justify-center rounded-full border border-white/30 text-[10px] font-semibold text-white"
                  style={{ backgroundColor: color }}
                >
                  {getInitial(name)}
                </span>
              )}
              <span>{name}</span>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

export default RemoteCursors
