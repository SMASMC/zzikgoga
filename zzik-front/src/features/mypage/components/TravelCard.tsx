// TravelCard.tsx
// 여행 생성 카드와 기존 여행 카드를 위한 컴포넌트

import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TravelAddCardProps, TravelCardProps } from '../types/mypage'
import SolidButton from '@/components/atoms/SolidButton'
import { Camera } from 'lucide-react'
import { MediaService } from '@/features/memory/services/memoryService'

const TravelCard = ({ tripId, title, date, img, startDate, endDate }: TravelCardProps) => {
  const navigate = useNavigate()
  const [isButtonHovered, setIsButtonHovered] = useState(false)
  const [imageSrc, setImageSrc] = useState(img || '/pwa-512x512.png')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

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
    } catch (err) {
      console.error(err)
      alert('사진 업로드에 실패했습니다.')
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
    <div
      onClick={handleRootClick}
      className={`group bg-white rounded-3xl shadow-lg overflow-hidden w-72 p-5 flex flex-col cursor-pointer transition-all duration-300 ${
        !isButtonHovered ? 'hover:shadow-xl hover:scale-105' : ''
      }`}
    >
      <img
        src={imageSrc}
        alt={title}
        className="rounded-2xl h-48 object-cover mb-4"
        onError={handleImageError}
      />
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bmjua text-text-500">{title}</h3>
          <p className="text-gray-500 text-sm">{date}</p>
        </div>
        <div>
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
      <div className="flex justify-center gap-2 mb-2">
        <SolidButton
          onClick={handleSettlementClick}
          onMouseEnter={() => setIsButtonHovered(true)}
          onMouseLeave={() => setIsButtonHovered(false)}
          className="flex-1 transition-all rounded-full"
        >
          정산하기
        </SolidButton>
      </div>
      <div className="flex justify-end gap-2">
        <SolidButton
          onClick={handlePhotoClick}
          onMouseEnter={() => setIsButtonHovered(true)}
          onMouseLeave={() => setIsButtonHovered(false)}
          className="flex-1 transition-all rounded-full"
        >
          기록하기
        </SolidButton>
      </div>
    </div>
  )
}

// TravelAddCard (여행 추가하는 카드)
const TravelAddCard = ({ onCreateTravel }: TravelAddCardProps) => {
  return (
    <div
      onClick={onCreateTravel}
      className="group backdrop-blur-md bg-white/30 border border-white/40 rounded-3xl w-72 h-[400px] shadow-xl flex flex-col justify-center items-center cursor-pointer hover:shadow-2xl hover:scale-105 hover:bg-white transition-all duration-300"
    >
      <div className="bg-gradient-to-br from-hover-600 to-point-600 w-20 h-20 rounded-3xl flex justify-center items-center mb-6 shadow-lg">
        <svg
          className="w-12 h-12 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="3"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <h3 className="font-bmjua text-text-500 text-lg mb-2">여행 시작하기</h3>
      <p className="text-text-600 text-sm font-medium">바로 추억을 만들어보아요</p>
    </div>
  )
}

export { TravelCard, TravelAddCard }
