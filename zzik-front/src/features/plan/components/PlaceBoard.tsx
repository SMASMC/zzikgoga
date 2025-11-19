// src/features/plan/components/PlaceBoard.tsx
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
import { CHAT_AUTO_HIDE_MS, getRoomId } from '../utils/constants'
import { ScheduleList } from './place-board'
import { ChatPanel, ParticipantRoster } from './collaboration'
import YTextEditor from './YTextEditor'
import { MAX_TITLE_LENGTH } from '../utils/ytext'
import { calculateTravelTime, addMinutesToTime } from '../services/naverMapService'

interface PlaceBoardProps {
  cursorSession: SharedCursorSession
  onOpenPlaceDrawer?: () => void
}

const PlaceBoard = ({ cursorSession, onOpenPlaceDrawer }: PlaceBoardProps) => {
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
    addSchedule,
    updateScheduleTime,
    removeSchedule,
    isSynced,
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

  // 제목 Y.Text - state로 관리하여 업데이트 가능하게
  const [titleYText, setTitleYText] = useState<Y.Text | null>(null)

  // doc 변경 및 tripInfo.title 변경 감지
  useEffect(() => {
    if (!doc) {
      setTitleYText(null)
      return
    }

    const tripMap = doc.getMap('tripInfo') as Y.Map<unknown>

    const updateTitle = () => {
      const value = tripMap.get('title')
      const result = value instanceof Y.Text ? value : null
      setTitleYText(result)
    }

    // 초기 설정
    updateTitle()

    // tripMap 변경 감지
    const observer = () => {
      updateTitle()
    }
    tripMap.observe(observer)

    return () => {
      tripMap.unobserve(observer)
    }
  }, [doc])

  // 여행 제목 및 날짜 초기 보장 (동기화 완료 후에만 실행)
  useEffect(() => {
    if (!doc || !isSynced) return // 동기화 완료될 때까지 대기

    const tripMap = doc.getMap('tripInfo') as Y.Map<unknown>
    const existing = tripMap.get('title')

    let needsUpdate = false
    const updates: Array<() => void> = []

    // Title 초기화
    if (!(existing instanceof Y.Text)) {
      needsUpdate = true
      updates.push(() => {
        const ytext = new Y.Text()
        if (typeof existing === 'string' && existing.trim().length > 0) {
          ytext.insert(0, existing)
        } else if (metaStorageKey && typeof window !== 'undefined') {
          try {
            const cached = window.sessionStorage.getItem(metaStorageKey)
            if (cached) {
              const parsed = JSON.parse(cached)
              if (parsed.travelTitle && parsed.travelTitle.trim().length > 0) {
                ytext.insert(0, parsed.travelTitle)
              }
            }
          } catch {
            console.error('Failed to load cached trip title')
          }
        }
        tripMap.set('title', ytext)
      })
    }

    // start_date, end_date 초기화 (존재 여부와 유효성 모두 체크)
    const startDateValue = tripMap.get('start_date') as string | undefined
    const endDateValue = tripMap.get('end_date') as string | undefined
    const idValue = tripMap.get('id') as number | undefined

    const hasValidStartDate = startDateValue && startDateValue.length > 0
    const hasValidEndDate = endDateValue && endDateValue.length > 0
    const hasValidId = idValue != null

    if (!hasValidStartDate || !hasValidEndDate || !hasValidId) {
      needsUpdate = true
      updates.push(() => {
        if (metaStorageKey && typeof window !== 'undefined') {
          try {
            const cached = window.sessionStorage.getItem(metaStorageKey)
            if (cached) {
              const parsed = JSON.parse(cached)

              if (!hasValidId && parsed.id) {
                tripMap.set('id', parsed.id)
              }
              if (!hasValidStartDate && parsed.startDate) {
                tripMap.set('start_date', parsed.startDate)
              }
              if (!hasValidEndDate && parsed.endDate) {
                tripMap.set('end_date', parsed.endDate)
              }
            }
          } catch (error) {
            console.error('Failed to load cached trip info:', error)
          }
        }
      })
    }

    if (needsUpdate) {
      doc.transact(() => {
        updates.forEach((update) => update())
      }, 'init-trip-info')
    }
  }, [doc, isSynced, metaStorageKey])

  const [selfCursor, setSelfCursor] = useState<{ x: number; y: number } | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isRosterOpen, setIsRosterOpen] = useState(false)
  const [chatValue, setChatValue] = useState('')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editStart, setEditStart] = useState('')
  const [editOffset, setEditOffset] = useState('')
  const [isAddingSchedule, setIsAddingSchedule] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)

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

  // 여행 기간 범위 보정
  useEffect(() => {
    if (!tripInfo?.start_date || !tripInfo?.end_date) return
    const min = new Date(tripInfo.start_date)
    const max = new Date(tripInfo.end_date)
    const cur = new Date(selectedDate)
    const curT = cur.setHours(0, 0, 0, 0)
    const minT = min.setHours(0, 0, 0, 0)
    const maxT = max.setHours(0, 0, 0, 0)
    if (curT < minT || curT > maxT) setSelectedDate(min)
  }, [selectedDate, tripInfo?.start_date, tripInfo?.end_date])

  // 저장된 선택 날짜 복원
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
      if (tripInfo?.start_date && tripInfo?.end_date) {
        if (tripInfo.start_date <= stored && stored <= tripInfo.end_date) setSelectedDate(d)
      } else {
        setSelectedDate(d)
      }
    } catch {
      console.error('Failed to load cached selected date')
    }
  }, [metaStorageKey, tripInfo?.start_date, tripInfo?.end_date])

  // 선택 날짜 저장/브로드캐스트
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
      console.error('Failed to save cached selected date')
    }
    try {
      const ev = new CustomEvent('zzik-plan-selected-date', {
        detail: { tripId: tripId ?? null, dateKey: selectedDateKey },
      })
      window.dispatchEvent(ev)
    } catch {
      console.error('Failed to broadcast selected date')
    }
  }, [metaStorageKey, selectedDateKey, tripId])

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

  // 삭제
  const handleRemoveSchedule = useCallback(
    (rawKey: string, realIndex: number) => {
      setEditingKey(null)
      removeSchedule(rawKey, realIndex)
    },
    [removeSchedule]
  )

  // offset_time을 HH:MM 형식으로 정규화
  const normalizeOffsetToHHMM = useCallback((raw?: string | null) => {
    if (!raw) return '00:00'
    const s = String(raw)
    const m = s.match(/^(\d{1,3}):(\d{2})$/)
    if (m) {
      const hh = String(Math.max(0, Number(m[1]) || 0)).padStart(2, '0')
      const mm = String(Math.min(59, Math.max(0, Number(m[2]) || 0))).padStart(2, '0')
      return `${hh}:${mm}`
    }
    let h = 0,
      min = 0,
      sec = 0
    const hr = s.match(/(\d+)\s*hour/)
    if (hr) h = Number(hr[1]) || 0
    const mn = s.match(/(\d+)\s*minute/)
    if (mn) min = Number(mn[1]) || 0
    const sc = s.match(/(\d+)\s*second/)
    if (sc) sec = Number(sc[1]) || 0
    const total = h * 60 + min + Math.floor(sec / 60)
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }, [])

  // 이동시간 계산
  const handleCalculateAllTravelTimes = useCallback(async () => {
    if (schedulesForSelected.length < 2) {
      setToast({
        variant: 'hint',
        message: '이동시간 계산을 위해서는 최소 2개 이상의 일정이 필요합니다.',
      })
      return
    }

    setIsCalculating(true)
    const sortedSchedules = schedulesForSelected

    try {
      // 모든 이동시간 계산을 먼저 완료하고 업데이트 정보 수집
      const updates: Array<{
        nextItem: Y.Map<unknown>
        newStartTime: string
        travelMinutes: number
        travelSeconds?: number
        travelDistance?: number
      }> = []

      for (let i = 0; i < sortedSchedules.length - 1; i++) {
        const current = sortedSchedules[i]
        const next = sortedSchedules[i + 1]

        if (!current.location || !next.location) continue

        const existingDistance = next.travel_distance
        if (typeof existingDistance === 'number' && existingDistance >= 0) {
          continue
        }

        const currentLat = current.location.latitude
        const currentLng = current.location.longitude
        const nextLat = next.location.latitude
        const nextLng = next.location.longitude

        if (!currentLat || !currentLng || !nextLat || !nextLng) continue

        const travelResult = await calculateTravelTime(
          { lat: currentLat, lng: currentLng },
          { lat: nextLat, lng: nextLng }
        )

        if (travelResult === null) {
          console.warn(
            '[API 실패] 이동시간 계산 실패:',
            current.location?.name,
            '→',
            next.location?.name
          )
          continue
        }

        const travelMinutes =
          typeof travelResult === 'number' ? travelResult : travelResult.durationMinutes
        const travelSeconds =
          typeof travelResult === 'object' ? travelResult.durationSeconds : undefined
        const travelDistance = typeof travelResult === 'object' ? travelResult.distance : undefined

        const offsetHHMM = normalizeOffsetToHHMM(current.offset_time)
        const offsetMatch = offsetHHMM.match(/^(\d+):(\d+)$/)

        if (!offsetMatch) {
          console.warn('[⚠️ 건너뛰기] offset_time 형식 오류:', {
            original: current.offset_time,
            normalized: offsetHHMM,
          })
          continue
        }

        const hours = parseInt(offsetMatch[1], 10)
        const minutes = parseInt(offsetMatch[2], 10)
        const currentEndTime = addMinutesToTime(current.start_time, hours * 60 + minutes)

        const newNextStartTime = addMinutesToTime(currentEndTime, travelMinutes)

        if (!doc) {
          console.error('[❌ 저장 실패] doc 없음')
          continue
        }

        if (next.yArrayIndex === undefined) {
          console.error('[❌ 저장 실패] yArrayIndex undefined')
          continue
        }

        const schedulesMap = doc.getMap('schedules') as Y.Map<unknown>
        const nextRawKey = next.rawKey ?? selectedDateKey
        const yArr = schedulesMap.get(nextRawKey) as Y.Array<Y.Map<unknown>> | undefined

        if (!yArr) {
          console.error('[❌ 저장 실패] yArr 없음:', nextRawKey)
          continue
        }

        const yNextItem = yArr.get(next.yArrayIndex) as Y.Map<unknown> | undefined

        if (!yNextItem) {
          console.error('[❌ 저장 실패] yNextItem 없음:', {
            nextRawKey,
            yArrayIndex: next.yArrayIndex,
            yArrLength: yArr.length,
          })
          continue
        }

        // Y.Map 참조와 업데이트 정보를 배열에 저장 (실제 적용은 나중에 한 번에)
        updates.push({
          nextItem: yNextItem,
          newStartTime: newNextStartTime,
          travelMinutes,
          travelSeconds,
          travelDistance,
        })
      }

      // 모든 업데이트를 하나의 transaction으로 처리 (observer 한 번만 실행)
      if (doc && updates.length > 0) {
        doc.transact(() => {
          updates.forEach(({ nextItem, newStartTime, travelMinutes, travelSeconds, travelDistance }) => {
            nextItem.set('start_time', newStartTime)
            const startText = nextItem.get('start_hhmm_text')
            if (startText instanceof Y.Text) {
              const newHHMM = newStartTime.slice(11, 16)
              startText.delete(0, startText.length)
              startText.insert(0, newHHMM)
            }

            if (typeof travelMinutes === 'number') {
              nextItem.set('travel_duration', travelMinutes)
            }

            if (typeof travelSeconds === 'number') {
              nextItem.set('travel_duration_seconds', travelSeconds)
            }

            if (typeof travelDistance === 'number') {
              nextItem.set('travel_distance', travelDistance)
            }
          })
        }, 'save-all-travel-times')
      }

      setToast({
        variant: 'success',
        title: '이동시간 자동 계산 완료',
        message: '자차 기준으로 모든 일정의 시간이 자동 조정되었습니다.',
      })
    } catch (error) {
      console.error('이동시간 계산 오류:', error)
      setToast({
        variant: 'error',
        message: '이동시간 계산 중 오류가 발생했습니다.',
      })
    } finally {
      setIsCalculating(false)
    }
  }, [schedulesForSelected, selectedDateKey, doc, normalizeOffsetToHHMM])

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

  // 채팅
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

  return (
    <section className="relative flex flex-1 min-h-[90vh] lg:min-h-0 flex-col overflow-hidden border-x border-slate-200 bg-white">
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

        <div className="flex min-h-0 flex-1 flex-col gap-5 p-6 pt-16 md:pt-8">
          {/* 헤더 / 제목 */}
          <header className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
            <h2 className="text-4xl font-extrabold text-slate-900 flex-shrink-0 leading-relaxed py-2">
              여행 일정
            </h2>
            <div className="min-w-0 flex-1 max-w-full md:max-w-[32rem]">
              {titleYText ? (
                <YTextEditor
                  ytext={titleYText}
                  placeholder="여행 제목을 입력해주세요"
                  maxLength={MAX_TITLE_LENGTH}
                  singleLine={true}
                  variant="input"
                  size="2xl"
                />
              ) : (
                <input
                  type="text"
                  placeholder={isSynced ? '여행 제목을 입력해주세요' : '동기화 중...'}
                  disabled
                  className="w-full rounded-full border-2 border-slate-300 bg-white px-5 py-2.5 text-xl font-semibold text-slate-900 shadow-sm opacity-50 cursor-wait"
                />
              )}
            </div>

            {/* 접속중인 사용자 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsRosterOpen((open) => !open)}
                aria-expanded={isRosterOpen}
                aria-controls="plan-participant-panel"
                className={cn(
                  'flex items-center gap-2 rounded-full border-2 border-blue-200 bg-white/95 px-5 py-2.5 text-xl font-semibold text-slate-700 shadow-xl backdrop-blur transition',
                  'hover:border-blue-400 hover:text-blue-600 hover:shadow-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300'
                )}
              >
                <span
                  className="inline-flex h-5 w-5 rounded-full"
                  style={{ backgroundColor: self.color }}
                />
                <span className="font-bold">{self.name}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-base font-semibold text-slate-500">
                  {participantCount}명
                </span>
              </button>

              {/* 참여자 패널 */}
              <ParticipantRoster
                isOpen={isRosterOpen}
                onClose={() => setIsRosterOpen(false)}
                participants={rosterEntries}
                participantCount={participantCount}
              />
            </div>

            {/* Chat 버튼 */}
            <div className="relative">
              <button
                type="button"
                onClick={openChatInput}
                className="group flex items-center gap-3 rounded-full border-2 border-blue-200 bg-white/95 px-5 py-2.5 text-xl font-bold text-slate-700 shadow-xl backdrop-blur transition hover:border-blue-400 hover:text-blue-600 hover:shadow-2xl"
              >
                <span className="text-lg uppercase tracking-wide text-slate-500">Chat</span>
                <span className="rounded-lg bg-slate-900/90 px-3 py-1 text-lg font-bold text-white shadow-md">
                  /
                </span>
                <span className="text-lg text-slate-500 group-hover:text-blue-600">
                  눌러서 열기
                </span>
              </button>

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
                chatMessages={cursorSession.chatMessages}
                selfColor={self.color}
              />
            </div>
          </header>

          <WeekCalendar
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onPrevWeek={handlePrevWeek}
            onNextWeek={handleNextWeek}
            minDate={tripInfo?.start_date ? new Date(tripInfo.start_date) : undefined}
            maxDate={tripInfo?.end_date ? new Date(tripInfo.end_date) : undefined}
            onOpenPlaceDrawer={onOpenPlaceDrawer}
            onAddSchedule={() => setIsAddingSchedule(true)}
            onCalculateTravelTime={handleCalculateAllTravelTimes}
            isCalculating={isCalculating}
            showCalculateTravelTime={schedulesForSelected.length >= 2}
          />

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-xl border-2 border-slate-200 p-4 bg-white/80">
            {/* 일정 */}
            <ScheduleList
              schedules={schedulesForSelected}
              selectedDateKey={selectedDateKey}
              doc={doc}
              awareness={awareness}
              editingKey={editingKey}
              editStart={editStart}
              editOffset={editOffset}
              onRemoveSchedule={handleRemoveSchedule}
              onUpdateScheduleTime={updateScheduleTime}
              onSetEditingKey={setEditingKey}
              onSetEditStart={setEditStart}
              onSetEditOffset={setEditOffset}
              onAddSchedule={addSchedule}
              onToast={setToast}
              isAddingSchedule={isAddingSchedule}
              onSetIsAddingSchedule={setIsAddingSchedule}
            />
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
