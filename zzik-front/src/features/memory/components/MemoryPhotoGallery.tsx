import { useCallback, useEffect, useMemo, useState } from 'react'
import { MemoryPhotoService } from '@/features/memory/services/memoryService'
import { TripPhoto } from '@/features/memory/types/memory'
import { ImageWithFallback } from '@/components/atoms/ImageWithFallback'

type Props = {
  tripId: string
}

const MemoryPhotoGallery = ({ tripId }: Props) => {
  const [photos, setPhotos] = useState<TripPhoto[]>([])
  const [nextCursor, setNextCursor] = useState<number | null | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState<number>(12)
  const [page, setPage] = useState<number>(0) // 0-based

  const fetchPage = async (cursor?: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await MemoryPhotoService.getTripPhotos(tripId, cursor)
      setPhotos(prev => {
        const merged: TripPhoto[] = [...prev, ...res.photos]
        const map = new Map<number, TripPhoto>()
        merged.forEach(p => map.set(p.id, { ...p }))
        return Array.from(map.values())
      })
      setNextCursor(res.pageInfo?.nextCursor ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load photos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPhotos([])
    setNextCursor(undefined)
    setPage(0)
    fetchPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId])

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, p: TripPhoto) => {
    const md = `![image](${p.s3Url})`
    e.dataTransfer.setData('text/plain', md)
    e.dataTransfer.setData('text/zzik-image-url', p.s3Url)
    e.dataTransfer.effectAllowed = 'copy'
  }, [])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(photos.length / pageSize)), [photos.length, pageSize])
  const start = page * pageSize
  const end = start + pageSize
  const pagePhotos = photos.slice(start, end)

  const goPrev = () => setPage(p => Math.max(0, p - 1))
  const goNext = async () => {
    const nextPage = page + 1
    const needed = (nextPage + 1) * pageSize
    if (photos.length < needed && nextCursor) {
      await fetchPage(nextCursor)
    }
    setPage(p => ((p + 1) * pageSize <= photos.length || nextCursor ? p + 1 : p))
  }

  return (
    <div className="h-full p-4 flex flex-col min-h-0">
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">페이지 크기</span>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={pageSize}
            onChange={e => {
              const size = Number(e.target.value)
              setPageSize(size)
              setPage(0)
            }}
          >
            <option value={8}>8</option>
            <option value={12}>12</option>
            <option value={16}>16</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 text-sm border rounded disabled:opacity-50" disabled={page === 0} onClick={goPrev}>
            이전
          </button>
          <span className="text-sm text-slate-600">{page + 1} / {totalPages}{nextCursor ? '+' : ''}</span>
          <button
            className="px-2 py-1 text-sm border rounded disabled:opacity-50"
            onClick={goNext}
            disabled={loading || (!nextCursor && end >= photos.length)}
          >
            다음
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-2 gap-3">
          {pagePhotos.map(p => (
            <div
              key={p.id}
              className="w-full aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-grab active:cursor-grabbing"
              draggable
              onDragStart={e => handleDragStart(e, p)}
              title="드래그하여 에디터에 넣기"
            >
              <ImageWithFallback src={p.s3Url} alt={`photo-${p.id}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MemoryPhotoGallery
