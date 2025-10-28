// CreateTravelModal.tsx
// 여행 생성 모달

import { useState } from 'react'

const CreateTravelModal = ({ onClose }: { onClose: () => void }) => {
  const [companion, setCompanion] = useState<string[]>([])
  const [maleCount, setMaleCount] = useState(0)
  const [femaleCount, setFemaleCount] = useState(0)
  const [theme, setTheme] = useState<string[]>([])

  const handleCompanionToggle = (label: string) => {
    setCompanion((prev) => (prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label]))
  }

  const handleThemeToggle = (tag: string) => {
    setTheme((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
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
        <h2 className="text-xl sm:text-2xl text-text-500 mb-4 sm:mb-6 font-bold">여행 생성하기</h2>

        {/* 섹션 1: 누구와 함께 가나요 */}
        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg mb-2 sm:mb-3 text-text-600">누구와 함께 가나요?</h3>
          <div className="flex flex-wrap gap-2">
            {['연인 ∙ 배우자', '친구', '지인 ∙ 동료', '혼자', '아이', '부모님', '기타'].map((label) => (
              <button
                key={label}
                onClick={() => handleCompanionToggle(label)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm transition-all hover:scale-105 ${
                  companion.includes(label)
                    ? 'bg-gradient-to-br from-point-500 to-main-700 text-white shadow-md'
                    : 'bg-white text-text-500 border border-background-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 섹션 2: 여행 인원 */}
        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg mb-2 sm:mb-3 text-text-600">여행 인원</h3>

          <div className="flex flex-col gap-2">
            {[
              { label: '남자', count: maleCount, setter: setMaleCount },
              { label: '여자', count: femaleCount, setter: setFemaleCount },
            ].map(({ label, count, setter }) => (
              <div
                key={label}
                className="flex justify-between items-center bg-white rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 shadow-sm"
              >
                <span className="text-sm sm:text-base text-text-500">{label}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setter(Math.max(0, count - 1))}
                    disabled={count === 0}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-transform ${
                      count === 0
                        ? 'bg-gray-300 text-gray-500'
                        : 'bg-gradient-to-br from-point-500 to-main-700 text-white hover:scale-110'
                    }`}
                  >
                    -
                  </button>
                  <span className="text-point-700 text-base sm:text-lg min-w-[20px] text-center">
                    {count}
                  </span>
                  <button
                    onClick={() => setter(count + 1)}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-point-500 to-main-700 text-white hover:scale-110 transition-transform"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 섹션 3: 여행 날짜 */}
        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg mb-2 sm:mb-3 text-text-600">여행 날짜</h3>
          <div className="bg-white rounded-2xl py-2.5 sm:py-3 px-4 sm:px-5 text-text-500 text-sm sm:text-base shadow-sm">
            YYYY-MM-DD → YYYY-MM-DD
          </div>
        </div>

        {/* 섹션 4: 여행 테마 */}
        <div className="mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg mb-2 sm:mb-3 text-text-600">여행 테마</h3>
          <div className="flex flex-wrap gap-2">
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
                    ? 'bg-gradient-to-br from-point-500 to-main-700 text-white shadow-md'
                    : 'bg-white text-text-500 border border-background-700'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* 여행 시작 버튼 */}
        <div className="flex justify-center">
          <button className="w-full sm:w-auto bg-gradient-to-br from-hover-600 to-point-600 text-white text-base sm:text-lg px-8 sm:px-12 py-2.5 sm:py-3 rounded-full shadow-lg hover:scale-105 hover:from-point-600 hover:to-main-800 transition-all font-bold">
            여행 시작하기
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateTravelModal
