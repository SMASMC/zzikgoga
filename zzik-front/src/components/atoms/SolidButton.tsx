import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'main' | 'point' | 'hover' | 'kakao'
  size?: 'sm' | 'md' | 'lg'
  rounded?: 'full' | '2xl' | 'lg'
}

const SolidButton = ({
  variant = 'main',
  size = 'md',
  rounded = '2xl',
  children,
  className = '',
  ...props
}: ButtonProps) => {
  const baseStyles =
    'inline-flex items-center justify-center whitespace-nowrap font-bmjua text-white shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105'

  const variantStyles = {
    main: 'bg-gradient-to-br from-hover-600 to-point-600 hover:from-hover-800 hover:to-point-700',
    point: 'bg-gradient-to-br from-point-500 to-main-700 hover:from-point-600 hover:to-main-600',
    hover: 'bg-gradient-to-br from-hover-500 to-point-500 hover:from-hover-600 hover:to-point-600',
    kakao:
      'bg-gradient-to-br from-kakao-500 to-kakao-600 hover:from-kakao-700 hover:to-kakao-800 !text-gray-800',
  }

  const sizeStyles = {
    sm: 'px-4 py-1.5 text-sm',
    md: 'px-6 py-2.5 text-base',
    lg: 'px-8 py-3 text-lg',
  }

  const roundedStyles = {
    full: 'rounded-full',
    '2xl': 'rounded-2xl',
    lg: 'rounded-lg',
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${roundedStyles[rounded]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default SolidButton
