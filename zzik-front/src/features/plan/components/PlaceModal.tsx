// PlaceModal.tsx
// 장소 추가 버튼 눌렀을 때 정보 입력하는 모달
// 해야 할 일
// 1. 각 Input에 대해 디자인 바꾸기(이건 Input 컴포넌트에서 처리할 것)
// 2. 시작 시간 끝 시간 모두 시스템 날짜 기준 이전 날짜 선택 금지
// 2-1. 끝 시간이 시작 시간 이전이면 끝 시간을 시작 시간으로 설정
// 2-2. 시작 시간이 끝 시간 이후이면 시작 시간을 끝 시간으로 설정
// 3. 저장 버튼 눌렀을 때 API 연결
// 4. 저장 버튼 눌렀을 때 모달이 닫히도록 설정

import SolidButton from '@/components/atoms/SolidButton'
import { useState } from 'react'

interface PlaceModalProps {
  onClose: () => void
  placeName: string
}

const PlaceModal = ({ onClose, placeName }: PlaceModalProps) => {
  const [startDateTime, setStartDateTime] = useState<string>('')
  const [endDateTime, setEndDateTime] = useState<string>('')
  const [activity, setActivity] = useState<string>('')
  const [detailAddress, setDetailAddress] = useState<string>('')

  const handleSubmit = () => {
    if (!startDateTime || !endDateTime) {
      alert('날짜를 선택해주세요.')
      return
    }
    const placeData = {
      name: placeName,
      start_time: startDateTime,
      end_time: endDateTime,
      activity,
      detail: detailAddress,
    }
    // TODO: plan.ts에서 api 연결하기
    console.log('전송할 데이터:', placeData)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
      <div className="w-full max-w-md sm:max-w-lg bg-gradient-to-br from-white via-background-500 to-background-600 rounded-3xl shadow-xl p-6 sm:p-8 font-bmjua relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-600 hover:text-gray-700 text-3xl leading-none hover:scale-110 transition-transform"
        >
          ✕
        </button>

        {/* 제목 */}
        <h2 className="text-xl sm:text-2xl text-text-500 mb-4 sm:mb-6 font-bold">장소 추가하기</h2>

        {/* 장소명 (읽기 전용) */}
        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg mb-2 sm:mb-3 text-text-600">장소명</h3>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm">
            <input
              type="text"
              value={placeName}
              readOnly
              className="w-full bg-transparent text-text-500 text-sm sm:text-base cursor-not-allowed focus:outline-none"
            />
          </div>
        </div>

        {/* 시작 시간 */}
        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg mb-2 sm:mb-3 text-text-600">시작 시간</h3>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm">
            <input
              type="datetime-local"
              value={startDateTime}
              onChange={(e) => setStartDateTime(e.target.value)}
              className="w-full bg-transparent text-text-500 text-sm sm:text-base focus:outline-none"
            />
          </div>
        </div>

        {/* 끝 시간 */}
        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg mb-2 sm:mb-3 text-text-600">끝 시간</h3>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm">
            <input
              type="datetime-local"
              value={endDateTime}
              onChange={(e) => setEndDateTime(e.target.value)}
              className="w-full bg-transparent text-text-500 text-sm sm:text-base focus:outline-none"
            />
          </div>
        </div>

        {/* 활동 내용 */}
        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg mb-2 sm:mb-3 text-text-600">활동 내용</h3>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm">
            <textarea
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder="예: 숙소 체크인, 점심 식사, 관광 등"
              className="w-full bg-transparent text-text-500 text-sm sm:text-base h-24 resize-none focus:outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* 상세 주소 */}
        <div className="mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg mb-2 sm:mb-3 text-text-600">상세 주소</h3>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm">
            <input
              type="text"
              value={detailAddress}
              onChange={(e) => setDetailAddress(e.target.value)}
              placeholder="상세 주소를 입력해주세요."
              className="w-full bg-transparent text-text-500 text-sm sm:text-base focus:outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* 저장 버튼 */}
        <div className="flex justify-center">
          <SolidButton
            onClick={handleSubmit}
            className="w-full sm:w-auto bg-gradient-to-br from-hover-600 to-point-600 text-white text-base sm:text-lg px-8 sm:px-12 py-2.5 sm:py-3 rounded-full shadow-lg hover:scale-105 hover:from-point-600 hover:to-main-800 transition-all font-bold"
          >
            장소 저장하기
          </SolidButton>
        </div>
      </div>
    </div>
  )
}

export default PlaceModal
