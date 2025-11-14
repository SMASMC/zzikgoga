import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'
import YTextEditor from '../YTextEditor'
import ScheduleMemoEditor from '../ScheduleMemoEditor'
import type { YScheduleItem } from '../../hooks/useYTripDoc'

/** === 포맷 유틸 === */
const toTimeFromAny = (isoOrLocal: string) => {
  if (!isoOrLocal) return ''
  const s = isoOrLocal.trim().replace('T', ' ')
  if (s.length >= 16) return s.slice(11, 16)
  if (/^\d{2}:\d{2}$/.test(s)) return s
  return ''
}
const isValidHHMM = (v: string) => /^\d{2}:\d{2}$/.test(v)
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
  const total = hours * 60 + minutes
  const hh = String(Math.floor(total / 60)).padStart(2, '0')
  const mm = String(total % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

/** === 협업 타임 인풋 === */
function CollaborativeTimeInput({
  yText,
  step = 60,
  placeholder,
  className,
  onValidatedChange,
  onInvalid,
}: {
  yText: Y.Text
  type: 'time' | 'duration'
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
        setValue(next)
        if (isValidHHMM(next)) lastGoodRef.current = next
      }
    }
    yText.observe(observer)
    return () => yText.unobserve(observer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yText])

  return (
    <input
      type="time"
      step={step}
      value={value}
      placeholder={placeholder}
      onChange={(e) => {
        const v = e.currentTarget.value
        setValue(v)
        yText.delete(0, yText.length)
        yText.insert(0, v)
      }}
      onBlur={() => {
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
      }}
      className={className}
    />
  )
}

