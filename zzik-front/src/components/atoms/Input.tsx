import { InputHTMLAttributes, forwardRef, useMemo, ReactNode } from 'react'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string | ReactNode
  error?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, size = 'lg', className = '', ...props }, ref) => {
    const sizeClasses = useMemo(() => {
      const configs = {
        xs: {
          input: 'px-2 py-0.5 text-xs',
          label: 'text-sm font-bold mb-1.5',
          error: 'mt-1 text-xs',
          border: 'border',
        },
        sm: {
          input: 'px-2.5 py-0.5 text-sm',
          label: 'text-sm font-bold mb-2',
          error: 'mt-1.5 text-sm',
          border: 'border',
        },
        md: {
          input: 'px-3 py-1 text-sm',
          label: 'text-base font-bold mb-2',
          error: 'mt-1.5 text-sm',
          border: 'border',
        },
        lg: {
          input: 'px-6 py-4 text-lg',
          label: 'text-lg font-bold mb-3',
          error: 'mt-2 text-base',
          border: 'border-2',
        },
      }
      return configs[size]
    }, [size])

    return (
      <div className="w-full">
        {label && <label className={`block text-slate-800 ${sizeClasses.label}`}>{label}</label>}
        <input
          ref={ref}
          className={`w-full ${sizeClasses.input} ${sizeClasses.border} rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400 transition-all shadow-sm hover:shadow-md ${
            error ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-white hover:border-blue-300'
          } ${className}`}
          {...props}
        />
        {error && <p className={`${sizeClasses.error} font-semibold text-red-600`}>{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
