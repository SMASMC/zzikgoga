import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'
import YTextEditor from '../YTextEditor'
import ScheduleMemoEditor from '../ScheduleMemoEditor'
import type { YScheduleItem } from '../../hooks/useYTripDoc'
import { HiLocationMarker, HiMap, HiDocumentText } from 'react-icons/hi'
import TimePicker from '@/components/atoms/TimePicker'
import DeleteButton from '@/components/atoms/DeleteButton'

/** =========================
 *  공통 스타일 상수(중복 제거)
 *  ========================= */

const clsMicro = 'text-sm text-slate-500'

/** =========================
 *  포맷 유틸
 *  ========================= */
const isValidHHMM = (v: string) => /^\d{2}:\d{2}$/.test(v)

const toTimeFromAny = (isoOrLocal: string) => {
  if (!isoOrLocal) return ''
  const s = isoOrLocal.trim().replace('T', ' ')
  if (s.length >= 16) return s.slice(11, 16)
  if (isValidHHMM(s)) return s
  return ''
}

const normalizeOffsetToHHMM = (raw?: string | null) => {
  if (!raw) return ''
  const s = String(raw)
  const m = s.match(/^(\d{1,3}):(\d{2})$/)
  if (m) {
    const hh = String(Math.max(0, Number(m[1]) || 0)).padStart(2, '0')
    const mm = String(Math.min(59, Math.max(0, Number(m[2]) || 0))).padStart(2, '0')
    return `${hh}:${mm}`
  }
  let hours = 0,
    minutes = 0
  const hr = s.match(/(\d+)\s*hour/)
  if (hr) hours = Number(hr[1]) || 0
  const mn = s.match(/(\d+)\s*minute/)
  if (mn) minutes = Number(mn[1]) || 0
  const total = Math.max(0, hours * 60 + minutes)
  const hh = String(Math.floor(total / 60)).padStart(2, '0')
  const mm = String(total % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

/** 순수 함수: 시작/오프셋 → 종료 HH:MM */
const calcEndHHMM = (dateKey: string, startHHMM: string, offsetHHMM: string) => {
  if (!isValidHHMM(startHHMM) || !isValidHHMM(offsetHHMM)) return ''
  const [oh, om] = offsetHHMM.split(':').map(Number)
  const base = new Date(`${dateKey}T${startHHMM}`)
  if (Number.isNaN(base.getTime())) return ''
  const end = new Date(base.getTime() + (oh * 60 + om) * 60000)
  const hh = String(end.getHours()).padStart(2, '0')
  const mm = String(end.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/** 순수 함수: 시작/종료 → 오프셋 HH:MM */
const diffToOffsetHHMM = (dateKey: string, startHHMM: string, endHHMM: string) => {
  if (!isValidHHMM(startHHMM) || !isValidHHMM(endHHMM)) return ''
  const start = new Date(`${dateKey}T${startHHMM}`)
  const end = new Date(`${dateKey}T${endHHMM}`)
  const diff = end.getTime() - start.getTime()
  if (diff < 0) return ''
  const total = Math.floor(diff / 60000)
  const hh = String(Math.floor(total / 60)).padStart(2, '0')
  const mm = String(total % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

/** =========================
 *  협업 타임 인풋
 *  ========================= */
function CollaborativeTimeInput({
  yText,
  placeholder,
  onValidatedChange,
  onInvalid,
}: {
  yText: Y.Text
  type?: 'time' | 'duration'
  step?: number
  placeholder?: string
  className?: string
  onValidatedChange?: (value: string) => void
  onInvalid?: (prev: string) => void
}) {
  const [value, setValue] = useState<string>(() => {
    const v = yText.toString()
    return isValidHHMM(v) ? v : ''
  })
  const lastGoodRef = useRef<string>(value)

  useEffect(() => {
    const observer = () => {
      const next = yText.toString()
      if (next !== value) {
        setValue(isValidHHMM(next) ? next : '')
        if (isValidHHMM(next)) lastGoodRef.current = next
      }
    }
    yText.observe(observer)
    return () => yText.unobserve(observer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yText])

  const handleChange = (newValue: string) => {
    setValue(newValue)
    yText.delete(0, yText.length)
    yText.insert(0, newValue)
  }

  const handleBlur = () => {
    const cur = yText.toString()
    const norm = isValidHHMM(cur) ? cur : ''
    if (!norm) {
      const prev = lastGoodRef.current || ''
      yText.delete(0, yText.length)
      yText.insert(0, prev)
      setValue(prev)
      onInvalid?.(prev)
      return
    }
    lastGoodRef.current = norm
    onValidatedChange?.(norm)
  }

  return (
    <TimePicker
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
    />
  )
}

/** =========================
 *  컴포넌트
 *  ========================= */
interface ScheduleItemProps {
  schedule: YScheduleItem
  selectedDateKey: string
  realIndex: number
  rawKey: string
  editingKey: string | null
  editStart: string
  editOffset: string
  doc: Y.Doc | null
  awareness: Awareness | null
  nextSchedule?: YScheduleItem | null
  allSchedules?: YScheduleItem[]
  onRemove: (rawKey: string, index: number) => void
  onUpdateTime: (
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

const ScheduleItem = ({
  schedule,
  selectedDateKey,
  realIndex,
  rawKey,
  editingKey,
  editStart,
  editOffset,
  doc,
  awareness,
  allSchedules = [],
  onRemove,
  onUpdateTime,
  onSetEditingKey,
  onSetEditStart,
  onSetEditOffset,
  onToast,
}: ScheduleItemProps) => {
  const isEditing = editingKey === `${rawKey}:${realIndex}`
  const location = schedule.location

  /** 시간 겹침 검증 함수 */
  const checkTimeOverlap = useCallback(
    (newStartHHMM: string, newOffsetHHMM: string): boolean => {
      if (!isValidHHMM(newStartHHMM) || !isValidHHMM(newOffsetHHMM)) return false

      // allSchedules가 없으면 겹침 없음
      if (!allSchedules || allSchedules.length === 0) return false

      // 새로운 시작/종료 시간 계산
      const newStartDate = new Date(`${selectedDateKey}T${newStartHHMM}`)
      const [offsetH, offsetM] = newOffsetHHMM.split(':').map(Number)
      const newEndDate = new Date(newStartDate.getTime() + (offsetH * 60 + offsetM) * 60000)

      // 다른 모든 일정과 겹치는지 확인
      for (const other of allSchedules) {
        // 자기 자신은 제외 (uid로 고유 식별, realIndex는 보조 확인)
        const isSameSchedule =
          (schedule.uid && other.uid && schedule.uid === other.uid) ||
          (realIndex !== undefined &&
            other.yArrayIndex !== undefined &&
            realIndex === other.yArrayIndex)

        if (isSameSchedule) {
          continue
        }

        const otherStartHHMM = toTimeFromAny(other.start_time)
        const otherOffsetHHMM = normalizeOffsetToHHMM(other.offset_time)

        if (!isValidHHMM(otherStartHHMM) || !isValidHHMM(otherOffsetHHMM)) continue

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
            message: `다른 일정(${other.location?.name || '일정'})과 시간이 겹칩니다.`,
          })
          return true
        }
      }

      return false
    },
    [allSchedules, schedule.uid, realIndex, selectedDateKey, onToast]
  )

  /** 장소 라인(간결 표기) */
  const regionLine = useMemo(() => {
    if (!location) return ''
    return [location.sido, location.sigungu].filter(Boolean).join(' ')
  }, [location])
  const roadLine = useMemo(() => {
    if (!location) return ''
    return [location.road_name, location.building_num].filter(Boolean).join(' ')
  }, [location])
  const coordinateLine = useMemo(() => {
    if (!location) return ''
    const { latitude, longitude } = location
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return ''
    return `(${latitude.toFixed(5)}, ${longitude.toFixed(5)})`
  }, [location])

  /** Y 구조 참조 */
  const yItemRef = useRef<Y.Map<unknown> | null>(null)
  const yLocationNameRef = useRef<Y.Text | null>(null)
  const yLocationDetailRef = useRef<Y.Text | null>(null)
  const yStartTextRef = useRef<Y.Text | null>(null)
  const yOffsetTextRef = useRef<Y.Text | null>(null)

  useEffect(() => {
    if (!doc) {
      yItemRef.current = null
      yLocationNameRef.current = null
      yLocationDetailRef.current = null
      yStartTextRef.current = null
      yOffsetTextRef.current = null
      return
    }
    const schedulesMap = doc.getMap('schedules') as Y.Map<unknown>
    const yArr = schedulesMap.get(rawKey) as Y.Array<Y.Map<unknown>> | undefined
    const yItem = yArr?.get(realIndex) as Y.Map<unknown> | undefined
    yItemRef.current = yItem ?? null

    if (yItem && yItem.get('location') instanceof Y.Map) {
      const yLoc = yItem.get('location') as Y.Map<unknown>
      const name = yLoc.get('name')
      yLocationNameRef.current = name instanceof Y.Text ? name : null

      // detail Y.Text 초기화
      const ensureLocationText = (key: string, initial: string) => {
        const cur = yLoc.get(key)
        if (cur instanceof Y.Text) return cur
        // 초기값의 앞뒤 따옴표 제거 (데이터 정규화)
        const cleanedInitial = initial.replace(/^["']|["']$/g, '')
        const t = new Y.Text(cleanedInitial)
        doc.transact(() => {
          yLoc.set(key, t)
        })
        return t
      }
      // detail은 이미 Y.Text로 저장되어 있으므로 fallback만 제공
      yLocationDetailRef.current = ensureLocationText('detail', location?.detail || '')
    } else {
      yLocationNameRef.current = null
      yLocationDetailRef.current = null
    }

    if (yItem) {
      const ensureText = (key: string, initial: string) => {
        const cur = yItem.get(key)
        if (cur instanceof Y.Text) return cur
        const t = new Y.Text(initial)
        doc.transact(() => {
          yItem.set(key, t)
        })
        return t
      }
      const initStart = toTimeFromAny(String(yItem.get('start_time') ?? schedule.start_time))
      const initOff = normalizeOffsetToHHMM(
        String(yItem.get('offset_time') ?? schedule.offset_time)
      )
      yStartTextRef.current = ensureText('start_hhmm_text', initStart)
      yOffsetTextRef.current = ensureText('offset_hhmm_text', initOff)
    } else {
      yStartTextRef.current = null
      yOffsetTextRef.current = null
    }
  }, [doc, rawKey, realIndex, schedule.start_time, schedule.offset_time, location])

  /** 라벨(폴백 포함) */
  const startLabel = yStartTextRef.current?.toString() || toTimeFromAny(schedule.start_time) || ''
  const offsetLabel =
    yOffsetTextRef.current?.toString() || normalizeOffsetToHHMM(schedule.offset_time) || ''
  const endTimeLabel = useMemo(
    () => calcEndHHMM(selectedDateKey, startLabel, offsetLabel),
    [selectedDateKey, startLabel, offsetLabel]
  )

  /** 협업 텍스트 → 원본 필드 동기화 */
  const syncCanonical = (which: 'start' | 'offset', valueHHMM: string) => {
    const yItem = yItemRef.current
    if (!doc || !yItem) return
    doc.transact(() => {
      if (which === 'start') {
        const existingStartTime = String(yItem.get('start_time') ?? schedule.start_time)
        const datePart = existingStartTime.slice(0, 10) || selectedDateKey
        const newStartTime = `${datePart}T${valueHHMM}`
        yItem.set('start_time', newStartTime)
      } else {
        yItem.set('offset_time', valueHHMM || '00:00')
      }
    }, `sync-${which}-canonical`)
  }

  /** doc 없음 대비(폴백) */
  const [fallbackStart, setFallbackStart] = useState<string>(toTimeFromAny(schedule.start_time))
  const [fallbackEnd, setFallbackEnd] = useState<string>(
    () =>
      calcEndHHMM(
        selectedDateKey,
        toTimeFromAny(schedule.start_time),
        normalizeOffsetToHHMM(schedule.offset_time)
      ) || ''
  )
  useEffect(() => {
    if (!doc) setFallbackStart(toTimeFromAny(schedule.start_time))
  }, [doc, schedule.start_time])
  useEffect(() => {
    if (!doc) {
      const end = calcEndHHMM(
        selectedDateKey,
        toTimeFromAny(schedule.start_time),
        normalizeOffsetToHHMM(schedule.offset_time)
      )
      setFallbackEnd(end || '')
    }
  }, [doc, schedule.start_time, schedule.offset_time, selectedDateKey])

  return (
    <li className="group relative rounded-lg border-2 p-2 shadow-sm transition-all">
      {/* 헤더: 장소 + 삭제 버튼 한 줄 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <HiLocationMarker className="w-7 h-7 text-blue-500 shrink-0" />
          <span className="text-2xl font-bold text-slate-800 truncate">
            {schedule.location?.name || '일정'}
          </span>
        </div>
        <DeleteButton onClick={() => onRemove(rawKey, realIndex)} />
      </div>

      {/* 위치정보 + 시간설정 + 메모 (3컬럼) */}
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        {/* 위치 정보 */}
        <div className="rounded-lg border border-slate-200 bg-white/70 px-2.5 py-2">
          <div className="flex items-center gap-1.5 mb-1">
            <HiMap className="w-5 h-5 text-green-500" />
            <span className="text-base font-bold text-slate-700">위치</span>
          </div>
          <div className="space-y-0.5">
            {location?.full_address && (
              <div className="text-base text-slate-700 line-clamp-1 flex items-start gap-1">
                <HiLocationMarker className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <span className="flex-1">{location.full_address}</span>
              </div>
            )}
            {(regionLine || roadLine) && (
              <div className={clsMicro}>{[regionLine, roadLine].filter(Boolean).join(' · ')}</div>
            )}
            {/* 상세 주소 입력 필드 (location이 있을 때만) */}
            {location && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-200">
                <div className="text-sm font-semibold text-slate-500 mb-1">상세 주소</div>
                {yLocationDetailRef.current ? (
                  <YTextEditor
                    ytext={yLocationDetailRef.current}
                    variant="plain"
                    size="xs"
                    className="rounded-full px-2 py-1.5 border border-slate-200"
                    singleLine
                    placeholder="상세 주소 입력..."
                  />
                ) : (
                  <div className="rounded-full px-2 py-1.5 border border-slate-200">
                    {location.detail || '상세 주소 입력...'}
                  </div>
                )}
              </div>
            )}
            {/* 위도/경도는 숨김 처리 (값은 유지) */}
            {coordinateLine && <div className="sr-only">{coordinateLine}</div>}
          </div>
        </div>

        {/* 시간 설정 */}
        <div className="rounded-lg border border-slate-200 bg-white/70 px-2.5 py-2">
          <div className="grid grid-cols-2 gap-3">
            {/* 시작 */}
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">시작 시간</label>
              {doc && yStartTextRef.current ? (
                <CollaborativeTimeInput
                  yText={yStartTextRef.current}
                  type="time"
                  placeholder="시작 HH:MM"
                  onValidatedChange={(hhmm) => {
                    // 시간 겹침 검증
                    const currentOffset =
                      yOffsetTextRef.current?.toString() ||
                      normalizeOffsetToHHMM(schedule.offset_time) ||
                      '00:00'
                    if (checkTimeOverlap(hhmm, currentOffset)) {
                      // 겹침이 있으면 원래 값으로 되돌리기
                      const originalStart = toTimeFromAny(schedule.start_time)
                      if (yStartTextRef.current) {
                        yStartTextRef.current.delete(0, yStartTextRef.current.length)
                        yStartTextRef.current.insert(0, originalStart)
                      }
                      return
                    }

                    syncCanonical('start', hhmm)
                    if (isValidHHMM(endTimeLabel) && yOffsetTextRef.current) {
                      const newOffset = diffToOffsetHHMM(selectedDateKey, hhmm, endTimeLabel)
                      if (newOffset) {
                        yOffsetTextRef.current.delete(0, yOffsetTextRef.current.length)
                        yOffsetTextRef.current.insert(0, newOffset)
                        syncCanonical('offset', newOffset)
                      }
                    }
                  }}
                  onInvalid={() =>
                    onToast({
                      variant: 'warning',
                      title: '입력 형식 확인',
                      message: 'HH:MM 형식으로 입력하세요.',
                    })
                  }
                />
              ) : (
                <TimePicker
                  value={fallbackStart}
                  onChange={(newStart) => {
                    setFallbackStart(newStart)
                    if (isValidHHMM(newStart) && isValidHHMM(fallbackEnd)) {
                      const newOffset = diffToOffsetHHMM(selectedDateKey, newStart, fallbackEnd)
                      if (newOffset) {
                        // 시간 겹침 검증
                        if (checkTimeOverlap(newStart, newOffset)) {
                          return
                        }

                        const datePart = schedule.start_time.slice(0, 10)
                        onUpdateTime(rawKey, realIndex, {
                          startTimeLocal: `${datePart}T${newStart}`,
                          offsetHHMM: newOffset,
                        })
                      }
                    }
                  }}
                  placeholder="시작 HH:MM"
                />
              )}
            </div>

            {/* 종료 */}
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">종료 시간</label>
              {doc && yStartTextRef.current && yOffsetTextRef.current ? (
                <TimePicker
                  value={endTimeLabel}
                  onChange={(newEnd) => {
                    const newOffset = diffToOffsetHHMM(selectedDateKey, startLabel, newEnd)
                    if (!newOffset) {
                      onToast({
                        variant: 'warning',
                        message: '종료 시간은 시작 시간보다 빠를 수 없습니다.',
                      })
                      return
                    }

                    // 시간 겹침 검증
                    if (checkTimeOverlap(startLabel, newOffset)) {
                      return
                    }

                    yOffsetTextRef.current?.delete(0, yOffsetTextRef.current.length)
                    yOffsetTextRef.current?.insert(0, newOffset)
                    syncCanonical('offset', newOffset)
                  }}
                  placeholder="종료 HH:MM"
                  align="right"
                />
              ) : (
                <TimePicker
                  value={fallbackEnd}
                  align="right"
                  onChange={(newEnd) => {
                    setFallbackEnd(newEnd)
                    const newOffset = diffToOffsetHHMM(selectedDateKey, fallbackStart, newEnd)
                    if (!newOffset) {
                      onToast({
                        variant: 'warning',
                        message: '종료 시간은 시작 시간보다 빠를 수 없습니다.',
                      })
                      return
                    }

                    // 시간 겹침 검증
                    if (checkTimeOverlap(fallbackStart, newOffset)) {
                      return
                    }

                    const datePart = schedule.start_time.slice(0, 10)
                    onUpdateTime(rawKey, realIndex, {
                      startTimeLocal: `${datePart}T${fallbackStart}`,
                      offsetHHMM: newOffset,
                    })
                  }}
                  placeholder="종료 HH:MM"
                />
              )}
            </div>
          </div>

          {/* 소요시간 및 시간 표시 */}
          <div className="mt-3 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between text-base">
              <span className="text-slate-500 font-medium">소요시간</span>
              <span className="font-bold text-slate-700">{offsetLabel || '00:00'}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-base">
              <div className="flex items-center gap-1">
                <span className="text-slate-500">시작</span>
                <span className="font-semibold text-blue-700">{startLabel}</span>
              </div>
              <span className="text-slate-400">→</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-500">종료</span>
                <span className="font-semibold text-blue-700">{endTimeLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 메모 */}
        <div className="rounded-lg border border-slate-200 bg-white/70 px-2.5 py-2">
          <div className="flex items-center gap-1.5 mb-1">
            <HiDocumentText className="w-5 h-5 text-amber-500" />
            <span className="text-base font-bold text-slate-700">메모</span>
          </div>
          {doc ? (
            <ScheduleMemoEditor
              doc={doc}
              awareness={awareness}
              dateKey={rawKey}
              index={realIndex}
              fieldKey={`memo-${schedule.uid}`}
              initialText={schedule.memo}
            />
          ) : (
            <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-base text-slate-500">
              {schedule.memo?.trim() ? schedule.memo : '메모를 추가해보세요.'}
            </div>
          )}
        </div>
      </div>

      {/* 고급 편집(간결) */}
      {isEditing ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-2">
          <label className={clsMicro}>start_time</label>
          <input
            value={editStart}
            onChange={(e) => onSetEditStart(e.target.value)}
            placeholder="YYYY-MM-DD-HH-MM"
            className="w-44 rounded border border-slate-200 bg-white px-2 py-1 text-base text-slate-700 focus:border-blue-400 focus:outline-none"
          />
          <label className={clsMicro}>offset_time</label>
          <input
            value={editOffset}
            onChange={(e) => onSetEditOffset(e.target.value)}
            placeholder="HH:MM"
            className="w-24 rounded border border-slate-200 bg-white px-2 py-1 text-base text-slate-700 focus:border-blue-400 focus:outline-none"
          />
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="rounded bg-blue-500 px-3 py-1 text-base font-semibold text-white hover:bg-blue-600"
              onClick={() => {
                const m = editStart.trim().match(/^(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})$/)
                const iso = m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}` : null
                const off = editOffset ? normalizeOffsetToHHMM(editOffset) : ''
                if (!iso) {
                  onToast({
                    variant: 'warning',
                    title: '입력 형식 확인',
                    message: 'start_time 형식은 YYYY-MM-DD-HH-MM 입니다.',
                  })
                  return
                }
                if (editOffset && !isValidHHMM(off)) {
                  onToast({
                    variant: 'warning',
                    title: '입력 형식 확인',
                    message: 'offset_time 형식은 HH:MM 입니다.',
                  })
                  return
                }
                onUpdateTime(rawKey, realIndex, {
                  startTimeLocal: iso,
                  offsetHHMM: editOffset ? off : null,
                })
                onSetEditingKey(null)
              }}
            >
              저장
            </button>
            <button
              type="button"
              className="rounded border border-slate-200 px-3 py-1 text-base text-slate-600 hover:bg-slate-50"
              onClick={() => onSetEditingKey(null)}
            >
              취소
            </button>
          </div>
        </div>
      ) : null}
    </li>
  )
}

export default ScheduleItem
