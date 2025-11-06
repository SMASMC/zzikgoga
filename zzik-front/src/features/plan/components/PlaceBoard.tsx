import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  PointerEvent as ReactPointerEvent,
  KeyboardEvent as ReactKeyboardEvent,
  FormEvent as ReactFormEvent,
} from 'react'
import { useParams } from 'react-router-dom'
import { cn } from '@/shared/utils/cn'
import RemoteCursors from './RemoteCursors'
import { useSharedCursors } from '../hooks/useSharedCursors'

const CHAT_AUTO_HIDE_MS = 5000

const getRoomId = (tripId: string | undefined) =>
  tripId && tripId.trim().length > 0 ? `trip-${tripId.trim()}` : 'trip-default'

const formatTimestamp = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })

const PlaceBoard = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const roomId = useMemo(() => getRoomId(tripId), [tripId])

  const boardRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const autoHideTimerRef = useRef<number | null>(null)

  const [selfCursor, setSelfCursor] = useState<{ x: number; y: number } | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatValue, setChatValue] = useState('')

  const {
    remoteCursors,
    publishCursor,
    clearCursor,
    self,
    sendMessage,
    selfMessage,
    chatMessages,
  } = useSharedCursors(roomId)

  const clearAutoHideTimer = useCallback(() => {
    if (autoHideTimerRef.current !== null) {
      window.clearTimeout(autoHideTimerRef.current)
      autoHideTimerRef.current = null
    }
  }, [])

  const resetAutoHideTimer = useCallback(() => {
    clearAutoHideTimer()
    autoHideTimerRef.current = window.setTimeout(() => {
      let shouldFocusBoard = false
      setIsChatOpen((open) => {
        if (!open) {
          return open
        }
        const inputValue = inputRef.current?.value ?? ''
        if (inputValue.trim().length === 0) {
          shouldFocusBoard = true
          return false
        }
        return true
      })
      if (shouldFocusBoard) {
        setChatValue('')
        boardRef.current?.focus()
      }
      autoHideTimerRef.current = null
    }, CHAT_AUTO_HIDE_MS)
  }, [clearAutoHideTimer])

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const board = boardRef.current
      if (!board) {
        return
      }

      const rect = board.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) {
        return
      }

      const x = ((event.clientX - rect.left) / rect.width) * 100
      const y = ((event.clientY - rect.top) / rect.height) * 100

      publishCursor({ x, y })
      setSelfCursor({ x, y })
    },
    [publishCursor]
  )

  const handlePointerLeave = useCallback(() => {
    if (!isChatOpen && !selfMessage?.text) {
      clearCursor()
      setSelfCursor(null)
    }
  }, [clearCursor, isChatOpen, selfMessage])

  const handlePointerDown = useCallback(() => {
    boardRef.current?.focus()
  }, [])

  const openChatInput = useCallback(() => {
    if (!selfCursor) {
      setSelfCursor({ x: 50, y: 50 })
    }
    setIsChatOpen(true)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
    resetAutoHideTimer()
  }, [resetAutoHideTimer, selfCursor])

  const closeChatInput = useCallback(() => {
    clearAutoHideTimer()
    setIsChatOpen(false)
    setChatValue('')
    boardRef.current?.focus()
  }, [clearAutoHideTimer])

  const handleBoardKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === '/' && !isChatOpen) {
        const target = event.target as HTMLElement
        if (
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement ||
          target.isContentEditable
        ) {
          return
        }
        event.preventDefault()
        openChatInput()
      } else if (event.key === 'Escape' && isChatOpen) {
        event.preventDefault()
        closeChatInput()
      }
    },
    [closeChatInput, isChatOpen, openChatInput]
  )

  const handleChatSubmit = useCallback(
    (event: ReactFormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const trimmed = chatValue.trim()
      if (trimmed.length === 0) {
        setChatValue('')
        return
      }
      sendMessage(trimmed)
      setChatValue('')
      resetAutoHideTimer()
    },
    [chatValue, resetAutoHideTimer, sendMessage]
  )

  const handleChatInputChange = useCallback(
    (value: string) => {
      setChatValue(value)
      if (isChatOpen) {
        resetAutoHideTimer()
      }
    },
    [isChatOpen, resetAutoHideTimer]
  )

  const handleChatKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeChatInput()
      } else if (event.key === '/') {
        event.stopPropagation()
      }
    },
    [closeChatInput]
  )

  useEffect(() => {
    boardRef.current?.focus()
  }, [])

  useEffect(() => {
    if (isChatOpen) {
      resetAutoHideTimer()
    } else {
      clearAutoHideTimer()
    }
  }, [clearAutoHideTimer, isChatOpen, resetAutoHideTimer])

  useEffect(() => {
    if (isChatOpen && chatMessages.length > 0) {
      resetAutoHideTimer()
    }
  }, [chatMessages, isChatOpen, resetAutoHideTimer])

  useEffect(
    () => () => {
      clearAutoHideTimer()
    },
    [clearAutoHideTimer]
  )

  return (
    <section className="relative flex flex-1 flex-col overflow-hidden border-x border-slate-200 bg-slate-50">
      <div
        ref={boardRef}
        className="relative flex-1 cursor-crosshair outline-none"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onKeyDown={handleBoardKeyDown}
        tabIndex={0}
      >
        <RemoteCursors cursors={remoteCursors} />

        <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs text-slate-600 shadow-sm backdrop-blur">
          <span
            className="inline-flex h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: self.color }}
          />
          <span className="font-medium">{self.name}</span>
        </div>

        {selfCursor ? (
          <div
            className="pointer-events-none absolute"
            style={{
              left: `${selfCursor.x}%`,
              top: `${selfCursor.y}%`,
            }}
          >
            <div className="relative -translate-x-2 -translate-y-2">
              {selfMessage?.text ? (
                <div className="pointer-events-none absolute bottom-full left-0 mb-1 max-w-[220px] rounded-lg bg-blue-500/95 px-3 py-1 text-xs font-medium text-white shadow-lg backdrop-blur">
                  {selfMessage.text}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-slate-500">
          <div className="flex flex-col gap-1">
            <span className="text-base font-semibold text-slate-700">
              여행 일정 보드에 팀원과 함께 참여하세요.{' '}
            </span>
            <span>마우스를 움직이면 서로의 커서를, 메시지를 보내면 실시간으로 공유돼요.</span>
          </div>
        </div>

        <button
          type="button"
          onClick={openChatInput}
          className="group absolute bottom-6 right-6 flex items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-4 py-2 text-xs font-medium text-slate-600 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:border-blue-300 hover:text-blue-600 hover:shadow-xl"
        >
          <span className="text-[11px] uppercase tracking-wide text-slate-400">Chat</span>
          <span className="rounded-md bg-slate-900/90 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
            /
          </span>
          <span className="text-[11px] text-slate-400 group-hover:text-blue-500">눌러서 열기</span>
        </button>

        <div
          className={cn(
            'absolute right-6 top-6 w-80 max-w-[88vw] rounded-2xl border border-white/60 bg-white/95 shadow-2xl backdrop-blur transition-all duration-300',
            isChatOpen
              ? 'pointer-events-auto translate-y-0 opacity-100'
              : 'pointer-events-none -translate-y-2 opacity-0'
          )}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <div className="text-sm font-semibold text-slate-700">실시간 커서 채팅</div>
            <span className="text-xs text-slate-400">ESC로 닫기</span>
          </div>
          <div className="max-h-60 overflow-y-auto px-5 py-3">
            {chatMessages.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-center text-xs text-slate-400">
                아직 메시지가 없어요 '/' 키를 눌러 첫 메시지를 남겨보세요.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={cn('flex gap-2', message.isSelf ? 'justify-end' : 'justify-start')}
                  >
                    {!message.isSelf ? (
                      <div
                        className="mt-1 h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: message.color }}
                      />
                    ) : null}
                    <div
                      className={cn(
                        'max-w-[220px] rounded-2xl px-3 py-2 text-sm leading-snug shadow-sm',
                        message.isSelf
                          ? 'rounded-br-sm bg-blue-500 text-white'
                          : 'rounded-bl-sm border border-slate-100 bg-white text-slate-700'
                      )}
                    >
                      <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wide">
                        <span
                          className={cn(
                            'font-semibold',
                            message.isSelf ? 'text-blue-100' : 'text-slate-400'
                          )}
                        >
                          {message.isSelf ? '나' : message.name}
                        </span>
                        <span
                          className={cn(
                            'font-medium',
                            message.isSelf ? 'text-blue-100/80' : 'text-slate-300'
                          )}
                        >
                          {formatTimestamp(message.timestamp)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap break-words">{message.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-slate-100 px-5 py-3">
            <form className="flex items-center gap-2" onSubmit={handleChatSubmit}>
              <input
                ref={inputRef}
                value={chatValue}
                onChange={(event) => handleChatInputChange(event.target.value)}
                onKeyDown={handleChatKeyDown}
                onFocus={resetAutoHideTimer}
                placeholder="메시지를 입력하고 Enter를 눌러보세요"
                maxLength={200}
                className="flex-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                autoComplete="off"
              />
              <button
                type="submit"
                className="rounded-full bg-blue-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-600"
              >
                보내기{' '}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}

export default PlaceBoard