interface ScheduleItemProps {
  schedule: YScheduleItem
  selectedDateKey: string
  realIndex: number
  rawKey: string // Original key from Y.Map
  editingKey: string | null
  editStart: string
  editOffset: string
  doc: Y.Doc | null
  awareness: Awareness | null
  dragItemRef: RefObject<{ dateKey: string; index: number } | null>
  onDragStart: (dateKey: string, index: number) => void
  onDragEnd: () => void
  onDropWithinDate: (dateKey: string, index: number) => void
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
  dragItemRef,
  onDragStart,
  onDragEnd,
  onDropWithinDate,
  onRemove,
  onUpdateTime,
  onSetEditingKey,
  onSetEditStart,
  onSetEditOffset,
  onToast,
}: ScheduleItemProps) => {
  const isEditing = editingKey === `${rawKey}:${realIndex}`
  const location = schedule.location

  /** 장소 라인 */
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

  /** 현재 아이템의 Y 구조만 접근(공유 방지) */
  const yItemRef = useRef<Y.Map<unknown> | null>(null)
  const yLocationNameRef = useRef<Y.Text | null>(null)
  const yStartTextRef = useRef<Y.Text | null>(null)
  const yOffsetTextRef = useRef<Y.Text | null>(null)

  useEffect(() => {
    if (!doc) {
      yItemRef.current = null
      yLocationNameRef.current = null
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
    } else {
      yLocationNameRef.current = null
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
  }, [doc, rawKey, realIndex, schedule.start_time, schedule.offset_time])

  /** 종료시간 라벨 */
  const startLabel = yStartTextRef.current?.toString() ?? toTimeFromAny(schedule.start_time)
  const offsetLabel =
    yOffsetTextRef.current?.toString() ?? normalizeOffsetToHHMM(schedule.offset_time)
  const endTimeLabel = useMemo(() => {
    if (!isValidHHMM(startLabel) || !isValidHHMM(offsetLabel)) return ''
    const [dh, dm] = offsetLabel.split(':').map(Number)
    const base = new Date(`${selectedDateKey}T${startLabel}`)
    if (Number.isNaN(base.getTime())) return ''
    const end = new Date(base.getTime() + (dh * 60 + dm) * 60000)
    const hh = String(end.getHours()).padStart(2, '0')
    const mm = String(end.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }, [selectedDateKey, startLabel, offsetLabel])

  /** 협업 텍스트 → 원본 필드 동기화 */
  const syncCanonical = (which: 'start' | 'offset', valueHHMM: string) => {
    const yItem = yItemRef.current
    if (!doc || !yItem) return
    doc.transact(() => {
      if (which === 'start') {
        // Use the date portion from existing start_time, not selectedDateKey
        const existingStartTime = String(yItem.get('start_time') ?? schedule.start_time)
        const datePart = existingStartTime.slice(0, 10) // "YYYY-MM-DD"
        const newStartTime = `${datePart}T${valueHHMM}`
        console.log(`[syncCanonical] Setting start_time to: ${newStartTime}`)
        yItem.set('start_time', newStartTime)
      } else {
        console.log(`[syncCanonical] Setting offset_time to: ${valueHHMM || '00:00'}`)
        yItem.set('offset_time', valueHHMM || '00:00')
      }
    }, `sync-${which}-canonical`)
  }

  /** doc 없음 대비 */
  const [fallbackStart, setFallbackStart] = useState<string>(toTimeFromAny(schedule.start_time))
  const [fallbackOffset, setFallbackOffset] = useState<string>(
    normalizeOffsetToHHMM(schedule.offset_time)
  )
  useEffect(() => {
    if (!doc) setFallbackStart(toTimeFromAny(schedule.start_time))
  }, [doc, schedule.start_time])
  useEffect(() => {
    if (!doc) setFallbackOffset(normalizeOffsetToHHMM(schedule.offset_time))
  }, [doc, schedule.offset_time])

  return (
    <li
      className="rounded-xl border-2 border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
      draggable={!isEditing}
      onDragStart={() => onDragStart(selectedDateKey, realIndex)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        if (dragItemRef.current) e.preventDefault()
      }}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onDropWithinDate(selectedDateKey, realIndex)
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        {yLocationNameRef.current ? (
          <div className="flex-1 min-w-0">
            <YTextEditor
              ytext={yLocationNameRef.current}
              variant="plain"
              className="text-lg font-bold text-slate-800"
              singleLine
              placeholder="장소 이름"
            />
          </div>
        ) : (
          <span className="text-lg font-bold text-slate-800">
            {schedule.location?.name || '일정'}
          </span>
        )}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="font-semibold">{startLabel || '시간 미정'}</span>
          <span className="text-xs text-slate-400">~</span>
          <span className="font-semibold">
            {endTimeLabel || (offsetLabel ? '계산 오류' : '시간 미정')}
          </span>
          {offsetLabel ? (
            <span className="text-xs text-slate-500 font-medium">(+{offsetLabel})</span>
          ) : null}
        </div>
      </div>

      {/* 삭제 */}
      <div className="mt-2 flex flex-wrap items-end justify-end gap-2 text-[11px] text-slate-500">
        <button
          type="button"
          className="rounded-full border border-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-500 transition hover:border-red-300 hover:bg-red-50"
          onClick={() => {
            console.log(
              `[ScheduleItem] Delete clicked: rawKey=${rawKey}, realIndex=${realIndex}, schedule.id=${schedule.id}, schedule.uid=${schedule.uid}`
            )
            onRemove(rawKey, realIndex)
          }}
        >
          삭제
        </button>
      </div>

      {/* 메모 */}
      <div className="mt-3">
        <div className="mb-1 text-[12px] font-semibold text-text-600">메모</div>
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
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-400">
            {schedule.memo?.trim() ? schedule.memo : '메모를 추가해보세요.'}
          </div>
        )}
      </div>

      {/* 위치 상세 */}
      {location ? (
        <div className="mt-1 space-y-0.5 text-[11px] text-slate-500">
          {location.full_address ? (
            <div className="line-clamp-1">{location.full_address}</div>
          ) : null}
          {regionLine ? <div className="line-clamp-1">{regionLine}</div> : null}
          {roadLine ? <div className="line-clamp-1">{roadLine}</div> : null}
          {location.detail ? (
            <div className="line-clamp-1 text-slate-400">{location.detail}</div>
          ) : null}
          {coordinateLine ? (
            <div className="font-mono text-[10px] text-slate-400">{coordinateLine}</div>
          ) : null}
        </div>
      ) : null}

      {/* 시간 입력 */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[12px] mb-1 text-text-600">시작 시간</div>
          {doc && yStartTextRef.current ? (
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
              <CollaborativeTimeInput
                yText={yStartTextRef.current}
                type="time"
                step={60}
                placeholder="예: 09:30"
                className="w-full bg-transparent text-text-500 text-xs focus:outline-none"
                onValidatedChange={(hhmm) => syncCanonical('start', hhmm)}
                onInvalid={() =>
                  onToast({
                    variant: 'warning',
                    title: '입력 형식 확인',
                    message: 'HH:MM 형식으로 입력하세요.',
                  })
                }
              />
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
              <input
                type="time"
                step={60}
                value={fallbackStart}
                onChange={(e) => setFallbackStart(e.currentTarget.value)}
                onBlur={() => {
                  if (!isValidHHMM(fallbackStart)) {
                    onToast({
                      variant: 'warning',
                      title: '입력 형식 확인',
                      message: 'HH:MM 형식으로 입력하세요.',
                    })
                    setFallbackStart(toTimeFromAny(schedule.start_time))
                    return
                  }
                  const datePart = schedule.start_time.slice(0, 10)
                  onUpdateTime(rawKey, realIndex, {
                    startTimeLocal: `${datePart}T${fallbackStart}`,
                    offsetHHMM: fallbackOffset || null,
                  })
                }}
                className="w-full bg-transparent text-text-500 text-xs focus:outline-none"
              />
            </div>
          )}
        </div>

        <div>
          <div className="text-[12px] mb-1 text-text-600">예정 소요시간</div>
          {doc && yOffsetTextRef.current ? (
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
              <CollaborativeTimeInput
                yText={yOffsetTextRef.current}
                type="duration"
                step={60}
                placeholder="예: 01:30"
                className="w-full bg-transparent text-text-500 text-xs focus:outline-none"
                onValidatedChange={(hhmm) => syncCanonical('offset', hhmm)}
                onInvalid={() =>
                  onToast({
                    variant: 'warning',
                    title: '입력 형식 확인',
                    message: 'HH:MM 형식으로 입력하세요.',
                  })
                }
              />
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
              <input
                type="time"
                step={60}
                value={fallbackOffset}
                onChange={(e) => setFallbackOffset(e.currentTarget.value)}
                onBlur={() => {
                  const norm = normalizeOffsetToHHMM(fallbackOffset)
                  if (!isValidHHMM(norm)) {
                    onToast({
                      variant: 'warning',
                      title: '입력 형식 확인',
                      message: 'HH:MM 형식으로 입력하세요.',
                    })
                    setFallbackOffset(normalizeOffsetToHHMM(schedule.offset_time))
                    return
                  }
                  const datePart = schedule.start_time.slice(0, 10)
                  const timePart = fallbackStart || toTimeFromAny(schedule.start_time)
                  onUpdateTime(rawKey, realIndex, {
                    startTimeLocal: `${datePart}T${timePart}`,
                    offsetHHMM: norm,
                  })
                }}
                className="w-full bg-transparent text-text-500 text-xs focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* 고급 편집 */}
      {isEditing ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded border border-slate-100 bg-slate-50/60 p-2">
          <label className="text-[11px] text-slate-500">start_time</label>
          <input
            value={editStart}
            onChange={(e) => onSetEditStart(e.target.value)}
            placeholder="YYYY-MM-DD-HH-MM"
            className="w-44 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-blue-400 focus:outline-none"
          />
          <label className="text-[11px] text-slate-500">offset_time</label>
          <input
            value={editOffset}
            onChange={(e) => onSetEditOffset(e.target.value)}
            placeholder="HH:MM"
            className="w-24 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-blue-400 focus:outline-none"
          />
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="rounded bg-blue-500 px-3 py-1 text-[11px] font-semibold text-white hover:bg-blue-600"
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
              className="rounded border border-slate-200 px-3 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
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
