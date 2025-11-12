import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  PointerEvent as ReactPointerEvent,
  KeyboardEvent as ReactKeyboardEvent,
  FormEvent as ReactFormEvent,
} from 'react'
import { useParams } from 'react-router-dom'
import { cn } from '@/shared/utils/cn'
import type { SharedCursorSession } from '../hooks/useSharedCursors'
import { useYTripDoc } from '../hooks/useYTripDoc'
import * as Y from 'yjs'
import ScheduleMemoEditor from './ScheduleMemoEditor'
import FriendInviteModal from './FriendInviteModal'
import { ToastDock } from '@/components/blocks/ToastDock'
import CloseButton from '@/components/atoms/CloseButton'
import SolidButton from '@/components/atoms/SolidButton'

const CHAT_AUTO_HIDE_MS = 5000
const getRoomId = (tripId: string | undefined) =>
  tripId && tripId.trim().length > 0 ? `trip-${tripId.trim()}` : 'trip-default'

const toTime = (isoLocal: string) =>
  isoLocal?.length >= 16 ? isoLocal.slice(11, 16) : isoLocal || ''

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

const MAX_TITLE_LENGTH = 100

const getInitial = (value: string | undefined) => {
  if (!value) return '?'
  const trimmed = value.trim()
  if (!trimmed) return '?'
  return trimmed.charAt(0).toUpperCase()
}

const syncYTextContent = (target: Y.Text, nextValue: string) => {
  const current = target.toString()
  if (current === nextValue) {
    return
  }

  let prefix = 0
  const minLen = Math.min(current.length, nextValue.length)
  while (prefix < minLen && current[prefix] === nextValue[prefix]) {
    prefix += 1
  }

  let suffix = 0
  while (
    suffix < minLen - prefix &&
    current[current.length - 1 - suffix] === nextValue[nextValue.length - 1 - suffix]
  ) {
    suffix += 1
  }

  const deleteFrom = prefix
  const deleteLength = current.length - prefix - suffix
  const insertText = nextValue.slice(prefix, nextValue.length - suffix)

  target.doc?.transact(() => {
    if (deleteLength > 0) {
      target.delete(deleteFrom, deleteLength)
    }
    if (insertText.length > 0) {
      target.insert(deleteFrom, insertText)
    }
  }, 'title-input')
}

interface PlaceBoardProps {
  cursorSession: SharedCursorSession
}

