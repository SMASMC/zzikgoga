import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useYTripDoc } from '../hooks/useYTripDoc'
import * as Y from 'yjs'
import YTextEditor from './YTextEditor'
import { YText } from 'node_modules/yjs/dist/src/internals'

const toTime = (isoLocal: string) =>
  isoLocal?.length >= 16 ? isoLocal.slice(11, 16) : isoLocal || ''

const SchedulePanel = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const roomId = useMemo(
    () => (tripId && tripId.trim().length > 0 ? `trip-${tripId.trim()}` : 'trip-default'),
    [tripId]
  )
  const { schedulesByDate, tripInfo, doc } = useYTripDoc(roomId)

  let titleYText: Y.Text | null = null
  if (doc) {
    const t = (doc.getMap('tripInfo') as Y.Map<YText>).get('title')
    if (t instanceof Y.Text) titleYText = t
  }

  return (
    <aside className="flex w-full flex-col gap-4 border-r border-slate-200 bg-white p-4 md:w-1/4">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-800">여행 일정</h2>
        <div className="min-w-0 flex-1">
          {titleYText ? (
            <YTextEditor ytext={titleYText} />
          ) : (
            <span className="text-xs text-slate-400">Trip #{tripInfo.id ?? ''}</span>
          )}
        </div>
      </header>

      {Object.keys(schedulesByDate).length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">
          아직 등록된 일정이 없습니다. 일정을 등록하세요.
        </div>
      ) : (
        <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto rounded-lg border border-slate-200 p-3">
          {Object.entries(schedulesByDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, items]) => (
              <div key={date} className="rounded-md border border-slate-100 bg-white p-2">
                <div className="mb-1 text-xs font-semibold text-slate-600">{date}</div>
                {items.length === 0 ? (
                  <div className="text-xs text-slate-400">??�� ?�음</div>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {items
                      .slice()
                      .sort((a, b) => a.start_time.localeCompare(b.start_time))
                      .map((it, idx) => {
                        let yMemo: Y.Text | null = null
                        if (doc) {
                          const yMap = doc.getMap('schedules') as Y.Map<unknown>
                          const yArr = yMap.get(date) as Y.Array<Y.Map<unknown>> | undefined
                          const yItem = yArr?.get(idx) as Y.Map<unknown> | undefined
                          const m = yItem?.get('memo')
                          if (m instanceof Y.Text) yMemo = m
                        }
                        return (
                          <li
                            key={`${date}-${it.id ?? 'n'}-${idx}`}
                            className="rounded border border-slate-100 bg-white p-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-800">
                                {it.location?.name || '?�정'}
                              </span>
                              <span className="text-xs text-slate-500">
                                {toTime(it.start_time)}
                              </span>
                            </div>
                            {yMemo ? (
                              <div className="mt-1">
                                <YTextEditor ytext={yMemo} />
                              </div>
                            ) : null}
                            {it.location?.detail ? (
                              <div className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">
                                {it.location.detail}
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
      )}
    </aside>
  )
}

export default SchedulePanel
