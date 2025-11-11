interface CloseButtonProps {
  onClick: () => void
  className?: string
  title?: string
}

export const CloseButton = ({
  onClick,
  className = '',
  title = '닫기',
}: CloseButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-gray-600 hover:text-gray-700 text-3xl leading-none hover:scale-110 transition-transform ${className}`}
      title={title}
    >
      ✕
    </button>
  )
}

export default CloseButton
