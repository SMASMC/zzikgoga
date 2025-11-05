import SolidButton from '@/components/atoms/SolidButton'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useYTripDoc } from '../hooks/useYTripDoc'

interface PlaceModalProps {
  onClose: () => void
  place: {
    name: string
    full_address?: string
    latitude?: number | null
    longitude?: number | null
  }
}

const PlaceModal = ({ onClose, place }: PlaceModalProps) => {
  const [startDateTime, setStartDateTime] = useState<string>('')
  const [endDateTime, setEndDateTime] = useState<string>('')
  const [activity, setActivity] = useState<string>('')
  const [detailAddress, setDetailAddress] = useState<string>('')

  const [searchParams] = useSearchParams()
  const planId = searchParams.get('planId')
  const roomId = useMemo(
    () => (planId && planId.trim().length > 0 ? `trip-${planId.trim()}` : 'trip-3'),
    [planId]
  )
  const { addSchedule } = useYTripDoc(roomId)

  const handleSubmit = () => {
    if (!startDateTime || !endDateTime) {
      alert('날짜와 시간을 선택해주세요.')
      return
    }
    addSchedule({
      startTimeLocal: startDateTime,
      endTimeLocal: endDateTime,
      memo: activity,
      location: {
        name: place.name,
        full_address: place.full_address ?? '',
        detail: detailAddress,
        latitude: place.latitude ?? null,
        longitude: place.longitude ?? null,
      },
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
      <div className="w-full max-w-md sm:max-w-lg bg-gradient-to-br from-white via-background-500 to-background-600 rounded-3xl shadow-xl p-6 sm:p-8 font-bmjua relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-600 hover:text-gray-700 text-3xl leading-none hover:scale-110 transition-transform"
        >
          ×
        </button>

        <h2 className="text-xl sm:text-2xl text-text-500 mb-4 sm:mb-6 font-bold">장소 추가하기</h2>

        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg mb-2 sm:mb-3 text-text-600">장소</h3>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm">
            <input
              type="text"
              value={place.name}
              readOnly
              className="w-full bg-transparent text-text-500 text-sm sm:text-base cursor-not-allowed focus:outline-none"
            />
          </div>
        </div>

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

        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg mb-2 sm:mb-3 text-text-600">종료 시간</h3>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm">
            <input
              type="datetime-local"
              value={endDateTime}
              onChange={(e) => setEndDateTime(e.target.value)}
              className="w-full bg-transparent text-text-500 text-sm sm:text-base focus:outline-none"
            />
          </div>
        </div>

        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg mb-2 sm:mb-3 text-text-600">활동 메모</h3>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm">
            <textarea
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder="예) 체크인, 점심 식사, 관광 등"
              className="w-full bg-transparent text-text-500 text-sm sm:text-base h-24 resize-none focus:outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

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

        <div className="flex justify-center">
          <SolidButton
            onClick={handleSubmit}
            className="w-full sm:w-auto bg-gradient-to-br from-hover-600 to-point-600 text-white text-base sm:text-lg px-8 sm:px-12 py-2.5 sm:py-3 rounded-full shadow-lg hover:scale-105 hover:from-point-600 hover:to-main-800 transition-all font-bold"
          >
            장소 추가하기
          </SolidButton>
        </div>
      </div>
    </div>
  )
}

export default PlaceModal
