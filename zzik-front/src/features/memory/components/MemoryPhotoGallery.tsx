import { useCallback, useEffect, useState } from 'react'
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
    fetchPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId])

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, p: TripPhoto) => {
    const md = `![image](${p.s3Url})`
    e.dataTransfer.setData('text/plain', md)
    e.dataTransfer.setData('text/zzik-image-url', p.s3Url)
    e.dataTransfer.effectAllowed = 'copy'
  }, [])

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 custom-scrollbar">
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        {photos.map(p => (
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
      <div className="flex justify-center py-2">
        {nextCursor ? (
          <button
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
            onClick={() => fetchPage(nextCursor)}
            disabled={loading}
          >
            더 보기
          </button>
        ) : (
          <span className="text-xs text-gray-400">모든 사진을 불러왔어요</span>
        )}
      </div>
    </div>
  )
}

export default MemoryPhotoGallery
