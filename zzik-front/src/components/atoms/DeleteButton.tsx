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
      className={`rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-100 transition shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${isInline ? 'inline' : 'block'} ${className}`}
    >
      삭제
    </button>
  )
}

export default DeleteButton
