// CreateTravelModal.tsx
// 여행 생성 모달

import { useState } from 'react'

const CreateTravelModal = ({ onClose }: { onClose: () => void }) => {
  const [companion, setCompanion] = useState('연인·배우자')
  const [maleCount, setMaleCount] = useState(1)
  const [femaleCount, setFemaleCount] = useState(0)
  const [theme, setTheme] = useState<string[]>(['#도심 속 휴식', '#드라이브', '#감성'])

  const handleThemeToggle = (tag: string) => {
    setTheme((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="w-[680px] bg-gradient-to-br from-white via-[#F5FCFF] to-[#F0FAFF] rounded-3xl shadow-lg p-10 font-jua relative">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-6 text-gray-400 hover:text-gray-600 text-2xl"
        >
          ✕
        </button>

        {/* 제목 */}
        <h2 className="text-2xl text-gray-900 mb-6">여행 생성하기</h2>

        {/* 섹션 1: 누구와 함께 가나요 */}
        <div className="mb-6">
          <h3 className="text-lg mb-3">누구와 함께 가나요?</h3>
          <div className="flex flex-wrap gap-3">
            {['연인·배우자', '친구', '지인·동료', '혼자', '아이', '부모님', '기타'].map((label) => (
              <button
                key={label}
                onClick={() => setCompanion(label)}
                className={`px-5 py-2 rounded-3xl text-sm transition-all ${
                  companion === label
                    ? 'bg-gradient-to-br from-blue-500 to-blue-800 text-white shadow-md'
                    : 'bg-gradient-to-br from-[#FAFEFF] to-[#F5FCFF] text-gray-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 섹션 2: 여행 인원 */}
        <div className="mb-6">
          <h3 className="text-lg mb-3">여행 인원</h3>

          <div className="flex flex-col gap-3">
            {[
              { label: '남자', count: maleCount, setter: setMaleCount },
              { label: '여자', count: femaleCount, setter: setFemaleCount },
            ].map(({ label, count, setter }) => (
              <div
                key={label}
                className="flex justify-between items-center bg-gradient-to-br from-[#FAFEFF] to-[#F5FCFF] rounded-3xl px-5 py-3"
              >
                <span>{label}</span>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setter(Math.max(0, count - 1))}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-800 text-white"
                  >
                    -
                  </button>
                  <span className="text-blue-800 text-lg">{count}</span>
                  <button
                    onClick={() => setter(count + 1)}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-800 text-white"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 섹션 3: 여행 날짜 */}
        <div className="mb-6">
          <h3 className="text-lg mb-3">여행 날짜</h3>
          <div className="bg-gradient-to-br from-[#FAFEFF] to-[#F5FCFF] rounded-3xl py-3 px-5 text-gray-700">
            YYYY-MM-DD → YYYY-MM-DD
          </div>
        </div>

        {/* 섹션 4: 여행 테마 */}
        <div className="mb-8">
          <h3 className="text-lg mb-3">여행 테마</h3>
          <div className="flex flex-wrap gap-3">
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
                className={`px-4 py-2 rounded-3xl text-sm ${
                  theme.includes(tag)
                    ? 'bg-gradient-to-br from-blue-500 to-blue-800 text-white'
                    : 'bg-gradient-to-br from-[#FAFEFF] to-[#F5FCFF] text-gray-800'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* 여행 시작 버튼 */}
        <div className="flex justify-center">
          <button className="bg-gradient-to-br from-sky-400 to-blue-600 text-white text-lg px-12 py-3 rounded-full shadow-md hover:scale-105 transition-transform">
            여행 시작하기
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateTravelModal
