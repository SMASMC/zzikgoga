interface CloseButtonProps {
  onClick: () => void
  className?: string
  title?: string
  disabled?: boolean
}

export const CloseButton = ({
  onClick,
  className = '',
  title = '닫기',
  disabled = false,
}: CloseButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-gray-600 hover:text-gray-700 text-3xl leading-none hover:scale-110 transition-transform disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      title={title}
    >
      ✕
    </button>
  )
}

export default CloseButton
