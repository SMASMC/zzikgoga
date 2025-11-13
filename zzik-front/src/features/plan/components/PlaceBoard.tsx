import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useParams } from 'react-router-dom'
import { cn } from '@/shared/utils/cn'
import type { SharedCursorSession } from '../hooks/useSharedCursors'
import { useYTripDoc } from '../hooks/useYTripDoc'
import * as Y from 'yjs'
import FriendInviteModal from './FriendInviteModal'
import { ToastDock } from '@/components/blocks/ToastDock'
import SolidButton from '@/components/atoms/SolidButton'
import WeekCalendar from './WeekCalendar'
import { toLocalDateKey, addDays } from '../utils/time'
import { syncYTextContent, MAX_TITLE_LENGTH } from '../utils/ytext'
import { CHAT_AUTO_HIDE_MS, getRoomId } from '../utils/constants'
import { EmptyScheduleState, ScheduleList } from './place-board'
import { ChatPanel, ParticipantRoster } from './collaboration'
import { TripTitleEditor } from './travel-header'

/** ===================== 컴포넌트 ===================== */

interface PlaceBoardProps {
  cursorSession: SharedCursorSession
}

const PlaceBoard = ({ cursorSession }: PlaceBoardProps) => {
  const { tripId } = useParams<{ tripId: string }>()
  const roomId = useMemo(() => getRoomId(tripId), [tripId])

  // 선택한 날짜 상태(WeekCalendar 연동)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const selectedDateKey = useMemo(() => toLocalDateKey(selectedDate), [selectedDate])
  const handleDateSelect = useCallback((d: Date) => setSelectedDate(d), [])
  const handlePrevWeek = useCallback(() => setSelectedDate((p) => addDays(p, -7)), [])
  const handleNextWeek = useCallback(() => setSelectedDate((p) => addDays(p, +7)), [])

  // Yjs 훅
  const {
    schedulesByDate,
    tripInfo,
    doc,
    awareness,
    updateScheduleTime,
    reorderSchedule,
    removeSchedule,
  } = useYTripDoc(roomId)

  // 선택일 데이터만 뽑기
  const schedulesForSelected = useMemo(
    () => schedulesByDate[selectedDateKey] ?? [],
    [schedulesByDate, selectedDateKey]
  )

  const { self, sendMessage, selfMessage, participants } = cursorSession
  const metaStorageKey = tripId ? `plan-meta-${tripId}` : null

  const boardRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const autoHideTimerRef = useRef<number | null>(null)
  const dragItemRef = useRef<{ dateKey: string; index: number } | null>(null)
  const titlePersistTimerRef = useRef<number | null>(null)
  const lastSyncedTitleRef = useRef<string>('')

  // titleYText는 변경될 때만 다시 가져오기 (Y.Text 객체는 동일하므로 안전)
  const titleYText = (() => {
    if (!doc) return null
    const tripMap = doc.getMap('tripInfo') as Y.Map<unknown>
    const value = tripMap.get('title')
    return value instanceof Y.Text ? value : null
  })()

  // 여행 제목 초기 보장 (문자열 → Y.Text 전환)
  useEffect(() => {
    if (!doc) return
    const tripMap = doc.getMap('tripInfo') as Y.Map<unknown>
    const existing = tripMap.get('title')
    if (!(existing instanceof Y.Text)) {
      doc.transact(() => {
        const ytext = new Y.Text()
        if (typeof existing === 'string' && existing.trim().length > 0) {
          ytext.insert(0, existing)
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
  }, [doc, metaStorageKey])

  // 제목 드래프트 상태 + 동기화
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
  const hasRestoredCacheRef = useRef(false)

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
        // ignore
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

  // 여행 기간 범위로 선택 날짜 보정
  useEffect(() => {
    if (!tripInfo?.start_date || !tripInfo?.end_date) return
    const min = new Date(tripInfo.start_date)
    const max = new Date(tripInfo.end_date)
    const cur = new Date(selectedDate)
    const curT = cur.setHours(0, 0, 0, 0)
    const minT = min.setHours(0, 0, 0, 0)
    const maxT = max.setHours(0, 0, 0, 0)
    if (curT < minT || curT > maxT) {
      setSelectedDate(min)
    }
  }, [selectedDate, tripInfo?.start_date, tripInfo?.end_date])

  // 초기 진입 시 저장된 선택 날짜가 있으면 복원 (여행 범위 내인 경우만)
  useEffect(() => {
    if (!metaStorageKey || typeof window === 'undefined') return
    try {
      const raw = window.sessionStorage.getItem(metaStorageKey)
      if (!raw) return
      const parsed = JSON.parse(raw)
      const stored: string | undefined = parsed?.selectedDate
      if (!stored) return
      const d = new Date(stored)
      if (Number.isNaN(d.getTime())) return
      // 범위 체크
      if (tripInfo?.start_date && tripInfo?.end_date) {
        if (tripInfo.start_date <= stored && stored <= tripInfo.end_date) {
          setSelectedDate(d)
        }
      } else {
        setSelectedDate(d)
      }
    } catch {
      // ignore
    }
    // run once on mount or when trip range changes
  }, [metaStorageKey, tripInfo?.start_date, tripInfo?.end_date])

  // 선택 날짜 변경 시 저장 및 브로드캐스트
  useEffect(() => {
    if (!metaStorageKey || typeof window === 'undefined') return
    try {
      const raw = window.sessionStorage.getItem(metaStorageKey)
      const parsed = raw ? JSON.parse(raw) : {}
      window.sessionStorage.setItem(
        metaStorageKey,
        JSON.stringify({ ...parsed, selectedDate: selectedDateKey })
      )
    } catch {
      // ignore
    }
    // CustomEvent로 다른 패널에 알림
    try {
      const ev = new CustomEvent('zzik-plan-selected-date', {
        detail: { tripId: tripId ?? null, dateKey: selectedDateKey },
      })
      window.dispatchEvent(ev)
    } catch {
      // ignore
    }
  }, [metaStorageKey, selectedDateKey, tripId])

  // 제목 드래프트 ↔ Y.Text 동기화
  useEffect(() => {
    if (!titleYText) return
    const syncState = () => {
      const ytextValue = titleYText.toString()
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
    const observer = () => setTitleDraft(titleYText.toString())
    titleYText.observe(observer)
    return () => titleYText.unobserve(observer)
  }, [titleYText])

  const handleTitleChange = useCallback(
    (value: string) => {
      const nextValue = value.slice(0, MAX_TITLE_LENGTH)
      setTitleDraft(nextValue)
      // Y.Text가 준비된 후에만 CRDT 반영
      if (titleYText) {
        syncYTextContent(titleYText, nextValue)
      }
    },
    [titleYText]
  )

  // 제목 로컬 캐시 반영
  useEffect(() => {
    if (!titleYText) return
    const persistTitle = () => {
      const nextTitle = titleYText.toString()
      if (nextTitle === lastSyncedTitleRef.current) return
      lastSyncedTitleRef.current = nextTitle
      updatePersistedMeta(nextTitle)
      if (titlePersistTimerRef.current !== null) window.clearTimeout(titlePersistTimerRef.current)
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

  // 친구 초대/토스트
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

  // 채팅 자동 닫힘 타이머
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

  // 드래그 앤 드롭(동일 날짜 내 순서 변경)
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

  // 삭제 핸들러(일정/예산)
  const handleRemoveSchedule = useCallback(
    (dateKey: string, realIndex: number) => {
      setEditingKey(null)
      removeSchedule(dateKey, realIndex)
    },
    [removeSchedule]
  )

  // 커서/보드 포커스
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

  // 채팅 열고/닫기
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

  // 키보드 핫키
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
    (message: string) => {
      sendMessage(message)
      setChatValue('')
      resetAutoHideTimer()
    },
    [resetAutoHideTimer, sendMessage]
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

  // 포커스/타이머 클린업
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

  const hasAnySchedules = useMemo(() => Object.keys(schedulesByDate).length > 0, [schedulesByDate])

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
        {/* 친구 초대 버튼 */}
        <SolidButton
          type="button"
          onClick={openFriendModal}
          className="pointer-events-auto absolute bottom-8 right-8 z-10 group rounded-full"
        >
          친구 초대하기
        </SolidButton>

        {/* 빈 상태 안내 */}
        {!hasAnySchedules && <EmptyScheduleState />}

        {hasAnySchedules ? (
          <div className="flex min-h-0 flex-1 flex-col gap-5 p-6 pt-16 md:pt-8">
            {/* 헤더 / 제목 */}
            <header className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4 md:pr-56 lg:pr-[360px]">
              <h2 className="text-4xl font-extrabold text-slate-900 flex-shrink-0">여행 일정</h2>
              <TripTitleEditor
                titleYText={titleYText}
                titleDraft={titleDraft}
                onTitleChange={handleTitleChange}
              />
            </header>

            <WeekCalendar
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              onPrevWeek={handlePrevWeek}
              onNextWeek={handleNextWeek}
              minDate={tripInfo?.start_date ? new Date(tripInfo.start_date) : undefined}
              maxDate={tripInfo?.end_date ? new Date(tripInfo.end_date) : undefined}
            />

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-xl border-2 border-slate-200 p-4 bg-white/80">
              {/* 일정 */}
              <ScheduleList
                schedules={schedulesForSelected}
                selectedDateKey={selectedDateKey}
                doc={doc}
                awareness={awareness}
                dragItemRef={dragItemRef}
                editingKey={editingKey}
                editStart={editStart}
                editOffset={editOffset}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDropWithinDate={handleDropWithinDate}
                onDropToEnd={handleDropToEnd}
                onRemoveSchedule={handleRemoveSchedule}
                onUpdateScheduleTime={updateScheduleTime}
                onSetEditingKey={setEditingKey}
                onSetEditStart={setEditStart}
                onSetEditOffset={setEditOffset}
                onToast={setToast}
              />
            </div>
          </div>
        ) : null}

        {/* 오른쪽 상단 UI */}
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
        <ParticipantRoster
          isOpen={isRosterOpen}
          onClose={() => setIsRosterOpen(false)}
          participants={rosterEntries}
          participantCount={participantCount}
        />

        {/* Chat 패널 */}
        <ChatPanel
          isOpen={isChatOpen}
          chatValue={chatValue}
          onClose={() => setIsChatOpen(false)}
          onSubmit={handleChatSubmit}
          onValueChange={handleChatInputChange}
          inputRef={inputRef}
          onKeyDown={handleChatKeyDown}
          onFocus={resetAutoHideTimer}
        />
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
