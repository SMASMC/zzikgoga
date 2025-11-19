// CreateTravelModal.tsx
// 여행 생성 버튼 눌렀을 때 정보 입력하는 모달

import { useState } from 'react'
import Calendar from '@components/atoms/Calendar'
import CloseButton from '@/components/atoms/CloseButton'
import { ToastDock } from '@/components/blocks/ToastDock'
import { CreateTravelRequest } from '../types/mypage'
import { TravelService } from '../services/travelService'

const CreateTravelModal = ({ onClose }: { onClose: () => void }) => {
  // const [companion, setCompanion] = useState<string[]>([])
  // const [maleCount, setMaleCount] = useState(0)
  // const [femaleCount, setFemaleCount] = useState(0)
  // const [theme, setTheme] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [showCalendar, setShowCalendar] = useState(false)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [toast, setToast] = useState<{
    variant: 'success' | 'warning' | 'error'
    message: string
  } | null>(null)

  // const handleCompanionToggle = (label: string) => {
  //   setCompanion((prev) =>
  //     prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label]
  //   )
  // }

  // const handleThemeToggle = (tag: string) => {
  //   setTheme((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  // }

  const handleDateSelect = (start: Date, end: Date) => {
    setStartDate(start)
    setEndDate(end)
    setShowCalendar(false)
  }

  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 동행자 문자열을 ID로 매핑
  // const companionToId = (label: string): number => {
  //   const mapping: Record<string, number> = {
  //     '연인 ∙ 배우자': 1,
  //     친구: 2,
  //     '지인 ∙ 동료': 3,
  //     혼자: 4,
  //     아이: 5,
  //     부모님: 6,
  //     기타: 7,
  //   }
  //   return mapping[label] || 0
  // }

  // 테마 문자열을 ID로 매핑
  // const themeToId = (tag: string): number => {
  //   const mapping: Record<string, number> = {
  //     '#카페투어': 1,
  //     '#도심 속 휴식': 2,
  //     '#드라이브': 3,
  //     '#감성': 4,
  //     '#먹방': 5,
  //     '#캠핑': 6,
  //     '#힐링': 7,
  //     '#즉흥': 8,
  //     '#기념일': 9,
  //   }
  //   return mapping[tag] || 0
  // }

  // 여행 생성 버튼 클릭 핸들러
  const handleCreateTravel = () => {
    // 유효성 검사
    // if (companion.length === 0) {
    //   setToast({ variant: 'warning', message: '누구와 함께 가는지 선택해주세요.' })
    //   return
    // }
    // if (maleCount + femaleCount === 0) {
    //   setToast({ variant: 'warning', message: '여행 인원을 선택해주세요.' })
    //   return
    // }
    if (!title) {
      setToast({ variant: 'warning', message: '여행 제목을 입력해주세요.' })
      return
    }
    if (!startDate || !endDate) {
      setToast({ variant: 'warning', message: '여행 날짜를 선택해주세요.' })
      return
    }
    // if (theme.length === 0) {
    //   setToast({ variant: 'warning', message: '여행 테마를 선택해주세요.' })
    //   return
    // }

    // API로 전송할 데이터 준비 (CreateTravelRequest 형식)
    const travelData: CreateTravelRequest = {
      title: title, // 프론트 default 값
      start_date: formatDate(startDate), // DATE 형식: YYYY-MM-DD
      end_date: formatDate(endDate), // DATE 형식: YYYY-MM-DD
      male_count: 1, // TINYINT
      female_count: 1, // TINYINT
      companion_id: [1],
      thema_id: [1],
    }

    // TravelService를 통해 여행 생성
    TravelService.createTravel(travelData)
      .then((response) => {
        console.log('여행 생성 성공:', response)
        setToast({ variant: 'success', message: '여행이 생성되었습니다!' })
        onClose()
      })
      .catch((error) => {
        console.error('여행 생성 실패:', error)
        setToast({ variant: 'error', message: '여행 생성에 실패했습니다. 다시 시도해주세요.' })
      })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
      <ToastDock
        open={Boolean(toast)}
        variant={toast?.variant ?? 'hint'}
        title="알림"
        message={toast?.message ?? ''}
        autoCloseMs={3000}
        offsetPx={24}
        onClose={() => setToast(null)}
      />
      <div className="w-full max-w-md sm:max-w-lg bg-gradient-to-br from-white via-background-500 to-background-600 rounded-3xl shadow-xl p-6 sm:p-8 font-bmjua relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* 닫기 버튼 */}
        <CloseButton onClick={onClose} className="absolute top-3 right-4" />

        {/* 제목 */}
        <h2 className="text-xl sm:text-2xl text-text-500 mb-4 sm:mb-6 font-bold">여행 생성하기</h2>

        {/* 섹션 1: 누구와 함께 가나요 */}
        {/* <div className="mb-4 sm:mb-6"> */}
        {/* <h3 className="text-base sm:text-lg mb-2 sm:mb-3 text-text-600">누구와 함께 가나요?</h3> */}
        {/* <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm"> */}
        {/* <div className="flex flex-col gap-2"> */}
        {/* 첫 번째 줄: 3개 */}
        {/* <div className="flex flex-wrap gap-2 justify-center"> */}
        {/* {['연인 ∙ 배우자', '친구', '지인 ∙ 동료'].map((label) => ( */}
        {/* <button */}
        {/* key={label} */}
        {/* onClick={() => handleCompanionToggle(label)} */}
        {/* className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm transition-all hover:scale-105 ${
                      companion.includes(label)
                        ? 'bg-gradient-to-br from-hover-600 to-point-600 text-white shadow-md'
                        : 'bg-gray-50 text-text-500 border border-background-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {/* 두 번째 줄: 4개 */}
        {/* <div className="flex flex-wrap gap-2 justify-center"> */}
        {/* {['혼자', '아이', '부모님', '기타'].map((label) => ( */}
        {/* <button */}
        {/* key={label} */}
        {/* onClick={() => handleCompanionToggle(label)} */}
        {/* className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm transition-all hover:scale-105 ${
                      companion.includes(label)
                        ? 'bg-gradient-to-br from-hover-600 to-point-600 text-white shadow-md'
                        : 'bg-gray-50 text-text-500 border border-background-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 섹션 2: 여행 인원 */}
        {/* <div className="mb-4 sm:mb-6"> */}
        {/* <h3 className="text-base sm:text-lg mb-2 sm:mb-3 text-text-600">여행 인원</h3> */}

        {/* <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col gap-2"> */}
        {/* {[
              { label: '남자', count: maleCount, setter: setMaleCount },
              { label: '여자', count: femaleCount, setter: setFemaleCount },
            ].map(({ label, count, setter }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-sm sm:text-base text-text-500">{label}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setter(Math.max(0, count - 1))}
                    disabled={count === 0}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-transform ${
                      count === 0
                        ? 'bg-gray-300 text-gray-500'
                        : 'bg-gradient-to-br from-hover-600 to-point-600 text-white hover:scale-110'
                    }`}
                  >
                    -
                  </button>
                  <span className="text-point-700 text-base sm:text-lg min-w-[20px] text-center">
                    {count}
                  </span>
                  <button
                    onClick={() => setter(count + 1)}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-hover-600 to-point-600 text-white hover:scale-110 transition-transform"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 여행 제목(추가) */}
        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg mb-2 sm:mb-3 text-text-600">여행 제목</h3>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white rounded-2xl py-2.5 sm:py-3 px-4 sm:px-5 text-left text-text-500 text-sm sm:text-base shadow-sm hover:shadow-md hover:scale-[1.02] transition-all border-none outline-none focus:outline-none focus:ring-0"
          />
        </div>

        {/* 섹션 3: 여행 날짜 */}
        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg mb-2 sm:mb-3 text-text-600">여행 날짜</h3>
          <button
            type="button"
            onClick={() => setShowCalendar(!showCalendar)}
            className="w-full bg-white rounded-2xl py-2.5 sm:py-3 px-4 sm:px-5 text-left text-text-500 text-sm sm:text-base shadow-sm hover:shadow-md hover:scale-[1.02] transition-all"
          >
            {startDate && endDate
              ? `${formatDate(startDate)} ~ ${formatDate(endDate)}`
              : 'YYYY-MM-DD ~ YYYY-MM-DD'}
          </button>

          {/* 캘린더 표시 */}
          {showCalendar && (
            <div className="mt-3 flex justify-center">
              <Calendar
                onDateSelect={handleDateSelect}
                initialStartDate={startDate || undefined}
                initialEndDate={endDate || undefined}
              />
            </div>
          )}
        </div>

        {/* 섹션 4: 여행 테마 */}
        {/* <div className="mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg mb-2 sm:mb-3 text-text-600">여행 테마</h3>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm"> */}
        {/* <div className="flex flex-wrap gap-2 justify-center">
              {[
                '#카페투어',
                '#도심 속 휴식',
                '#드라이브',
                '#감성',
                '#먹방',
                '#캠핑',
                '#힐링',
                '#즉흥',
                '#기념일',
              ].map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleThemeToggle(tag)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm transition-all hover:scale-105 ${
                    theme.includes(tag)
                      ? 'bg-gradient-to-br from-hover-600 to-point-600 text-white shadow-md'
                      : 'bg-gray-50 text-text-500 border border-background-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div> */}
        {/* </div> */}
        {/* </div> */}

        {/* 여행 시작 버튼 */}
        <div className="flex justify-center">
          <button
            onClick={handleCreateTravel}
            className="w-full sm:w-auto bg-gradient-to-br from-hover-600 to-point-600 text-white text-base sm:text-lg px-8 sm:px-12 py-2.5 sm:py-3 rounded-full shadow-lg hover:scale-105 hover:from-point-600 hover:to-main-800 transition-all font-bold"
          >
            여행 시작하기
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateTravelModal
