// src/features/plan/components/place-board/ScheduleList.tsx
import React, { useState } from 'react'
import * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'
import ScheduleItem from './ScheduleItem'
import type { YScheduleItem } from '../../hooks/useYTripDoc'
import { HiX, HiLocationMarker } from 'react-icons/hi'
import { MdDirectionsCar } from 'react-icons/md'
import TimePicker from '@/components/atoms/TimePicker'
import Input from '@/components/atoms/Input'

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
  editingKey: string | null
  editStart: string
  editOffset: string
  onRemoveSchedule: (rawKey: string, index: number) => void
  onUpdateScheduleTime: (
    rawKey: string,
    index: number,
    data: { startTimeLocal?: string; offsetHHMM?: string | null }
  ) => void
  onSetEditingKey: (key: string | null) => void
  onSetEditStart: (value: string) => void
  onSetEditOffset: (value: string) => void
  onAddSchedule: (payload: {
    startTimeLocal: string
    endTimeLocal?: string | null
    memo?: string
    location?: null
  }) => void
  onToast: (toast: {
    variant: 'warning' | 'error' | 'hint' | 'success'
    title?: string
    message: string
  }) => void
  isAddingSchedule: boolean
  onSetIsAddingSchedule: (value: boolean) => void
}

const ScheduleList = ({
  schedules,
  selectedDateKey,
  doc,
  awareness,
  editingKey,
  editStart,
  editOffset,
  onRemoveSchedule,
  onUpdateScheduleTime,
  onSetEditingKey,
  onSetEditStart,
  onSetEditOffset,
  onAddSchedule,
  onToast,
  isAddingSchedule,
  onSetIsAddingSchedule,
}: ScheduleListProps) => {
  const [newScheduleStart, setNewScheduleStart] = useState('')
  const [newScheduleEnd, setNewScheduleEnd] = useState('')
  const [newScheduleMemo, setNewScheduleMemo] = useState('')

  const handleAddNewSchedule = () => {
    if (!newScheduleStart) {
      onToast({
        variant: 'warning',
        message: '시작 시간을 입력해주세요.',
      })
      return
    }

    // 종료 시간이 있으면 검증
    let offsetHHMM = '01:00' // 기본 1시간
    if (newScheduleEnd) {
      const startDate = new Date(`${selectedDateKey}T${newScheduleStart}`)
      const endDate = new Date(`${selectedDateKey}T${newScheduleEnd}`)
      const diff = endDate.getTime() - startDate.getTime()

      if (diff <= 0) {
        onToast({
          variant: 'warning',
          message: '종료 시간은 시작 시간보다 늦어야 합니다.',
        })
        return
      }

      const totalMinutes = Math.floor(diff / 60000)
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      offsetHHMM = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }

    // 시간 겹침 검증
    const newStartDate = new Date(`${selectedDateKey}T${newScheduleStart}`)
    const [offsetH, offsetM] = offsetHHMM.split(':').map(Number)
    const newEndDate = new Date(newStartDate.getTime() + (offsetH * 60 + offsetM) * 60000)

    for (const schedule of schedules) {
      const otherStartHHMM = schedule.start_time.slice(11, 16)
      const otherOffsetHHMM = normalizeOffsetToHHMM(schedule.offset_time)

      if (!otherStartHHMM || !otherOffsetHHMM) continue

      const otherStartDate = new Date(`${selectedDateKey}T${otherStartHHMM}`)
      const [otherOffsetH, otherOffsetM] = otherOffsetHHMM.split(':').map(Number)
      const otherEndDate = new Date(
        otherStartDate.getTime() + (otherOffsetH * 60 + otherOffsetM) * 60000
      )

      // 겹침 확인: (A 시작 < B 종료) AND (B 시작 < A 종료)
      if (newStartDate < otherEndDate && otherStartDate < newEndDate) {
        onToast({
          variant: 'warning',
          title: '시간 겹침',
          message: `다른 일정(${schedule.location?.name || '일정'})과 시간이 겹칩니다.`,
        })
        return
      }
    }

    // 시작 시간을 ISO 형식으로 변환
    const startTimeLocal = `${selectedDateKey}T${newScheduleStart}`
    const endTimeLocal = newScheduleEnd ? `${selectedDateKey}T${newScheduleEnd}` : null

    onAddSchedule({
      startTimeLocal,
      endTimeLocal,
      memo: newScheduleMemo,
      location: null,
    })

    // 폼 초기화
    onSetIsAddingSchedule(false)
    setNewScheduleStart('')
    setNewScheduleEnd('')
    setNewScheduleMemo('')

    onToast({
      variant: 'success',
      message: '새 일정이 추가되었습니다.',
    })
  }

  const handleCancelAddSchedule = () => {
    onSetIsAddingSchedule(false)
    setNewScheduleStart('')
    setNewScheduleEnd('')
    setNewScheduleMemo('')
  }

  return (
    <div>
      {/* 새 일정 추가 폼 */}
      {isAddingSchedule && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/50 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">새 일정 추가</h3>
            <button
              type="button"
              onClick={handleCancelAddSchedule}
              className="rounded-full p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
            >
              <HiX className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* 시작 시간 & 종료 시간 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  시작 시간 <span className="text-red-500">*</span>
                </label>
                <TimePicker
                  value={newScheduleStart}
                  onChange={setNewScheduleStart}
                  placeholder="시작 시간 선택"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">종료 시간</label>
                <TimePicker
                  value={newScheduleEnd}
                  onChange={setNewScheduleEnd}
                  placeholder="종료 시간 선택"
                />
              </div>
            </div>

            {/* 메모 */}
            <div>
              <Input
                value={newScheduleMemo}
                onChange={(e) => setNewScheduleMemo(e.target.value)}
                placeholder="메모를 입력하세요..."
                size="md"
                label="메모"
              />
            </div>

            {/* 버튼 */}
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={handleCancelAddSchedule}
                className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleAddNewSchedule}
                className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition shadow-sm"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      {schedules.length === 0 ? (
        <div className="text-3xl text-text-500/70 text-center">일정이 없습니다.</div>
      ) : (
        <ul className="space-y-3">
          {schedules
            .map((it, originalIndex) => ({ it, originalIndex }))
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
              let travelTimeSeconds: number | null = null
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
                  const savedDurationSeconds = yNextItem.get('travel_duration_seconds') as
                    | number
                    | undefined
                  const savedDistance = yNextItem.get('travel_distance') as number | undefined

                  if (typeof savedDuration === 'number') {
                    travelTimeMinutes = savedDuration
                  }
                  if (typeof savedDurationSeconds === 'number') {
                    travelTimeSeconds = savedDurationSeconds
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
                <React.Fragment key={listKey}>
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
                    nextSchedule={nextSchedule}
                    allSchedules={schedules}
                    onRemove={onRemoveSchedule}
                    onUpdateTime={onUpdateScheduleTime}
                    onSetEditingKey={onSetEditingKey}
                    onSetEditStart={onSetEditStart}
                    onSetEditOffset={onSetEditOffset}
                    onToast={onToast}
                  />
                  {/* 이동시간 & 거리 표시 */}
                  {travelTimeMinutes !== null &&
                    travelTimeMinutes > 0 &&
                    (() => {
                      // 현재 일정의 종료 시간 계산
                      const currentStartTime = it.start_time.slice(11, 16)
                      const currentOffset = it.offset_time || '00:00'
                      const offsetHHMM = normalizeOffsetToHHMM(currentOffset)
                      const [oh, om] = offsetHHMM.split(':').map(Number)
                      const currentStart = new Date(`${selectedDateKey}T${currentStartTime}`)
                      const currentEnd = new Date(currentStart.getTime() + (oh * 60 + om) * 60000)
                      const currentEndTime = `${String(currentEnd.getHours()).padStart(2, '0')}:${String(currentEnd.getMinutes()).padStart(2, '0')}`

                      // 이동시간 기반 예상 도착 시간 계산 (초 단위가 있으면 더 정확하게 계산)
                      const expectedArrival = new Date(
                        currentEnd.getTime() +
                          (travelTimeSeconds !== null
                            ? travelTimeSeconds * 1000
                            : travelTimeMinutes * 60000)
                      )
                      const expectedArrivalTime = `${String(expectedArrival.getHours()).padStart(2, '0')}:${String(expectedArrival.getMinutes()).padStart(2, '0')}`

                      return (
                        <div className="relative flex items-center justify-center py-4">
                          {/* 연결선 */}
                          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-blue-200 via-blue-300 to-blue-200"></div>

                          {/* 이동시간/거리 카드 */}
                          <div className="relative z-10 flex flex-col items-center gap-2 rounded-2xl bg-white border border-blue-200 shadow-sm px-5 py-3">
                            {/* 시간 정보 */}
                            <div className="flex items-center gap-3 text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 font-medium">출발</span>
                                <span className="font-bold text-slate-700">{currentEndTime}</span>
                              </div>
                              <span className="text-slate-400">→</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 font-medium">도착</span>
                                <span className="font-bold text-slate-700">
                                  {expectedArrivalTime}
                                </span>
                              </div>
                            </div>

                            {/* 이동시간 & 거리 */}
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <MdDirectionsCar className="w-4 h-4 text-blue-600" />
                                <span className="font-semibold text-blue-700 text-sm">
                                  {Math.floor(travelTimeMinutes / 60) > 0 &&
                                    `${Math.floor(travelTimeMinutes / 60)}시간 `}
                                  {travelTimeMinutes % 60}분
                                </span>
                              </div>

                              {travelDistance !== null && travelDistance > 0 && (
                                <>
                                  <div className="h-4 w-px bg-blue-200"></div>
                                  <div className="flex items-center gap-2">
                                    <HiLocationMarker className="w-4 h-4 text-blue-600" />
                                    <span className="font-semibold text-blue-700 text-sm">
                                      {travelDistance >= 1000
                                        ? `${(travelDistance / 1000).toFixed(1)}km`
                                        : `${Math.round(travelDistance)}m`}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                </React.Fragment>
              )
            })}
        </ul>
      )}
    </div>
  )
}

export { ScheduleList }
