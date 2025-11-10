import CostPlusForm from './CostPlusForm'

interface CostPlusModalProps {
  isOpen: boolean
  onClose: () => void
  tripId: string
}

const CostPlusModal = ({ isOpen, onClose, tripId }: CostPlusModalProps): JSX.Element | null => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative w-full max-w-md sm:max-w-lg bg-gradient-to-br from-white via-background-500 to-background-600 rounded-3xl shadow-xl p-6 sm:p-8 font-bmjua max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-text-500 font-bmjua">비용 직접 추가하기</h2>
          <button
            onClick={onClose}
            className="absolute top-3 right-4 text-gray-600 hover:text-gray-700 text-3xl leading-none hover:scale-110 transition-transform"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-4">
          <CostPlusForm tripId={tripId} />
        </div>
      </div>
    </div>
  )
}

export default CostPlusModal
