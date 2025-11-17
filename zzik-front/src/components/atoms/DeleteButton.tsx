import { HiTrash } from 'react-icons/hi'

interface DeleteButtonProps {
  onClick: () => void
  disabled?: boolean
  className?: string
  isInline?: boolean
}

const DeleteButton = ({
  onClick,
  disabled = false,
  className = '',
  isInline = false,
}: DeleteButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${isInline ? 'inline-flex' : 'flex'} ${className}`}
    >
      <HiTrash className="w-4 h-4" />
      <span>삭제</span>
    </button>
  )
}

export default DeleteButton
