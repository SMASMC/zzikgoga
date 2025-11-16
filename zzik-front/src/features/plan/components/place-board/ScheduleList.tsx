// src/features/plan/components/place-board/ScheduleList.tsx
import { useState } from 'react'
import type { RefObject } from 'react'
import * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'
import ScheduleItem from './ScheduleItem'
import type { YScheduleItem } from '../../hooks/useYTripDoc'
import { calculateTravelTime, addMinutesToTime } from '../../services/naverMapService'

/** offset_time을 HH:MM 형식으로 정규화 */
const normalizeOffsetToHHMM = (raw?: string | null) => {
  if (!raw) return '00:00'
  const s = String(raw)
  const m = s.match(/^(\d{1,3}):(\d{2})$/)
  if (m) {
    const hh = String(Math.max(0, Number(m[1]) || 0)).padStart(2, '0')
    const mm = String(Math.min(59, Math.max(0, Number(m[2]) || 0))).padStart(2, '0')
    return `${hh}:${mm}`
  }
  // "24 hours" / "30 minutes" / "0 seconds" 등 파싱
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
}

interface ScheduleListProps {
  schedules: YScheduleItem[]
  selectedDateKey: string
  doc: Y.Doc | null
  awareness: Awareness | null
  dragItemRef: RefObject<{ dateKey: string; index: number } | null>
  editingKey: string | null
  editStart: string
  editOffset: string
  onDragStart: (dateKey: string, index: number) => void
  onDragEnd: () => void
  onDropWithinDate: (dateKey: string, index: number) => void
  onDropToEnd: (dateKey: string) => void
  onRemoveSchedule: (rawKey: string, index: number) => void
  onUpdateScheduleTime: (
    rawKey: string,
    index: number,
    data: { startTimeLocal?: string; offsetHHMM?: string | null }
  ) => void
  onSetEditingKey: (key: string | null) => void
  onSetEditStart: (value: string) => void
  onSetEditOffset: (value: string) => void
  onToast: (toast: {
    variant: 'warning' | 'error' | 'hint' | 'success'
    title?: string
    message: string
  }) => void
}

