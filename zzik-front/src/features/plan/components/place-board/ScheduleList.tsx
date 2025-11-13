import type { RefObject } from 'react'
import * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'
import ScheduleItem from './ScheduleItem'
import type { YScheduleItem } from '../../hooks/useYTripDoc'

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
  onRemoveSchedule: (dateKey: string, index: number) => void
  onUpdateScheduleTime: (
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
  return (
    <div className="rounded-xl border-2 border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 text-base font-bold text-slate-700">{selectedDateKey}</div>

      {schedules.length === 0 ? (
        <div className="text-sm text-slate-400">일정이 없습니다.</div>
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
            .map(({ it, originalIndex }) => {
              // Use actual Y.Array index (accurate even if items are deleted)
              const realIndex = it.yArrayIndex ?? originalIndex
              const listKey = `${selectedDateKey}-${it.id ?? 'n'}-${originalIndex}`

              return (
                <ScheduleItem
                  key={listKey}
                  schedule={it}
                  selectedDateKey={selectedDateKey}
                  realIndex={realIndex}
                  editingKey={editingKey}
                  editStart={editStart}
                  editOffset={editOffset}
                  doc={doc}
                  awareness={awareness}
                  dragItemRef={dragItemRef}
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
              )
            })}
        </ul>
      )}
    </div>
  )
}

export default ScheduleList
