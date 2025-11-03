import LoginForm from './LoginForm'

interface LoginModalProps {
  onClose: () => void
}

const LoginModal = ({ onClose }: LoginModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
      <div className="w-full max-w-md bg-gradient-to-br from-white via-background-500 to-background-600 rounded-3xl shadow-xl p-6 sm:p-8 font-bmjua relative">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-600 hover:text-gray-700 text-3xl leading-none hover:scale-110 transition-transform"
        >
          ✕
        </button>

        {/* LoginForm 컴포넌트 */}
        <LoginForm />
      </div>
    </div>
  )
}

export default LoginModal
