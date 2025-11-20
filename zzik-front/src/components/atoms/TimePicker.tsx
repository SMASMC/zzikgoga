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
  align?: 'left' | 'right' // 드롭다운 정렬 방향
}

const TimePicker = ({
  value,
  onChange,
  onBlur,
  placeholder = '시간 선택',
  className = '',
  disabled = false,
  align = 'left',
}: TimePickerProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const [tempHour, setTempHour] = useState('09')
  const [tempMinute, setTempMinute] = useState('00')
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom')
  const [maxDropdownHeight, setMaxDropdownHeight] = useState<number | undefined>(undefined)
  const [dropdownWidth, setDropdownWidth] = useState<number | undefined>(undefined)
  const [dropdownLeft, setDropdownLeft] = useState<number | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // value가 변경되면 tempHour, tempMinute, inputValue 업데이트
  useEffect(() => {
    setInputValue(value)
    if (value && /^\d{2}:\d{2}$/.test(value)) {
      const [h, m] = value.split(':')
      setTempHour(h)
      setTempMinute(m)
    }
  }, [value])

  // 입력값 파싱 및 유효성 검사
  const parseTimeInput = (input: string): string | null => {
    const cleaned = input.replace(/[^\d:]/g, '')

    // HH:MM 형식
    if (/^\d{1,2}:\d{1,2}$/.test(cleaned)) {
      const [h, m] = cleaned.split(':').map(Number)
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      }
    }

    // HHMM 또는 HMM 형식 (예: 0900, 930)
    if (/^\d{3,4}$/.test(cleaned)) {
      const padded = cleaned.padStart(4, '0')
      const h = parseInt(padded.slice(0, 2))
      const m = parseInt(padded.slice(2, 4))
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      }
    }

    return null
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleInputBlur = () => {
    const parsed = parseTimeInput(inputValue)
    if (parsed) {
      onChange(parsed)
      setInputValue(parsed)
    } else if (value) {
      // 유효하지 않은 입력이면 원래 값으로 복원
      setInputValue(value)
    }
    setIsOpen(false)
    onBlur?.()
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur()
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      setInputValue(value)
      setIsOpen(false)
      inputRef.current?.blur()
    }
  }

  // 드롭다운 위치 계산 (모달 경계 고려)
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const preferredDropdownHeight = 400 // 선호하는 드롭다운 높이

      // 가장 가까운 모달 컨테이너 찾기 (overflow-y-auto 또는 overflow-y-scroll이 있는 부모)
      let modalContainer: HTMLElement | null = containerRef.current.parentElement
      while (modalContainer) {
        const style = window.getComputedStyle(modalContainer)
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          break
        }
        modalContainer = modalContainer.parentElement
      }

      if (modalContainer) {
        // 모달 컨테이너의 경계 계산
        const modalRect = modalContainer.getBoundingClientRect()
        const spaceBelowInModal = modalRect.bottom - rect.bottom
        const spaceAboveInModal = rect.top - modalRect.top

        // 드롭다운 너비 계산 (모달 경계 내에서)
        const preferredWidth = 280 // min-w-[280px]

        // 드롭다운이 모달 오른쪽 경계를 넘지 않도록 너비 조정
        let calculatedWidth = preferredWidth
        let calculatedLeft: number | undefined = undefined

        if (align === 'right') {
          // 오른쪽 정렬인 경우
          if (rect.right - preferredWidth < modalRect.left) {
            // 왼쪽으로 벗어나면 모달 너비에 맞춤
            calculatedWidth = rect.right - modalRect.left - 16 // 패딩 고려
            calculatedLeft = modalRect.left - rect.left + 8
          }
        } else {
          // 왼쪽 정렬인 경우 (기본)
          if (rect.left + preferredWidth > modalRect.right) {
            // 오른쪽으로 벗어나면 모달 너비에 맞춤
            calculatedWidth = modalRect.right - rect.left - 16 // 패딩 고려
          }
        }

        // 적용 버튼 영역 고려 (빠른 선택 영역 + 적용 버튼 영역 + 여유 공간)
        // 빠른 선택: 약 80px, 적용 버튼: 약 50px, 여유 공간: 약 20px
        const reservedSpace = 150
        const minDropdownHeight = 250 // 최소 드롭다운 높이

        // 모달 내부에서 공간이 충분한지 확인
        if (spaceBelowInModal >= preferredDropdownHeight) {
          // 아래 공간이 충분하면 아래로
          setDropdownPosition('bottom')
          setMaxDropdownHeight(undefined) // 제한 없음
        } else if (spaceAboveInModal >= preferredDropdownHeight) {
          // 위 공간이 충분하면 위로
          setDropdownPosition('top')
          setMaxDropdownHeight(undefined) // 제한 없음
        } else {
          // 양쪽 모두 부족하면 더 넉넉한 쪽으로 선택하고 높이 제한
          if (spaceAboveInModal > spaceBelowInModal) {
            setDropdownPosition('top')
            // 위쪽 공간에 맞춰 높이 제한 (적용 버튼 영역 고려)
            setMaxDropdownHeight(Math.max(minDropdownHeight, spaceAboveInModal - reservedSpace))
          } else {
            setDropdownPosition('bottom')
            // 아래쪽 공간에 맞춰 높이 제한 (적용 버튼 영역 고려)
            setMaxDropdownHeight(Math.max(minDropdownHeight, spaceBelowInModal - reservedSpace))
          }
        }

        // 너비 설정
        setDropdownWidth(calculatedWidth < 200 ? undefined : calculatedWidth) // 최소 200px
        setDropdownLeft(calculatedLeft)
      } else {
        // 모달 컨테이너를 찾지 못한 경우 기존 로직 사용
        const spaceBelow = window.innerHeight - rect.bottom
        const spaceAbove = rect.top

        if (spaceBelow < preferredDropdownHeight && spaceAbove > spaceBelow) {
          setDropdownPosition('top')
        } else {
          setDropdownPosition('bottom')
        }
        setMaxDropdownHeight(undefined) // 모달이 없으면 제한 없음
        setDropdownWidth(undefined) // 모달이 없으면 기본 너비
        setDropdownLeft(undefined)
      }
    }
  }, [isOpen, align])

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

  // 시간 옵션 (00-23)
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  // 분 옵션 (0, 5, 10, ..., 55)
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 입력 필드 */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          onFocus={() => setIsOpen(false)}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full pl-9 pr-10 py-2 text-sm border border-slate-300 rounded-full bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          } ${!value ? 'text-slate-400' : 'text-slate-700 font-medium'}`}
        />
        <HiClock className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="absolute right-2 p-1 hover:bg-slate-100 rounded-full transition-colors"
          title="드롭다운 열기"
        >
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* 드롭다운 패널 */}
      {isOpen && (
        <div
          className={`absolute bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden ${
            dropdownPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          } ${align === 'right' && !dropdownLeft ? 'right-0' : ''} ${!dropdownLeft && align !== 'right' ? 'left-0' : ''}`}
          style={{
            ...(dropdownWidth
              ? { width: `${dropdownWidth}px`, minWidth: `${Math.min(dropdownWidth, 280)}px` }
              : { width: '100%', minWidth: '280px' }),
            ...(dropdownLeft !== undefined ? { left: `${dropdownLeft}px` } : {}),
            ...(maxDropdownHeight
              ? { maxHeight: `${maxDropdownHeight}px`, display: 'flex', flexDirection: 'column' }
              : { display: 'flex', flexDirection: 'column' }),
          }}
        >
          {/* 빠른 선택 */}
          <div className="p-3 border-b border-slate-100">
            <div className="text-xs font-semibold text-slate-600 mb-2">빠른 선택</div>
            <div className="grid grid-cols-4 gap-1">
              {[9, 12, 14, 18].map((hour) => (
                <button
                  key={hour}
                  type="button"
                  onClick={() => handleQuickSelect(hour)}
                  className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full transition"
                >
                  {String(hour).padStart(2, '0')}:00
                </button>
              ))}
            </div>
          </div>

          {/* 시간/분 선택 */}
          <div className="p-3 flex-1 min-h-0 flex flex-col">
            <div className="grid grid-cols-2 gap-3 mb-3 flex-1 min-h-0">
              {/* 시간 */}
              <div className="flex flex-col min-h-0">
                <div className="text-xs font-semibold text-slate-600 mb-2">시</div>
                <div
                  className="flex-1 overflow-y-auto custom-scrollbar border border-slate-200 rounded-lg"
                  style={
                    maxDropdownHeight
                      ? { maxHeight: `${Math.max(120, (maxDropdownHeight - 200) / 2)}px` }
                      : { maxHeight: '192px' }
                  }
                >
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
              <div className="flex flex-col min-h-0">
                <div className="text-xs font-semibold text-slate-600 mb-2">분</div>
                <div
                  className="flex-1 overflow-y-auto custom-scrollbar border border-slate-200 rounded-lg"
                  style={
                    maxDropdownHeight
                      ? { maxHeight: `${Math.max(120, (maxDropdownHeight - 200) / 2)}px` }
                      : { maxHeight: '192px' }
                  }
                >
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

            {/* 미리보기 및 적용 버튼 - sticky로 고정하여 항상 보이도록 */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 bg-white sticky bottom-0 z-10">
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
