// TravelCard.tsx
// 여행 생성 카드와 기존 여행 카드를 위한 컴포넌트

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TravelAddCardProps, TravelCardProps } from '../types/mypage'
import SolidButton from '@/components/atoms/SolidButton'

const TravelCard = ({ tripId, title, date, img }: TravelCardProps) => {
  const navigate = useNavigate()
  const [isButtonHovered, setIsButtonHovered] = useState(false)
  const [imageSrc, setImageSrc] = useState(img || '/pwa-512x512.png')

  // 카드 클릭 시 여행 계획 페이지로 이동
  const handleCardClick = () => {
    console.log(`카드 클릭 - 여행 계획 페이지로 이동 (tripId: ${tripId})`)
    navigate(`/plan/${tripId}`)
  }

  // TODO: 정산하기 버튼 클릭 시 실행할 함수
  const handleSettlementClick = (e: React.MouseEvent) => {
    e.stopPropagation() // 카드 클릭 이벤트 전파 방지
    console.log(`정산하기 버튼 클릭 - 정산 페이지로 이동 (tripId: ${tripId})`)
    // 여기에 정산 페이지 이동 함수 추가 (예: navigate(`/settlement/${tripId}`))
  }

  // TODO: 사진 버튼 클릭 시 실행할 함수
  const handlePhotoClick = (e: React.MouseEvent) => {
    e.stopPropagation() // 카드 클릭 이벤트 전파 방지
    console.log(`사진 버튼 클릭 - 사진 갤러리로 이동 (tripId: ${tripId})`)
    // 여기에 사진 갤러리 이동 함수 추가 (예: navigate(`/gallery/${tripId}`))
  }

  // 이미지 로드 실패 시 기본 이미지로 대체
  const handleImageError = () => {
    setImageSrc('/pwa-512x512.png')
  }

  return (
    <div
      onClick={handleCardClick}
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
      <h3 className="font-bmjua text-text-500">{title}</h3>
      <p className="text-gray-500 text-sm mb-3">{date}</p>
      <div className="flex gap-2">
        <SolidButton
          onClick={handleSettlementClick}
          onMouseEnter={() => setIsButtonHovered(true)}
          onMouseLeave={() => setIsButtonHovered(false)}
          className="flex-1 bg-gradient-to-br from-point-500 to-main-700 text-white py-2 rounded-2xl hover:from-point-600 hover:to-main-800 hover:scale-110 transition-all"
        >
          정산하기
        </SolidButton>
        <button
          onClick={handlePhotoClick}
          onMouseEnter={() => setIsButtonHovered(true)}
          onMouseLeave={() => setIsButtonHovered(false)}
          className="w-12 bg-gradient-to-br from-hover-500 to-background-700 rounded-2xl flex justify-center items-center hover:from-hover-600 hover:to-background-800 hover:scale-110 transition-all"
        >
          📷
        </button>
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
      <p className="text-text-600 text-sm font-medium">새로운 추억을 만들어보세요</p>
    </div>
  )
}

export { TravelCard, TravelAddCard }
