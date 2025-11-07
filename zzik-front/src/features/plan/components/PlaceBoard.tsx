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
import { useYTripDoc } from '../hooks/useYTripDoc'
import * as Y from 'yjs'
import YTextEditor from './YTextEditor'
// import YCollabEditor from './YCollabEditor'
import ScheduleMemoEditor from './ScheduleMemoEditor'
import SolidButton from '@/components/atoms/SolidButton'
import FriendInviteModal from './FriendInviteModal'

const CHAT_AUTO_HIDE_MS = 5000

const getRoomId = (tripId: string | undefined) =>
  tripId && tripId.trim().length > 0 ? `trip-${tripId.trim()}` : 'trip-default'

const formatTimestamp = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })

const toTime = (isoLocal: string) =>
  isoLocal?.length >= 16 ? isoLocal.slice(11, 16) : isoLocal || ''

const isoToInputStart = (isoLocal: string) => {
  if (!isoLocal) return ''
  const date = isoLocal.slice(0, 10)
  const time = isoLocal.slice(11, 16)
  const [hh, mm] = time.split(':')
  return `${date}-${hh}-${mm}`
}

const inputStartToIso = (input: string): string | null => {
  const parts = input.split('-')
  if (parts.length !== 5) return null
  const [y, mo, d, h, mi] = parts
  if (
    !/^\d{4}$/.test(y) ||
    !/^\d{2}$/.test(mo) ||
    !/^\d{2}$/.test(d) ||
    !/^\d{2}$/.test(h) ||
    !/^\d{2}$/.test(mi)
  )
    return null
  return `${y}-${mo}-${d}T${h}:${mi}`
}

