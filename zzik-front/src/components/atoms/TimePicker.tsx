// src/components/atoms/TimePicker.tsx
// 커스텀 시간 선택 컴포넌트
import { useState, useRef, useEffect } from 'react'
import { HiClock } from 'react-icons/hi'

interface TimePickerProps {
  value: string // HH:MM 형식
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

const TimePicker = ({
  value,
  onChange,
  onBlur,
  placeholder = '시간 선택',
  className = '',
  disabled = false,
}: TimePickerProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [tempHour, setTempHour] = useState('09')
  const [tempMinute, setTempMinute] = useState('00')
  const containerRef = useRef<HTMLDivElement>(null)

  // value가 변경되면 tempHour, tempMinute 업데이트
  useEffect(() => {
    if (value && /^\d{2}:\d{2}$/.test(value)) {
      const [h, m] = value.split(':')
      setTempHour(h)
      setTempMinute(m)
    }
  }, [value])

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        onBlur?.()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onBlur])

  const handleApply = () => {
    const newValue = `${tempHour}:${tempMinute}`
    onChange(newValue)
    setIsOpen(false)
    onBlur?.()
  }

  const handleQuickSelect = (hour: number) => {
    const h = String(hour).padStart(2, '0')
    setTempHour(h)
    setTempMinute('00')
    onChange(`${h}:00`)
    setIsOpen(false)
    onBlur?.()
  }

  const displayValue = value || placeholder

  // 시간 옵션 (00-23)
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  // 분 옵션 (0, 5, 10, ..., 55)
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 입력 필드 */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm border border-slate-300 rounded-full bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${!value ? 'text-slate-400' : 'text-slate-700'}`}
      >
        <div className="flex items-center gap-2">
          <HiClock className="w-4 h-4 text-slate-400" />
          <span className="font-medium">{displayValue}</span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 드롭다운 패널 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full min-w-[280px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* 빠른 선택 */}
          <div className="p-3 border-b border-slate-100">
            <div className="text-xs font-semibold text-slate-600 mb-2">빠른 선택</div>
            <div className="grid grid-cols-4 gap-1">
              {[9, 12, 14, 18].map((hour) => (
                <button
                  key={hour}
                  type="button"
                  onClick={() => handleQuickSelect(hour)}
                  className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                >
                  {String(hour).padStart(2, '0')}:00
                </button>
              ))}
            </div>
          </div>

          {/* 시간/분 선택 */}
          <div className="p-3">
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* 시간 */}
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-2">시</div>
                <div className="max-h-48 overflow-y-auto custom-scrollbar border border-slate-200 rounded-lg">
                  {hours.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setTempHour(h)}
                      className={`w-full px-3 py-1.5 text-sm text-left transition ${
                        tempHour === h
                          ? 'bg-blue-500 text-white font-semibold'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              {/* 분 */}
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-2">분</div>
                <div className="max-h-48 overflow-y-auto custom-scrollbar border border-slate-200 rounded-lg">
                  {minutes.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTempMinute(m)}
                      className={`w-full px-3 py-1.5 text-sm text-left transition ${
                        tempMinute === m
                          ? 'bg-blue-500 text-white font-semibold'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 미리보기 및 적용 버튼 */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="text-sm font-semibold text-slate-700">
                {tempHour}:{tempMinute}
              </div>
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-full transition"
              >
                적용
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 스크롤바 스타일 */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  )
}

export default TimePicker
