// TravelCard.tsx
// 여행 생성 카드와 기존 여행 카드를 위한 컴포넌트

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TravelAddCardProps, TravelCardProps } from '../types/mypage'
import SolidButton from '@/components/atoms/SolidButton'
import { Camera } from 'lucide-react'
import { MediaService } from '@/features/memory/services/memoryService'
import { ToastDock } from '@/components/blocks/ToastDock'

const TravelCard = ({ tripId, title, date, img, startDate, endDate }: TravelCardProps) => {
  const navigate = useNavigate()
  const [isButtonHovered, setIsButtonHovered] = useState(false)
  const [imageSrc, setImageSrc] = useState(img || '/pwa-512x512.png')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<{
    open: boolean
    variant: 'success' | 'warning' | 'error' | 'hint'
    message: string
  }>({ open: false, variant: 'success', message: '' })

  // img prop 변경 시 imageSrc 업데이트
  useEffect(() => {
    setImageSrc(img || '/pwa-512x512.png')
  }, [img])

  const handleCardClick = () => {
    const travelMeta = { travelTitle: title, startDate, endDate }
    sessionStorage.setItem(`plan-meta-${tripId}`, JSON.stringify(travelMeta))
    navigate(`/plan/${tripId}`, { state: travelMeta })
  }

  const handleSettlementClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/cost/${tripId}`)
  }

  const handlePhotoClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/memory/${tripId}`)
  }

  const handleCameraButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    try {
      setUploading(true)
      console.log(
        'Uploading media files:',
        files.map((f) => ({ name: f.name, size: f.size }))
      )
      await MediaService.uploadMedia(String(tripId), files)
      e.target.value = ''

      // 업로드 성공 메시지 표시
      setToast({ open: true, variant: 'success', message: '사진이 업로드되었습니다.' })

      // MyPage에 새로고침 이벤트 발생
      window.dispatchEvent(new CustomEvent('travel-updated', { detail: { tripId } }))
    } catch (err) {
      console.error(err)
      setToast({ open: true, variant: 'error', message: '사진 업로드에 실패했습니다.' })
    } finally {
      setUploading(false)
    }
  }

  const handleImageError = () => setImageSrc('/pwa-512x512.png')

  const handleRootClick = () => {
    if (uploading) return
    handleCardClick()
  }

  return (
    <>
      <div
        onClick={handleRootClick}
        className={`group bg-white rounded-3xl shadow-lg overflow-hidden w-72 max-h-[38vh] min-h-[320px] p-4 flex flex-col cursor-pointer transition-all duration-300 ${
          !isButtonHovered ? 'hover:shadow-xl hover:scale-105' : ''
        }`}
      >
        <img
          src={imageSrc}
          alt={title}
          className="rounded-2xl h-[18vh] min-h-[140px] object-cover mb-3"
          onError={handleImageError}
        />
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-bmjua text-text-500 truncate">{title}</h3>
            <p className="text-gray-500 text-sm truncate">{date}</p>
          </div>
          <div className="shrink-0">
            <button
              type="button"
              onClick={handleCameraButtonClick}
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onMouseEnter={() => setIsButtonHovered(true)}
              onMouseLeave={() => setIsButtonHovered(false)}
              className="p-2 rounded-full border bg-white hover:bg-slate-50 text-slate-700 shadow-sm disabled:opacity-50"
              disabled={uploading}
              aria-label="사진 업로드"
            >
              <Camera size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        <div className="flex justify-center gap-2 mb-1.5">
          <SolidButton
            onClick={handleSettlementClick}
            onMouseEnter={() => setIsButtonHovered(true)}
            onMouseLeave={() => setIsButtonHovered(false)}
            className="flex-1 transition-all rounded-full text-sm py-2"
          >
            정산하기
          </SolidButton>
        </div>
        <div className="flex justify-end gap-2">
          <SolidButton
            onClick={handlePhotoClick}
            onMouseEnter={() => setIsButtonHovered(true)}
            onMouseLeave={() => setIsButtonHovered(false)}
            className="flex-1 transition-all rounded-full text-sm py-2"
          >
            기록하기
          </SolidButton>
        </div>
      </div>

      {/* Toast */}
      <ToastDock
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        onClose={() => setToast({ ...toast, open: false })}
      />
    </>
  )
}

// TravelAddCard (여행 추가하는 카드)
const TravelAddCard = ({ onCreateTravel }: TravelAddCardProps) => {
  return (
    <div
      onClick={onCreateTravel}
      className="group backdrop-blur-md bg-white/30 border border-white/40 rounded-3xl w-72 max-h-[38vh] min-h-[320px] shadow-xl flex flex-col justify-center items-center cursor-pointer hover:shadow-2xl hover:scale-105 hover:bg-white transition-all duration-300"
    >
      <div className="bg-gradient-to-br from-hover-600 to-point-600 w-16 h-16 rounded-3xl flex justify-center items-center mb-4 shadow-lg">
        <svg
          className="w-10 h-10 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="3"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <h3 className="font-bmjua text-text-500 text-base mb-2">여행 시작하기</h3>
      <p className="text-text-600 text-sm font-medium">바로 추억을 만들어보아요</p>
    </div>
  )
}

export { TravelCard, TravelAddCard }