const ScheduleList = ({
  schedules,
  selectedDateKey,
  doc,
  awareness,
  dragItemRef,
  editingKey,
  editStart,
  editOffset,
  onDragStart,
  onDragEnd,
  onDropWithinDate,
  onDropToEnd,
  onRemoveSchedule,
  onUpdateScheduleTime,
  onSetEditingKey,
  onSetEditStart,
  onSetEditOffset,
  onToast,
}: ScheduleListProps) => {
  const [isCalculating, setIsCalculating] = useState(false)
  // 디버깅: 환경 변수 확인

  const handleCalculateAllTravelTimes = async () => {
    if (schedules.length < 2) {
      onToast({
        variant: 'hint',
        message: '이동시간 계산을 위해서는 최소 2개 이상의 일정이 필요합니다.',
      })
      return
    }

    setIsCalculating(true)
    const sortedSchedules = [...schedules].sort((a, b) => a.start_time.localeCompare(b.start_time))

    try {
      for (let i = 0; i < sortedSchedules.length - 1; i++) {
        const current = sortedSchedules[i]
        const next = sortedSchedules[i + 1]

        if (!current.location || !next.location) continue

        // 이미 이동시간이 계산되어 있으면 건너뛰기
        const existingDistance = next.travel_distance
        if (typeof existingDistance === 'number' && existingDistance >= 0) {
          console.log(
            '[이동시간 계산 건너뛰기] 이미 계산됨:',
            current.location?.name,
            '→',
            next.location?.name
          )
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

        console.log('[API 응답]', {
          from: current.location?.name,
          to: next.location?.name,
          travelResult,
        })

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
        const travelDistance =
          typeof travelResult === 'object' ? travelResult.distance : undefined

        console.log('[💾 저장 시작]', {
          from: current.location?.name,
          to: next.location?.name,
          travelMinutes,
          travelDistance,
          nextUID: next.uid,
          nextYArrayIndex: next.yArrayIndex,
          nextRawKey: next.rawKey,
        })

        // 현재 일정의 종료 시간 계산
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

        // 다음 일정의 새로운 시작시간
        const newNextStartTime = addMinutesToTime(currentEndTime, travelMinutes)

        // Y.js로 다음 일정 업데이트
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

        // 저장!
        doc.transact(() => {
          // 시작 시간 업데이트
          yNextItem.set('start_time', newNextStartTime)
          const startText = yNextItem.get('start_hhmm_text')
          if (startText instanceof Y.Text) {
            const newHHMM = newNextStartTime.slice(11, 16)
            startText.delete(0, startText.length)
            startText.insert(0, newHHMM)
          }

          // 이동시간 및 거리 저장
          if (typeof travelMinutes === 'number') {
            yNextItem.set('travel_duration', travelMinutes)
            console.log('[✅ travel_duration 저장]', travelMinutes)
          }

          if (typeof travelDistance === 'number') {
            yNextItem.set('travel_distance', travelDistance)
            console.log('[✅ travel_distance 저장]', travelDistance)
          }

          console.log('[✅ 저장 완료]', {
            location: next.location?.name,
            travel_duration: yNextItem.get('travel_duration'),
            travel_distance: yNextItem.get('travel_distance'),
          })
        }, 'save-travel-time')
      }

      onToast({
        variant: 'success',
        title: '이동시간 자동 계산 완료',
        message: '자차 기준으로 모든 일정의 시간이 자동 조정되었습니다.',
      })
    } catch (error) {
      console.error('이동시간 계산 오류:', error)
      onToast({
        variant: 'error',
        message: '이동시간 계산 중 오류가 발생했습니다.',
      })
    } finally {
      setIsCalculating(false)
    }
  }

  return (
    <div className="rounded-xl border-2 border-slate-100 bg-white p-4 shadow-sm">
      {/* 이동시간 계산 버튼 */}
      {schedules.length >= 2 && (
        <div className="mb-4 flex gap-2 justify-end">
          <button
            type="button"
            className="rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-2 text-sm font-bold text-blue-700 transition-all hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            onClick={handleCalculateAllTravelTimes}
            disabled={isCalculating}
          >
            <span className="text-base">🚗</span>
            {isCalculating ? '계산 중...' : '이동시간 계산'}
          </button>
        </div>
      )}
      {schedules.length === 0 ? (
        <div className="text-3xl text-text-500/70 text-center">일정이 없습니다.</div>
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
            onDropToEnd(selectedDateKey)
          }}
        >
          {schedules
            .map((it, originalIndex) => ({ it, originalIndex }))
            .sort((a, b) => a.it.start_time.localeCompare(b.it.start_time))
            .map(({ it, originalIndex }, sortedIndex, sortedArray) => {
              // Use actual Y.Array index (accurate even if items are deleted)
              const realIndex = it.yArrayIndex ?? originalIndex
              // Use uid for stable key - originalIndex is meaningless after sorting!
              const listKey = `${selectedDateKey}-${it.uid}`
              // 다음 일정 (정렬된 배열 기준)
              const nextSchedule =
                sortedIndex < sortedArray.length - 1 ? sortedArray[sortedIndex + 1].it : null

              // 저장된 이동시간 및 거리 정보 가져오기
              let travelTimeMinutes: number | null = null
              let travelDistance: number | null = null
              if (nextSchedule && doc) {
                // Y.js에서 직접 읽어오기 (스냅샷이 아직 업데이트 안 되었을 수 있음)
                const schedulesMap = doc.getMap('schedules') as Y.Map<Y.Array<Y.Map<unknown>>>
                const nextRawKey = nextSchedule.rawKey ?? selectedDateKey
                const yArr = schedulesMap.get(nextRawKey) as Y.Array<Y.Map<unknown>> | undefined
                const yNextItem =
                  nextSchedule.yArrayIndex !== undefined
                    ? (yArr?.get(nextSchedule.yArrayIndex) as Y.Map<unknown> | undefined)
                    : undefined

                if (yNextItem) {
                  const savedDuration = yNextItem.get('travel_duration') as number | undefined
                  const savedDistance = yNextItem.get('travel_distance') as number | undefined

                  if (typeof savedDuration === 'number') {
                    travelTimeMinutes = savedDuration
                  }
                  if (typeof savedDistance === 'number') {
                    travelDistance = savedDistance
                  }
                } else {
                  console.error('[❌ 이동시간 읽기 실패] yNextItem을 찾을 수 없음:', {
                    nextRawKey,
                    yArrayIndex: nextSchedule.yArrayIndex,
                    hasDoc: !!doc,
                    hasYArr: !!yArr,
                  })
                }
              }

              return (
                <li key={listKey}>
                  <ScheduleItem
                    schedule={it}
                    selectedDateKey={selectedDateKey}
                    realIndex={realIndex}
                    rawKey={it.rawKey ?? selectedDateKey}
                    editingKey={editingKey}
                    editStart={editStart}
                    editOffset={editOffset}
                    doc={doc}
                    awareness={awareness}
                    dragItemRef={dragItemRef}
                    nextSchedule={nextSchedule}
                    allSchedules={schedules}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    onDropWithinDate={onDropWithinDate}
                    onRemove={onRemoveSchedule}
                    onUpdateTime={onUpdateScheduleTime}
                    onSetEditingKey={onSetEditingKey}
                    onSetEditStart={onSetEditStart}
                    onSetEditOffset={onSetEditOffset}
                    onToast={onToast}
                  />
                  {/* 이동시간 & 거리 표시 */}
                  {travelTimeMinutes !== null && travelTimeMinutes > 0 && (
                    <div className="relative flex items-center justify-center py-3">
                      {/* 연결선 */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-blue-300 to-blue-200"></div>

                      {/* 이동시간/거리 카드 */}
                      <div className="relative z-10 flex items-center gap-3 rounded-lg bg-white border-2 border-blue-300 shadow-sm px-4 py-2">
                        {/* 위쪽 화살표 */}
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                          <div className="text-blue-400 text-xs">▼</div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-blue-600 text-lg">🚗</span>
                          <span className="font-bold text-blue-700 text-sm">
                            {Math.floor(travelTimeMinutes / 60) > 0 &&
                              `${Math.floor(travelTimeMinutes / 60)}시간 `}
                            {travelTimeMinutes % 60}분
                          </span>
                        </div>

                        {travelDistance !== null && travelDistance > 0 && (
                          <>
                            <div className="h-4 w-px bg-blue-300"></div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-blue-600">📍</span>
                              <span className="font-bold text-blue-700 text-sm">
                                {travelDistance >= 1000
                                  ? `${(travelDistance / 1000).toFixed(1)}km`
                                  : `${Math.round(travelDistance)}m`}
                              </span>
                            </div>
                          </>
                        )}

                        {/* 아래쪽 화살표 */}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                          <div className="text-blue-400 text-xs">▼</div>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
        </ul>
      )}
    </div>
  )
}

export { ScheduleList }
