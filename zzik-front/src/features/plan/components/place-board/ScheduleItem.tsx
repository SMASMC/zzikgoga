import type { RefObject } from 'react'
import * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'
import YTextEditor from '../YTextEditor'
import ScheduleMemoEditor from '../ScheduleMemoEditor'
import { toTime, normalizeOffsetToHHMM, isValidHHMM, inputStartToIso } from '../../utils/time'
import type { YScheduleItem } from '../../hooks/useYTripDoc'

interface ScheduleItemProps {
  schedule: YScheduleItem
  selectedDateKey: string
  realIndex: number
  editingKey: string | null
  editStart: string
  editOffset: string
  doc: Y.Doc | null
  awareness: Awareness | null
  dragItemRef: RefObject<{ dateKey: string; index: number } | null>
  onDragStart: (dateKey: string, index: number) => void
  onDragEnd: () => void
  onDropWithinDate: (dateKey: string, index: number) => void
  onRemove: (dateKey: string, index: number) => void
  onUpdateTime: (
    dateKey: string,
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
  const isEditing = editingKey === `${selectedDateKey}:${realIndex}`

  // Get Y.Text for location name
  let yLocationName: Y.Text | null = null
  if (doc) {
    const schedulesMap = doc.getMap('schedules') as Y.Map<unknown>
    const yArr = schedulesMap.get(selectedDateKey) as Y.Array<Y.Map<unknown>> | undefined
    const yItem = yArr?.get(realIndex) as Y.Map<unknown> | undefined
    const location = yItem?.get('location')
    if (location instanceof Y.Map) {
      const name = location.get('name')
      if (name instanceof Y.Text) yLocationName = name
    }
  }

  return (
    <li
      className="rounded-xl border-2 border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
      draggable={!isEditing}
      onDragStart={() => onDragStart(selectedDateKey, realIndex)}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        if (!dragItemRef.current) return
        event.preventDefault()
      }}
      onDrop={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onDropWithinDate(selectedDateKey, realIndex)
      }}
    >
      {/* Header with location name and time */}
      <div className="flex items-center justify-between">
        {yLocationName ? (
          <div className="flex-1 min-w-0">
            <YTextEditor
              ytext={yLocationName}
              variant="plain"
              className="text-lg font-bold text-slate-800"
              singleLine={true}
              placeholder="장소 이름"
            />
          </div>
        ) : (
          <span className="text-lg font-bold text-slate-800">
            {schedule.location?.name || '일정'}
          </span>
        )}
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span className="font-semibold">{toTime(schedule.start_time)}</span>
          {schedule.offset_time ? (
            <span className="text-xs text-slate-500 font-medium">
              (+{normalizeOffsetToHHMM(schedule.offset_time)})
            </span>
          ) : null}
        </div>
      </div>

      {/* Delete button */}
      <div className="mt-2 flex flex-wrap items-end justify-end gap-2 text-[11px] text-slate-500">
        <button
          type="button"
          className="rounded-full border border-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-500 transition hover:border-red-300 hover:bg-red-50"
          onClick={() => onRemove(selectedDateKey, realIndex)}
        >
          삭제
        </button>
      </div>

      {/* Memo editor */}
      <div className="mt-1">
        {doc ? (
          <ScheduleMemoEditor
            doc={doc}
            awareness={awareness}
            dateKey={selectedDateKey}
            index={realIndex}
            fieldKey={`memo-${schedule.uid}`}
            initialText={schedule.memo}
          />
        ) : null}
      </div>

      {/* Location detail */}
      {schedule.location?.detail ? (
        <div className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">
          {schedule.location.detail}
        </div>
      ) : null}

      {/* Time inputs */}
      <div className="mt-2 flex w-full gap-3">
        <div className="w-1/2 min-w-0">
          <div className="text-[12px] mb-1 text-text-600">시간</div>
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
            <input
              type="datetime-local"
              defaultValue={schedule.start_time}
              onBlur={(e) => {
                const iso = e.currentTarget.value
                if (!iso) return
                onUpdateTime(selectedDateKey, realIndex, {
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
          <div className="text-[12px] mb-1 text-text-600">예정소요시간</div>
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
            <input
              type="text"
              placeholder="HH:MM"
              defaultValue={normalizeOffsetToHHMM(schedule.offset_time)}
              onBlur={(e) => {
                const v = e.currentTarget.value.trim()
                if (v === '') {
                  onUpdateTime(selectedDateKey, realIndex, {
                    offsetHHMM: null,
                  })
                  return
                }
                const off = normalizeOffsetToHHMM(v)
                if (!isValidHHMM(off)) {
                  onToast({
                    variant: 'warning',
                    title: '입력 형식 확인',
                    message: 'offset_time 형식은 HH:MM 입니다.',
                  })
                  return
                }
                onUpdateTime(selectedDateKey, realIndex, {
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

      {/* Advanced editing UI (hidden by default) */}
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
                const iso = inputStartToIso(editStart)
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
                onUpdateTime(selectedDateKey, realIndex, {
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
