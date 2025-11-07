// CostAdd.tsx
// 정산 추가 컴포넌트
// 영수증 모달과 사진 직접 추가 모달을 위함
import CostPlusModal from './CostPlusModal'
import { useState } from 'react'

const CostAdd = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleReceiptUpload = () => {
    console.log('영수증 업로드')
  }

  const handleModalOpen = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    // 모달 닫힐 때 정산 내역 전송해야 함
    setIsModalOpen(false)
  }

  return (
    <>
      <div className="bg-white rounded-3xl shadow-lg p-6 h-full">
        <h2 className="text-xl font-bold text-text-500 mb-6 font-bmjua">비용 추가하기</h2>

        <div className="space-y-4">
          {/* 영수증으로 추가하기 */}
          <button
            onClick={handleReceiptUpload}
            className="w-full group bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 cursor-pointer border-2 border-blue-200 hover:border-blue-400 active:scale-[0.98]"
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-500 font-bmjua mb-1">
                  영수증으로 추가하기
                </h3>
                <p className="text-xs text-text-600">
                  영수증 사진을 업로드하면
                  <br />
                  자동으로 정보가 입력됩니다
                </p>
              </div>
            </div>
          </button>

          {/* 직접 추가하기 */}
          <button
            onClick={handleModalOpen}
            className="w-full group bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 cursor-pointer border-2 border-blue-200 hover:border-blue-400 active:scale-[0.98]"
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-500 font-bmjua mb-1">직접 추가하기</h3>
                <p className="text-xs text-text-600">
                  카테고리, 금액, 설명 등을
                  <br />
                  직접 입력하여 추가합니다
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 직접 추가 모달 */}
      {isModalOpen && <CostPlusModal isOpen={isModalOpen} onClose={handleCloseModal} />}
    </>
  )
}

export default CostAdd
