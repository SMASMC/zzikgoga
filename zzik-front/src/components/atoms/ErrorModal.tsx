interface ErrorModalProps {
  errorType: string
  onClose: () => void
}

const errorMessages: Record<string, { title: string; message: string }> = {
  no_code: {
    title: '로그인 실패',
    message: '카카오 인증 코드를 받지 못했습니다. 다시 시도해주세요.',
  },
  no_id_token: {
    title: '로그인 실패',
    message: '카카오 인증 토큰을 받지 못했습니다. 다시 시도해주세요.',
  },
  unknown: {
    title: '로그인 실패',
    message: '알 수 없는 오류가 발생했습니다. 다시 시도해주세요.',
  },
  oauth_callback_error: {
    title: '로그인 오류',
    message: '로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요.',
  },
}

const ErrorModal = ({ errorType, onClose }: ErrorModalProps) => {
  const error = errorMessages[errorType] || errorMessages.unknown

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 relative animate-fade-in">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl leading-none hover:scale-110 transition-transform"
        >
          ✕
        </button>

        {/* 에러 아이콘 */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* 에러 메시지 */}
        <div className="text-center space-y-2 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{error.title}</h2>
          <p className="text-gray-600">{error.message}</p>
        </div>

        {/* 확인 버튼 */}
        <button
          onClick={onClose}
          className="w-full px-6 py-3 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
        >
          확인
        </button>
      </div>
    </div>
  )
}

export default ErrorModal

