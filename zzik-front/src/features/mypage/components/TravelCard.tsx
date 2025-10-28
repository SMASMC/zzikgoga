// TravelCard.tsx
import { useState } from 'react'
import { TravelAddCardProps } from '../types/mypage'

const TravelCard = ({ title, date, img }: { title: string; date: string; img: string }) => {
  const [isButtonHovered, setIsButtonHovered] = useState(false)

  // TODO: 카드 클릭 시 실행할 함수 (여행 상세 페이지로 이동)
  const handleCardClick = () => {
    console.log('카드 클릭 - 여행 상세 페이지로 이동')
    // 여기에 여행 상세 페이지 이동 함수 추가 (예: navigate(`/trip/${id}`))
  }

  // TODO: 정산하기 버튼 클릭 시 실행할 함수
  const handleSettlementClick = (e: React.MouseEvent) => {
    e.stopPropagation() // 카드 클릭 이벤트 전파 방지
    console.log('정산하기 버튼 클릭 - 정산 페이지로 이동')
    // 여기에 정산 페이지 이동 함수 추가 (예: navigate(`/settlement/${id}`))
  }

  // TODO: 사진 버튼 클릭 시 실행할 함수
  const handlePhotoClick = (e: React.MouseEvent) => {
    e.stopPropagation() // 카드 클릭 이벤트 전파 방지
    console.log('사진 버튼 클릭 - 사진 갤러리로 이동')
    // 여기에 사진 갤러리 이동 함수 추가 (예: navigate(`/gallery/${id}`))
  }

  return (
    <div
      onClick={handleCardClick}
      className={`group bg-white rounded-3xl shadow-lg overflow-hidden w-72 p-5 flex flex-col cursor-pointer transition-all duration-300 ${
        !isButtonHovered ? 'hover:shadow-xl hover:scale-105' : ''
      }`}
    >
      <img src={img} alt={title} className="rounded-2xl h-48 object-cover mb-4" />
      <h3 className="font-bmjua text-text-500">{title}</h3>
      <p className="text-gray-500 text-sm mb-3">{date}</p>
      <div className="flex gap-2">
        <button
          onClick={handleSettlementClick}
          onMouseEnter={() => setIsButtonHovered(true)}
          onMouseLeave={() => setIsButtonHovered(false)}
          className="flex-1 bg-gradient-to-br from-point-500 to-main-700 text-white py-2 rounded-2xl hover:from-point-600 hover:to-main-800 hover:scale-110 transition-all"
        >
          정산하기
        </button>
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

// TravelAddCard.tsx
const TravelAddCard = ({ onCreateTravel }: TravelAddCardProps) => {
  return (
    <div
      onClick={onCreateTravel}
      className="group bg-white rounded-3xl w-72 h-[400px] shadow-lg flex flex-col justify-center items-center cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300"
    >
      <div className="bg-gradient-to-br from-hover-600 to-point-600 w-20 h-20 rounded-3xl flex justify-center items-center mb-6">
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
      <p className="text-gray-500 text-sm">새로운 추억을 만들어보세요</p>
    </div>
  )
}

export { TravelCard, TravelAddCard }