const PlaceBoard = ({ cursorSession }: PlaceBoardProps) => {
  const { tripId } = useParams<{ tripId: string }>()
  const roomId = useMemo(() => getRoomId(tripId), [tripId])

  // Schedules/Trip info
  const {
    schedulesByDate,
    tripInfo,
    doc,
    awareness,
    updateScheduleTime,
    reorderSchedule,
    removeSchedule,
  } = useYTripDoc(roomId)

  const { self, sendMessage, selfMessage, participants } = cursorSession
  const metaStorageKey = tripId ? `plan-meta-${tripId}` : null

  const boardRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const autoHideTimerRef = useRef<number | null>(null)
  const dragItemRef = useRef<{ dateKey: string; index: number } | null>(null)
  const titlePersistTimerRef = useRef<number | null>(null)
  const lastSyncedTitleRef = useRef<string>('')
  const hasRestoredCacheRef = useRef(false)

  /**
   * 1) 제목 필드 보장: doc이 준비되면 tripInfo.title이 Y.Text로 존재하도록 보장
   *    - 없으면 새 Y.Text를 생성해 넣습니다. (데이터 없을 때 예외 처리 포함)
   *    - sessionStorage의 캐시된 값도 고려
   */
  useEffect(() => {
    if (!doc) return
    const tripMap = doc.getMap('tripInfo') as Y.Map<unknown>
    const existing = tripMap.get('title')
    if (!(existing instanceof Y.Text)) {
      doc.transact(() => {
        const ytext = new Y.Text()

        // 우선순위: 1) 기존 문자열 2) tripInfo.title 3) sessionStorage 캐시
        if (typeof existing === 'string' && existing.trim().length > 0) {
          ytext.insert(0, existing)
        } else if (tripInfo?.title && tripInfo.title.trim().length > 0) {
          ytext.insert(0, tripInfo.title)
        } else if (metaStorageKey && typeof window !== 'undefined') {
          // sessionStorage에서 캐시된 제목 가져오기
          try {
            const cached = window.sessionStorage.getItem(metaStorageKey)
            if (cached) {
              const parsed = JSON.parse(cached)
              if (parsed.travelTitle && parsed.travelTitle.trim().length > 0) {
                ytext.insert(0, parsed.travelTitle)
              }
            }
          } catch {
            // ignore
          }
        }

        tripMap.set('title', ytext)
      })
    }
  }, [doc, tripInfo?.title, metaStorageKey])

  /**
   * 2) 매 렌더마다 최신 Y.Text 핸들 가져오기 (다른 클라이언트가 문자열->Y.Text로 전환해도 즉시 반영)
   */
  const titleYText = (() => {
    if (!doc) return null
    const tripMap = doc.getMap('tripInfo') as Y.Map<unknown>
    const value = tripMap.get('title')
    return value instanceof Y.Text ? value : null
  })()

  // sessionStorage에서 캐시된 여행 제목 가져오기 (깜빡임 방지)
  const [titleDraft, setTitleDraft] = useState(() => {
    if (!metaStorageKey || typeof window === 'undefined') return ''
    try {
      const cached = window.sessionStorage.getItem(metaStorageKey)
      if (cached) {
        const parsed = JSON.parse(cached)
        return parsed.travelTitle || ''
      }
    } catch {
      // ignore
    }
    return ''
  })

  const [selfCursor, setSelfCursor] = useState<{ x: number; y: number } | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isRosterOpen, setIsRosterOpen] = useState(false)
  const [chatValue, setChatValue] = useState('')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editStart, setEditStart] = useState('')
  const [editOffset, setEditOffset] = useState('')

  const updatePersistedMeta = useCallback(
    (nextTitle: string) => {
      if (!metaStorageKey || typeof window === 'undefined') return
      try {
        const existingRaw = window.sessionStorage.getItem(metaStorageKey)
        const parsed = existingRaw ? JSON.parse(existingRaw) : {}
        window.sessionStorage.setItem(
          metaStorageKey,
          JSON.stringify({
            ...parsed,
            travelTitle: nextTitle,
          })
        )
      } catch {
        // ignore storage issues
      }
    },
    [metaStorageKey]
  )

  const rosterEntries = useMemo(() => {
    if (!participants || participants.length === 0) {
      return [
        {
          clientId: Number.MAX_SAFE_INTEGER,
          userId: self.id,
          name: self.name,
          color: self.color,
          picture: self.picture ?? null,
          lastActive: Date.now(),
          hasCursor: Boolean(selfCursor),
          hasMessage: Boolean(selfMessage),
          isSelf: true,
        },
      ]
    }
    return [...participants].sort((a, b) => {
      if (a.isSelf && !b.isSelf) return -1
      if (!a.isSelf && b.isSelf) return 1
      return a.name.localeCompare(b.name)
    })
  }, [participants, self.color, self.id, self.name, self.picture, selfCursor, selfMessage])

  const participantCount = rosterEntries.length

  useEffect(() => {
    if (!titleYText) {
      // titleYText가 없을 때는 titleDraft를 덮어쓰지 않음 (sessionStorage 캐시 유지)
      return
    }
    const syncState = () => {
      const ytextValue = titleYText.toString()
      // 초기 마운트 시에만: Y.Text가 비어있고 titleDraft에 캐시 값이 있으면 복원
      if (
        !hasRestoredCacheRef.current &&
        ytextValue.trim().length === 0 &&
        titleDraft.trim().length > 0
      ) {
        titleYText.doc?.transact(() => {
          titleYText.insert(0, titleDraft)
        }, 'restore-cached-title')
        hasRestoredCacheRef.current = true
        return
      }
      setTitleDraft(ytextValue)
    }
    syncState()
    const observer = () => {
      setTitleDraft(titleYText.toString())
    }
    titleYText.observe(observer)
    return () => {
      titleYText.unobserve(observer)
    }
  }, [titleYText])

  const handleTitleChange = useCallback(
    (value: string) => {
      const nextValue = value.slice(0, MAX_TITLE_LENGTH)
      setTitleDraft(nextValue)
      if (!titleYText) return
      syncYTextContent(titleYText, nextValue)
    },
    [titleYText]
  )

  useEffect(() => {
    if (!titleYText) return

    const persistTitle = () => {
      const nextTitle = titleYText.toString()
      if (nextTitle === lastSyncedTitleRef.current) return

      lastSyncedTitleRef.current = nextTitle
      updatePersistedMeta(nextTitle)

      if (titlePersistTimerRef.current !== null) {
        window.clearTimeout(titlePersistTimerRef.current)
      }
    }

    persistTitle()
    titleYText.observe(persistTitle)

    return () => {
      titleYText.unobserve(persistTitle)
      if (titlePersistTimerRef.current !== null) {
        window.clearTimeout(titlePersistTimerRef.current)
        titlePersistTimerRef.current = null
      }
    }
  }, [titleYText, tripId, updatePersistedMeta])

  // 친구 초대 모달 & 토스트
  const [isFriendModalOpen, setIsFriendModalOpen] = useState(false)
  const [friendsCache, setFriendsCache] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<{
    variant: 'warning' | 'error' | 'hint' | 'success'
    title?: string
    message: string
  } | null>(null)

  const openFriendModal = () => {
    setIsFriendModalOpen(true)
    if (tripId && !friendsCache[tripId]) {
      setFriendsCache((prev) => ({ ...prev, [tripId]: true }))
    }
  }
  const closeFriendModal = () => setIsFriendModalOpen(false)

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
        if (!open) return open
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

  const handleDragStart = useCallback((dateKey: string, index: number) => {
    dragItemRef.current = { dateKey, index }
  }, [])
  const handleDragEnd = useCallback(() => {
    dragItemRef.current = null
  }, [])
  const handleDropWithinDate = useCallback(
    (dateKey: string, targetIndex: number) => {
      if (!dragItemRef.current) return
      const { dateKey: sourceDate, index: sourceIndex } = dragItemRef.current
      dragItemRef.current = null
      if (sourceDate !== dateKey) {
        setToast({
          variant: 'hint',
          title: '알림',
          message: '현재는 같은 날짜 안에서만 순서를 조정할 수 있어요.',
        })
        return
      }
      reorderSchedule(dateKey, sourceIndex, targetIndex)
    },
    [reorderSchedule]
  )
  const handleDropToEnd = useCallback(
    (dateKey: string) => {
      if (!dragItemRef.current) return
      const { dateKey: sourceDate, index: sourceIndex } = dragItemRef.current
      dragItemRef.current = null
      if (sourceDate !== dateKey) {
        setToast({
          variant: 'hint',
          title: '알림',
          message: '현재는 같은 날짜 안에서만 순서를 조정할 수 있어요.',
        })
        return
      }
      const nextIndex = schedulesByDate[dateKey]?.length ?? 0
      reorderSchedule(dateKey, sourceIndex, nextIndex)
    },
    [reorderSchedule, schedulesByDate]
  )

  const handleRemoveSchedule = useCallback(
    (dateKey: string, keyOrId: string | number) => {
      // editingKey 체크는 uid로 변경해야 하지만, 기존 코드와 호환성을 위해 제거
      setEditingKey(null)
      removeSchedule(dateKey, keyOrId)
    },
    [removeSchedule]
  )

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const board = boardRef.current
    if (!board) return
    const rect = board.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    setSelfCursor({ x, y })
  }, [])

  const handlePointerLeave = useCallback(() => {
    if (!isChatOpen && !selfMessage?.text) setSelfCursor(null)
  }, [isChatOpen, selfMessage])

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    if (target) {
      const isInteractive = !!target.closest(
        '[contenteditable="true"], input, textarea, select, button, a, [role="button"]'
      )
      if (isInteractive) return
    }
    boardRef.current?.focus()
  }, [])

  const openChatInput = useCallback(() => {
    if (!selfCursor) setSelfCursor({ x: 50, y: 50 })
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
      const limited = value.slice(0, 200)
      setChatValue(limited)
      if (isChatOpen) resetAutoHideTimer()
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
    if (isChatOpen) resetAutoHideTimer()
    else clearAutoHideTimer()
  }, [clearAutoHideTimer, isChatOpen, resetAutoHideTimer])

  useEffect(
    () => () => {
      clearAutoHideTimer()
    },
    [clearAutoHideTimer]
  )

  const hasSchedules = useMemo(() => Object.keys(schedulesByDate).length > 0, [schedulesByDate])

  return (
    <section className="relative flex flex-1 min-h-0 flex-col overflow-hidden border-x border-slate-200 bg-white">
      <ToastDock
        open={Boolean(toast)}
        variant={toast?.variant ?? 'hint'}
        title={toast?.title}
        message={toast?.message ?? ''}
        autoCloseMs={3000}
        offsetPx={16}
        onClose={() => setToast(null)}
      />
      <div
        ref={boardRef}
        className="relative flex min-h-0 flex-1 flex-col outline-none"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onKeyDown={handleBoardKeyDown}
        tabIndex={0}
      >
        {/* 친구 초대 버튼 (오른쪽 하단) */}
        <SolidButton
          type="button"
          onClick={openFriendModal}
          className="pointer-events-auto absolute bottom-8 right-8 z-10 group rounded-full"
        >
          친구 초대하기
        </SolidButton>

        {/* 빈 상태 안내 */}
        <div
          className={cn(
            'flex h-full flex-col items-center justify-center gap-4 text-center',
            hasSchedules && 'hidden'
          )}
        >
          <div className="flex flex-col gap-3">
            <span className="text-2xl font-bold text-slate-800">
              여행 일정 보드에 팀원과 함께 참여하세요
            </span>
            <span className="text-lg text-slate-600">
              마우스를 움직이면 서로의 커서를, 메시지를 보내면 실시간으로 공유돼요
            </span>
          </div>
        </div>

        {hasSchedules ? (
          <div className="flex min-h-0 flex-1 flex-col gap-5 p-6 pt-16 md:pt-8">
            <header className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4 md:pr-56 lg:pr-[360px]">
              <h2 className="text-4xl font-extrabold text-slate-900 flex-shrink-0">여행 일정</h2>

              {/* === 여행 제목 편집 영역 ===
                  - doc이 준비되어 Y.Text가 있으면 YTextEditor로 실시간 편집
                  - doc이 아직 없으면 읽기 전용 안전 뷰
              */}
              <div className="min-w-0 flex-1 max-w-full md:max-w-[32rem]">
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  maxLength={MAX_TITLE_LENGTH}
                  placeholder="여행 제목을 입력해주세요"
                  disabled={!titleYText}
                  className="w-full rounded-full border-2 border-slate-300 bg-white px-5 py-2.5 text-lg font-semibold text-slate-900 shadow-sm transition-all placeholder:text-slate-400 hover:border-blue-300 hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-wait disabled:opacity-70"
                />
              </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-xl border-2 border-slate-200 p-4 bg-white/80">
              {Object.entries(schedulesByDate)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, items]) => (
                  <div
                    key={date}
                    className="rounded-xl border-2 border-slate-100 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-3 text-base font-bold text-slate-700">{date}</div>

                    {items.length === 0 ? (
                      <div className="text-sm text-slate-400">항목 없음</div>
                    ) : (
                      <ul
                        className="space-y-3"
                        onDragOver={(event) => {
                          if (!dragItemRef.current) return
                          event.preventDefault()
                        }}
                        onDrop={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          handleDropToEnd(date)
                        }}
                      >
                        {items
                          .map((it, originalIndex) => ({ it, originalIndex }))
                          .sort((a, b) => a.it.start_time.localeCompare(b.it.start_time))
                          .map(({ it, originalIndex }) => {
                            const listKey = `${date}-${it.id ?? 'n'}-${originalIndex}`
                            const isEditing = editingKey === `${date}:${originalIndex}`
                            return (
                              <li
                                key={listKey}
                                className="rounded-xl border-2 border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                                draggable={!isEditing}
                                onDragStart={() => handleDragStart(date, originalIndex)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(event) => {
                                  if (!dragItemRef.current) return
                                  event.preventDefault()
                                }}
                                onDrop={(event) => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  handleDropWithinDate(date, originalIndex)
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-lg font-bold text-slate-800">
                                    {it.location?.name || '일정'}
                                  </span>
                                  <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <span className="font-semibold">{toTime(it.start_time)}</span>
                                    {it.offset_time ? (
                                      <span className="text-xs text-slate-500 font-medium">
                                        (+{normalizeOffsetToHHMM(it.offset_time)})
                                      </span>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="mt-2 flex flex-wrap items-end justify-end gap-2 text-[11px] text-slate-500">
                                  <button
                                    type="button"
                                    className="rounded-full border border-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-500 transition hover:border-red-300 hover:bg-red-50"
                                    onClick={() => handleRemoveSchedule(date, it.id ?? it.uid!)}
                                  >
                                    삭제
                                  </button>
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
                                            setToast({
                                              variant: 'warning',
                                              title: '입력 형식 확인',
                                              message: 'offset_time 형식은 HH:MM 입니다.',
                                            })
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
                                            setToast({
                                              variant: 'warning',
                                              title: '입력 형식 확인',
                                              message: 'start_time 형식은 YYYY-MM-DD-HH-MM 입니다.',
                                            })
                                            return
                                          }
                                          if (editOffset && !isValidHHMM(off)) {
                                            setToast({
                                              variant: 'warning',
                                              title: '입력 형식 확인',
                                              message: 'offset_time 형식은 HH:MM 입니다.',
                                            })
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

        {/* 오른쪽 상단: Chat 버튼 & 내 정보 배지 */}
        <div className="pointer-events-none absolute right-6 top-6 z-20 flex flex-row-reverse flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={openChatInput}
            className="group pointer-events-auto flex items-center gap-3 rounded-full border-2 border-blue-200 bg-white/95 px-5 py-2.5 text-base font-bold text-slate-700 shadow-xl backdrop-blur transition hover:border-blue-400 hover:text-blue-600 hover:shadow-2xl"
          >
            <span className="text-sm uppercase tracking-wide text-slate-500">Chat</span>
            <span className="rounded-lg bg-slate-900/90 px-3 py-1 text-sm font-bold text-white shadow-md">
              /
            </span>
            <span className="text-sm text-slate-500 group-hover:text-blue-600">눌러서 열기</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRosterOpen((open) => !open)}
            aria-expanded={isRosterOpen}
            aria-controls="plan-participant-panel"
            className={cn(
              'pointer-events-auto flex items-center gap-2 rounded-full border-2 border-blue-200 bg-white/95 px-5 py-2.5 text-base font-semibold text-slate-700 shadow-xl backdrop-blur transition',
              'hover:border-blue-400 hover:text-blue-600 hover:shadow-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300'
            )}
          >
            <span
              className="inline-flex h-3.5 w-3.5 rounded-full"
              style={{ backgroundColor: self.color }}
            />
            <span className="font-bold">{self.name}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
              {participantCount}명
            </span>
          </button>
        </div>

        {/* 참여자 패널 */}
        <div
          id="plan-participant-panel"
          className={cn(
            'absolute right-8 top-20 z-30 w-80 max-w-[90vw] rounded-2xl border-2 border-white/70 bg-white/95 shadow-2xl backdrop-blur transition-all duration-300',
            isRosterOpen
              ? 'pointer-events-auto translate-y-0 opacity-100'
              : 'pointer-events-none -translate-y-2 opacity-0'
          )}
        >
          <div className="flex items-center justify-between border-b-2 border-slate-100 px-6 py-4">
            <div className="text-lg font-bold text-slate-800">참여 중 · {participantCount}명</div>
            <CloseButton onClick={() => setIsRosterOpen(false)} className="text-xl" />
          </div>
          {participantCount > 0 ? (
            <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
              {rosterEntries.map((participant) => (
                <li
                  key={`${participant.clientId}-${participant.userId}`}
                  className="flex items-center gap-3 px-6 py-3"
                >
                  {participant.picture ? (
                    <img
                      src={participant.picture}
                      alt={participant.name}
                      className="h-10 w-10 rounded-full border border-white/60 object-cover shadow-sm"
                    />
                  ) : (
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold"
                      style={{ borderColor: participant.color, color: participant.color }}
                    >
                      {getInitial(participant.name)}
                    </span>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      {participant.name}
                      {participant.isSelf ? (
                        <span className="rounded-full bg-blue-50 px-2 text-[11px] font-semibold text-blue-600">
                          나
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span
                        className="inline-flex h-2 w-2 rounded-full"
                        style={{ backgroundColor: participant.color }}
                      />
                      <span>{participant.hasCursor ? '활동 중' : '대기 중'}</span>
                      {participant.hasMessage ? (
                        <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-600">
                          채팅중
                        </span>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-6 py-6 text-sm text-slate-500">아직 참여자가 없습니다.</div>
          )}
        </div>

        {/* Chat 패널 */}
        <div
          className={cn(
            'absolute right-8 top-20 z-40 w-96 max-w-[90vw] rounded-2xl border-2 border-white/70 bg-white/95 shadow-2xl backdrop-blur transition-all duration-300',
            isChatOpen
              ? 'pointer-events-auto translate-y-0 opacity-100'
              : 'pointer-events-none -translate-y-2 opacity-0'
          )}
        >
          <div className="flex items-center justify-between border-b-2 border-slate-100 px-6 py-4">
            <div className="text-lg font-bold text-slate-800">커서 메시지 보내기</div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>ESC로 닫기</span>
              <CloseButton onClick={() => setIsChatOpen(false)} className="text-xl" />
            </div>
          </div>
          <div className="px-6 py-3 text-sm text-slate-600">
            입력한 내용은 내 커서 풍선으로만 표시됩니다.
          </div>
          <div className="border-t-2 border-slate-100 px-6 py-4">
            <form className="flex items-center gap-3" onSubmit={handleChatSubmit}>
              <input
                ref={inputRef}
                value={chatValue}
                onChange={(event) => handleChatInputChange(event.target.value)}
                onKeyDown={handleChatKeyDown}
                onFocus={resetAutoHideTimer}
                placeholder="메시지를 입력하고 Enter를 눌러보세요"
                maxLength={200}
                className="flex-1 rounded-full border-2 border-slate-200 bg-white px-5 py-3 text-base text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                autoComplete="off"
              />
              <button
                type="submit"
                className="rounded-full bg-blue-500 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-blue-600 hover:shadow-lg"
              >
                보내기
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
