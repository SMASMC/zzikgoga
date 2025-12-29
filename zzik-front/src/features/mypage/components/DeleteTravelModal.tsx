import CloseButton from '@/components/atoms/CloseButton'
import SolidButton from '@/components/atoms/SolidButton'

interface DeleteTravelModalProps {
  title: string
  date: string
  onClose: () => void
  onConfirm: () => void
  isDeleting: boolean
}

const DeleteTravelModal = ({
  title,
  date,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteTravelModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
      <div className="w-full max-w-md bg-gradient-to-br from-white via-background-500 to-background-600 rounded-3xl shadow-xl p-6 sm:p-8 font-bmjua relative">
        {/* 닫기 버튼 */}
        <CloseButton onClick={onClose} className="absolute top-3 right-4" disabled={isDeleting} />

        {/* 제목 */}
        <h2 className="text-xl sm:text-2xl text-text-500 mb-4 sm:mb-6 font-bold">
          여행 삭제 확인
        </h2>

        {/* 경고 아이콘 */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* 삭제 확인 메시지 */}
        <div className="bg-white rounded-2xl p-4 mb-6">
          <p className="text-text-600 text-center mb-4">정말로 이 여행을 삭제하시겠습니까?</p>
          <div className="bg-gray-50 rounded-lg p-3 mb-2">
            <p className="text-sm text-text-500">
              <span className="font-bold">여행 제목:</span> {title}
            </p>
            <p className="text-sm text-text-500">
              <span className="font-bold">여행 기간:</span> {date}
            </p>
          </div>
          <p className="text-red-600 text-sm text-center font-semibold">
            삭제된 여행은 복구할 수 없으며, 일정, 예산, 장소 정보도 모두 삭제됩니다.
          </p>
        </div>

        {/* 버튼 영역 */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-6 py-2.5 rounded-full border-2 border-gray-300 text-text-500 font-semibold hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <SolidButton
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-6 py-2.5 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
          >
            {isDeleting ? '삭제 중...' : '삭제하기'}
          </SolidButton>
        </div>
      </div>
    </div>
  )
}

export default DeleteTravelModal