const normalizeOffsetToHHMM = (raw: string | null | undefined): string => {
  if (!raw) return ''
  const s = String(raw)
  const m = s.match(/^(\d{1,3}):(\d{2})$/)
  if (m) {
    const hh = String(Math.max(0, Number(m[1]) || 0)).padStart(2, '0')
    const mm = String(Math.min(59, Math.max(0, Number(m[2]) || 0))).padStart(2, '0')
    return `${hh}:${mm}`
  }
  let hours = 0
  let minutes = 0
  const hr = s.match(/(\d+)\s*hour/)
  const mn = s.match(/(\d+)\s*minute/)
  if (hr) hours = Number(hr[1]) || 0
  if (mn) minutes = Number(mn[1]) || 0
  const totalMinutes = hours * 60 + minutes
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const mm = String(totalMinutes % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

const isValidHHMM = (v: string) => /^\d{2}:\d{2}$/.test(v)

const PlaceBoard = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const roomId = useMemo(() => getRoomId(tripId), [tripId])

  // Schedules/Trip info (merged from SchedulePanel)
  const { schedulesByDate, tripInfo, doc, awareness, updateScheduleTime } = useYTripDoc(roomId)
  let titleYText: Y.Text | null = null
  if (doc) {
    const t = (doc.getMap('tripInfo') as Y.Map<unknown>).get('title')
    if (t instanceof Y.Text) titleYText = t
  }

  const boardRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const autoHideTimerRef = useRef<number | null>(null)

  const [selfCursor, setSelfCursor] = useState<{ x: number; y: number } | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatValue, setChatValue] = useState('')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editStart, setEditStart] = useState('')
  const [editOffset, setEditOffset] = useState('')

  const {
    remoteCursors,
    publishCursor,
    clearCursor,
    self,
    sendMessage,
    selfMessage,
    chatMessages,
  } = useSharedCursors(roomId)

  // 친구 초대 모달
  const [isFriendModalOpen, setIsFriendModalOpen] = useState(false)
  const [friendsCache, setFriendsCache] = useState<Record<string, boolean>>({})

  const openFriendModal = () => {
    setIsFriendModalOpen(true)
    // tripId별로 처음 열었는지 확인
    if (tripId && !friendsCache[tripId]) {
      // 처음 열었다면 캐시에 기록
      setFriendsCache((prev) => ({ ...prev, [tripId]: true }))
      console.log(`${tripId}에서 친구 목록 API 호출 (최초)`)
      // 여기서 API 호출이 FriendInviteModal에서 이루어집니다
    } else {
      console.log(`${tripId}의 캐시된 친구 목록 사용`)
    }
  }

  const closeFriendModal = () => {
    setIsFriendModalOpen(false)
  }

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

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    if (target) {
      const isInteractive = !!target.closest(
        '[contenteditable="true"], input, textarea, select, button, a, [role="button"]'
      )
      if (isInteractive) {
        return
      }
    }
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

  const hasSchedules = useMemo(() => Object.keys(schedulesByDate).length > 0, [schedulesByDate])

  return (
    <section className="relative flex flex-1 min-h-0 flex-col overflow-hidden border-x border-slate-200 bg-slate-50">
      <div
        ref={boardRef}
        className="relative flex min-h-0 flex-1 cursor-crosshair flex-col outline-none"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onKeyDown={handleBoardKeyDown}
        tabIndex={0}
      >
        <div className="absolute left-4 top-4 z-10">
          <SolidButton onClick={openFriendModal} className="px-3 py-1.5 text-sm">
            친구 초대하기
          </SolidButton>
        </div>
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

        <div
          className={cn(
            'flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-slate-500',
            hasSchedules && 'hidden'
          )}
        >
          <div className="flex flex-col gap-1">
            <span className="text-base font-semibold text-slate-700">
              여행 일정 보드에 팀원과 함께 참여하세요.{' '}
            </span>
            <span>마우스를 움직이면 서로의 커서를, 메시지를 보내면 실시간으로 공유돼요.</span>
          </div>
        </div>

        {hasSchedules ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
            <header className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800">여행 일정</h2>
              <div className="min-w-0 flex-1">
                {titleYText ? (
                  <YTextEditor ytext={titleYText} />
                ) : (
                  <span className="text-xs text-slate-400">Trip #{tripInfo.id ?? ''}</span>
                )}
              </div>
            </header>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-lg border border-slate-200 p-3 bg-white/80">
              {Object.entries(schedulesByDate)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, items]) => (
                  <div key={date} className="rounded-md border border-slate-100 bg-white p-2">
                    <div className="mb-1 text-xs font-semibold text-slate-600">{date}</div>
                    {items.length === 0 ? (
                      <div className="text-xs text-slate-400">항목 없음</div>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {items
                          .map((it, originalIndex) => ({ it, originalIndex }))
                          .sort((a, b) => a.it.start_time.localeCompare(b.it.start_time))
                          .map(({ it, originalIndex }) => {
                            return (
                              <li
                                key={`${date}-${it.id ?? 'n'}-${originalIndex}`}
                                className="rounded border border-slate-100 bg-white p-2"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-slate-800">
                                    {it.location?.name || '일정'}
                                  </span>
                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span>{toTime(it.start_time)}</span>
                                    {it.offset_time ? (
                                      <span className="text-[11px] text-slate-400">
                                        (+{normalizeOffsetToHHMM(it.offset_time)})
                                      </span>
                                    ) : null}
                                    <button
                                      type="button"
                                      className="hidden ml-2 rounded border border-slate-200 px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-50"
                                      onClick={() => {
                                        const key = `${date}:${originalIndex}`
                                        setEditingKey(key)
                                        setEditStart(isoToInputStart(it.start_time))
                                        setEditOffset(normalizeOffsetToHHMM(it.offset_time))
                                      }}
                                    >
                                      시간 수정
                                    </button>
                                  </div>
                                </div>
                                <div className="mt-1">
                                  {doc ? (
                                    <ScheduleMemoEditor
                                      doc={doc}
                                      awareness={awareness}
                                      dateKey={date}
                                      index={originalIndex}
                                      fieldKey={`memo-${it.uid || `${date}-${originalIndex}`}`}
                                      initialText={it.memo}
                                    />
                                  ) : null}
                                </div>
                                {it.location?.detail ? (
                                  <div className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">
                                    {it.location.detail}
                                  </div>
                                ) : null}
                                <div className="mt-2 flex w-full gap-3">
                                  <div className="w-1/2 min-w-0">
                                    <div className="text-[12px] mb-1 text-text-600">시간</div>
                                    <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
                                      <input
                                        type="datetime-local"
                                        defaultValue={it.start_time}
                                        onBlur={(e) => {
                                          const iso = e.currentTarget.value
                                          if (!iso) return
                                          updateScheduleTime(date, originalIndex, {
                                            startTimeLocal: iso,
                                          })
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') e.currentTarget.blur()
                                        }}
                                        className="w-full bg-transparent text-text-500 text-xs focus:outline-none"
                                      />
                                    </div>
                                  </div>
                                  <div className="w-1/2 min-w-0">
                                    <div className="text-[12px] mb-1 text-text-600">
                                      예정소요시간
                                    </div>
                                    <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
                                      <input
                                        type="text"
                                        placeholder="HH:MM"
                                        defaultValue={normalizeOffsetToHHMM(it.offset_time)}
                                        onBlur={(e) => {
                                          const v = e.currentTarget.value.trim()
                                          if (v === '') {
                                            updateScheduleTime(date, originalIndex, {
                                              offsetHHMM: null,
                                            })
                                            return
                                          }
                                          const off = normalizeOffsetToHHMM(v)
                                          if (!isValidHHMM(off)) {
                                            alert('offset_time 형식은 HH:MM 입니다.')
                                            return
                                          }
                                          updateScheduleTime(date, originalIndex, {
                                            offsetHHMM: off,
                                          })
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') e.currentTarget.blur()
                                        }}
                                        className="w-full bg-transparent text-text-500 text-xs focus:outline-none"
                                      />
                                    </div>
                                  </div>
                                </div>
                                {editingKey === `${date}:${originalIndex}` ? (
                                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded border border-slate-100 bg-slate-50/60 p-2">
                                    <label className="text-[11px] text-slate-500">start_time</label>
                                    <input
                                      value={editStart}
                                      onChange={(e) => setEditStart(e.target.value)}
                                      placeholder="YYYY-MM-DD-HH-MM"
                                      className="w-44 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-blue-400 focus:outline-none"
                                    />
                                    <label className="text-[11px] text-slate-500">
                                      offset_time
                                    </label>
                                    <input
                                      value={editOffset}
                                      onChange={(e) => setEditOffset(e.target.value)}
                                      placeholder="HH:MM"
                                      className="w-24 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-blue-400 focus:outline-none"
                                    />
                                    <div className="ml-auto flex items-center gap-2">
                                      <button
                                        type="button"
                                        className="rounded bg-blue-500 px-3 py-1 text-[11px] font-semibold text-white hover:bg-blue-600"
                                        onClick={() => {
                                          const iso = inputStartToIso(editStart)
                                          const off = editOffset
                                            ? normalizeOffsetToHHMM(editOffset)
                                            : ''
                                          if (!iso) {
                                            alert('start_time 형식은 YYYY-MM-DD-HH-MM 입니다.')
                                            return
                                          }
                                          if (editOffset && !isValidHHMM(off)) {
                                            alert('offset_time 형식은 HH:MM 입니다.')
                                            return
                                          }
                                          updateScheduleTime(date, originalIndex, {
                                            startTimeLocal: iso,
                                            offsetHHMM: editOffset ? off : null,
                                          })
                                          setEditingKey(null)
                                        }}
                                      >
                                        저장
                                      </button>
                                      <button
                                        type="button"
                                        className="rounded border border-slate-200 px-3 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                                        onClick={() => setEditingKey(null)}
                                      >
                                        취소
                                      </button>
                                    </div>
                                  </div>
                                ) : null}
                              </li>
                            )
                          })}
                      </ul>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ) : null}

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

      {/* 친구 초대 모달 */}
      <FriendInviteModal
        isOpen={isFriendModalOpen}
        onClose={closeFriendModal}
        tripId={tripId || ''}
      />
    </section>
  )
}

export default PlaceBoard
