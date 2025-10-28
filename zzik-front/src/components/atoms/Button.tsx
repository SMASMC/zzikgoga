import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'main' | 'point' | 'hover' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

const Button = ({
  variant = 'main',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) => {
  const baseStyles =
    'font-semibold rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed'

  const variantStyles = {
    main: 'bg-main-500 text-white hover:bg-main-600',
    point: 'bg-point-500 text-white hover:bg-point-600',
    hover: 'bg-hover-500 text-white hover:bg-hover-600',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50',
  }

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
