import { useCallback, useEffect, useMemo, useState } from 'react'
import { MemoryPhotoService } from '@/features/memory/services/memoryService'
import { TripPhoto } from '@/features/memory/types/memory'
import { ImageWithFallback } from '@/components/atoms/ImageWithFallback'
import { DropdownSelect } from '@/components/blocks/DropdownSelect'

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
      setPhotos((prev) => {
        const merged: TripPhoto[] = [...prev, ...res.photos]
        const map = new Map<number, TripPhoto>()
        merged.forEach((p) => map.set(p.id, { ...p }))
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
    // 드래그 이미지 설정 (선택사항)
    if (e.currentTarget.querySelector('img')) {
      const img = e.currentTarget.querySelector('img') as HTMLImageElement
      if (img && img.complete) {
        e.dataTransfer.setDragImage(img, img.width / 2, img.height / 2)
      }
    }
  }, [])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(photos.length / pageSize)),
    [photos.length, pageSize]
  )
  const start = page * pageSize
  const end = start + pageSize
  const pagePhotos = photos.slice(start, end)

  const goPrev = () => setPage((p) => Math.max(0, p - 1))
  const goNext = async () => {
    const nextPage = page + 1
    const needed = (nextPage + 1) * pageSize
    if (photos.length < needed && nextCursor) {
      await fetchPage(nextCursor)
    }
    setPage((p) => ((p + 1) * pageSize <= photos.length || nextCursor ? p + 1 : p))
  }

  // 페이지 크기 옵션
  const pageSizeOptions = [
    { label: '8개', value: '8' },
    { label: '12개', value: '12' },
    { label: '16개', value: '16' },
  ]

  return (
    <div className="h-full p-4 flex flex-col min-h-0">
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

      {/* 페이지네이션 컨트롤 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 shrink-0">
        {/* 페이지 크기 선택 */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-sm font-bold text-text-500 whitespace-nowrap">페이지 크기</span>
          <div className="w-28">
            <DropdownSelect
              options={pageSizeOptions}
              value={String(pageSize)}
              onChange={(value) => {
                const size = Number(value)
                setPageSize(size)
                setPage(0)
              }}
              placeholder="선택"
              className="w-full"
            />
          </div>
        </div>

        {/* 페이지 네비게이션 */}
        <div className="flex items-center gap-2 justify-center sm:justify-end">
          <button
            className="inline-flex items-center justify-center whitespace-nowrap font-bmjua px-4 py-2 text-sm rounded-full bg-gradient-to-br from-gray-100 to-gray-200 text-text-500 hover:from-gray-200 hover:to-gray-300 shadow-md transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 disabled:hover:scale-100"
            disabled={page === 0}
            onClick={goPrev}
          >
            ← 이전
          </button>

          <div className="flex items-center gap-1 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full px-4 py-2 shadow-sm min-w-[80px] justify-center">
            <span className="text-sm font-bold text-blue-600">
              {page + 1}
            </span>
            <span className="text-sm text-text-600">/</span>
            <span className="text-sm font-bold text-text-500">
              {totalPages}
              {nextCursor ? '+' : ''}
            </span>
          </div>

          <button
            className="inline-flex items-center justify-center whitespace-nowrap font-bmjua px-4 py-2 text-sm rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white hover:from-blue-500 hover:to-blue-700 shadow-md transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 disabled:hover:scale-100"
            onClick={goNext}
            disabled={loading || (!nextCursor && end >= photos.length)}
          >
            다음 →
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-2 gap-3">
          {pagePhotos.map((p) => (
            <div
              key={p.id}
              className="w-full aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-grab active:cursor-grabbing"
              draggable
              onDragStart={(e) => handleDragStart(e, p)}
              title="드래그하여 에디터에 넣기"
            >
              <ImageWithFallback
                src={p.s3Url}
                alt={`photo-${p.id}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MemoryPhotoGallery
