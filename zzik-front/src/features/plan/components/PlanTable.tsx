import { useState } from 'react'
import { cn } from '@/shared/utils/cn'
import type { PlanPlace } from '../types/plan'
import CollaborativeTextarea from './CollaborativeTextarea'

interface PlanTableProps {
  places: PlanPlace[]
  onUpdate: (id: string, data: Partial<PlanPlace>) => void
  onRemove: (id: string) => void
  onMove: (from: number, to: number) => void
}

const PlanTable = ({ places, onUpdate, onRemove, onMove }: PlanTableProps) => {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

  const handleTimeChange = (id: string, field: 'startTime' | 'endTime', value: string) => {
    onUpdate(id, { [field]: value || undefined })
  }

  const handleDragStart = (index: number) => (event: React.DragEvent<HTMLTableRowElement>) => {
    setDraggingIndex(index)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (event: React.DragEvent<HTMLTableRowElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (index: number) => (event: React.DragEvent<HTMLTableRowElement>) => {
    event.preventDefault()
    const fromData = event.dataTransfer.getData('text/plain')
    const from = draggingIndex ?? Number.parseInt(fromData, 10)
    if (Number.isNaN(from) || from === index) {
      setDraggingIndex(null)
      return
    }
    onMove(from, index)
    setDraggingIndex(null)
  }

  const handleDragEnd = () => {
    setDraggingIndex(null)
  }

  return (
    <div className="h-full overflow-auto rounded-2xl border border-slate-200 bg-white shadow-lg">
      <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="border-b border-slate-200 px-4 py-3 font-semibold">#</th>
            <th className="border-b border-slate-200 px-4 py-3 font-semibold">장소</th>
            <th className="border-b border-slate-200 px-4 py-3 font-semibold">주소</th>
            <th className="border-b border-slate-200 px-4 py-3 font-semibold">시작</th>
            <th className="border-b border-slate-200 px-4 py-3 font-semibold">종료</th>
            <th className="border-b border-slate-200 px-4 py-3 font-semibold">활동 메모</th>
            <th className="border-b border-slate-200 px-4 py-3 font-semibold">상세 주소</th>
            <th className="border-b border-slate-200 px-4 py-3 font-semibold">관리</th>
          </tr>
        </thead>
        <tbody>
          {places.map((place, index) => (
            <tr
              key={place.id}
              draggable
              onDragStart={handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={handleDrop(index)}
              onDragEnd={handleDragEnd}
              className={cn(
                'border-b border-slate-100 transition',
                draggingIndex === index ? 'bg-blue-50' : 'hover:bg-slate-50'
              )}
            >
              <td className="cursor-grab px-4 py-3 align-top text-xs font-semibold text-slate-500">
                {index + 1}
              </td>
              <td className="px-4 py-3 align-top text-sm font-semibold text-slate-800">
                <div>{place.name}</div>
              </td>
              <td className="px-4 py-3 align-top text-xs text-slate-400">{place.address}</td>
              <td className="px-4 py-3 align-top">
                <input
                  type="datetime-local"
                  value={place.startTime ?? ''}
                  onChange={(event) => handleTimeChange(place.id, 'startTime', event.target.value)}
                  className="w-44 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </td>
              <td className="px-4 py-3 align-top">
                <input
                  type="datetime-local"
                  value={place.endTime ?? ''}
                  onChange={(event) => handleTimeChange(place.id, 'endTime', event.target.value)}
                  className="w-44 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </td>
              <td className="px-4 py-3 align-top">
                <CollaborativeTextarea
                  value={place.activity ?? ''}
                  onChange={(value) => onUpdate(place.id, { activity: value || undefined })}
                  rows={2}
                  placeholder="활동 메모를 입력하세요."
                  className="w-52 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </td>
              <td className="px-4 py-3 align-top">
                <CollaborativeTextarea
                  value={place.detailAddress ?? ''}
                  onChange={(value) => onUpdate(place.id, { detailAddress: value || undefined })}
                  rows={2}
                  placeholder="상세 주소를 입력하세요."
                  className="w-52 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </td>
              <td className="px-4 py-3 align-top text-xs text-slate-400">
                <button
                  type="button"
                  onClick={() => onRemove(place.id)}
                  className="rounded-full border border-red-100 px-3 py-1 text-red-400 transition hover:border-red-300 hover:text-red-600"
                >
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {places.length === 0 ? (
        <div className="flex items-center justify-center border-t border-slate-200 bg-slate-50 px-4 py-6 text-xs text-slate-400">
          아직 추가된 장소가 없습니다. 왼쪽 패널에서 장소를 검색해 추가해 보세요.
        </div>
      ) : null}
    </div>
  )
}

export default PlanTable
