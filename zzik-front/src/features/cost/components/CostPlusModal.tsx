import CostPlusForm from './CostPlusForm'

interface CostPlusModalProps {
  isOpen: boolean
  onClose: () => void
  tripId: string
}

const CostPlusModal = ({ isOpen, onClose, tripId }: CostPlusModalProps): JSX.Element | null => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-text-500 font-bmjua">비용 직접 추가하기</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Modal Body - 여기에 폼 추가 */}
        <div className="space-y-4">
          <CostPlusForm tripId={tripId} />
        </div>
      </div>
    </div>
  )
}

export default CostPlusModal
