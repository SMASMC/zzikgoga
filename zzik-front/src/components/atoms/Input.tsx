import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-lg font-bold text-slate-800 mb-3">{label}</label>}
        <input
          ref={ref}
          className={`w-full px-6 py-4 text-lg border-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400 transition-all shadow-sm hover:shadow-md ${
            error ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-white hover:border-blue-300'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-2 text-base font-semibold text-red-600">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
