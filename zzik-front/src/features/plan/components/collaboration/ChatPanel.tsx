import type { RefObject, FormEvent, KeyboardEvent } from 'react'
import { useEffect, useRef } from 'react'
import { cn } from '@/shared/utils/cn'
import CloseButton from '@/components/atoms/CloseButton'
import type { CursorChatMessage } from '../../hooks/useSharedCursors'

/**
 * ChatPanel Component
 *
 * Displays a chat panel for sending cursor messages and viewing message history.
 * Includes form submission logic and keyboard shortcuts.
 */

/**
 * 색상에 투명도를 적용한 연한 배경색 생성
 */
const getColorWithOpacity = (color: string, opacity: number = 0.1): string => {
  // HSL 형식인 경우: hsl(240, 75%, 50%) → hsla(240, 75%, 50%, 0.1)
  if (color.startsWith('hsl(')) {
    return color.replace('hsl(', 'hsla(').replace(')', `, ${opacity})`)
  }

  // HEX 형식인 경우: #3b82f6 → rgba
  if (color.startsWith('#')) {
    const hex = color.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }

  // 기타 형식은 그대로 반환
  return color
}

/**
 * 텍스트를 20자 단위로 줄바꿈 (한글 기준)
 */
const wrapText = (text: string, maxChars: number = 20): string => {
  if (text.length <= maxChars) {
    return text
  }

  const lines: string[] = []
  let currentLine = ''

  for (let i = 0; i < text.length; i++) {
    currentLine += text[i]

    if (currentLine.length === maxChars || i === text.length - 1) {
      lines.push(currentLine)
      currentLine = ''
    }
  }

  return lines.join('\n')
}

interface ChatPanelProps {
  isOpen: boolean
  chatValue: string
  onClose: () => void
  onSubmit: (value: string) => void
  onValueChange: (value: string) => void
  inputRef?: RefObject<HTMLInputElement | null>
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
  onFocus?: () => void
  chatMessages?: CursorChatMessage[]
  selfColor?: string
}

const ChatPanel = ({
  isOpen,
  chatValue,
  onClose,
  onSubmit,
  onValueChange,
  inputRef,
  onKeyDown,
  onFocus,
  chatMessages = [],
  selfColor = '#3b82f6',
}: ChatPanelProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = chatValue.trim()
    if (trimmed.length === 0) {
      onValueChange('')
      return
    }
    onSubmit(trimmed)
  }

  // 새 메시지가 추가되면 자동 스크롤
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages.length, isOpen])

  return (
    <div
      className={cn(
        'absolute right-0 top-full mt-2 z-40 w-96 max-w-[90vw] rounded-2xl border-2 border-white/70 bg-white/95 shadow-2xl backdrop-blur transition-all duration-300',
        isOpen
          ? 'pointer-events-auto translate-y-0 opacity-100'
          : 'pointer-events-none -translate-y-2 opacity-0'
      )}
    >
      <div className="flex items-center justify-between border-b-2 border-slate-100 px-6 py-4">
        <div className="text-lg font-bold text-slate-800">커서 채팅</div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>ESC로 닫기</span>
          <CloseButton onClick={onClose} className="text-xl" />
        </div>
      </div>

      {/* 채팅 메시지 히스토리 */}
      <div className="max-h-64 overflow-y-auto px-6 py-3">
        {chatMessages.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            아직 메시지가 없습니다.
            <br />
            커서 채팅으로 대화를 시작해보세요!
          </div>
        ) : (
          <div className="space-y-2">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className="flex items-start gap-2 rounded-lg px-3 py-2 transition-all"
                style={{ backgroundColor: getColorWithOpacity(msg.color, msg.isSelf ? 0.15 : 0.1) }}
              >
                <div
                  className="mt-0.5 h-6 w-6 flex-shrink-0 rounded-full border-2 border-white shadow-sm overflow-hidden"
                  style={{ backgroundColor: msg.picture ? 'transparent' : msg.color }}
                  title={msg.name}
                >
                  {msg.picture ? (
                    <img src={msg.picture} alt={msg.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[10px] font-bold text-white">
                      {msg.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold" style={{ color: msg.color }}>
                      {msg.name}
                      {msg.isSelf ? ' (나)' : ''}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(msg.timestamp).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="mt-0.5 break-words text-sm text-slate-700 whitespace-pre-wrap">
                    {wrapText(msg.text, 20)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t-2 border-slate-100 px-6 py-4">
        <form className="flex items-center gap-3" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            value={chatValue}
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            placeholder="메시지를 입력하고 Enter를 눌러보세요"
            maxLength={40}
            className="flex-1 rounded-full border-2 border-slate-200 bg-white px-5 py-3 text-base text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all"
            style={{
              borderColor: chatValue ? selfColor : undefined,
              boxShadow: chatValue
                ? `0 0 0 3px ${getColorWithOpacity(selfColor, 0.15)}`
                : undefined,
            }}
            autoComplete="off"
          />
          <button
            type="submit"
            className="rounded-full px-5 py-3 text-sm font-bold text-white shadow-md transition hover:shadow-lg"
            style={{
              backgroundColor: selfColor,
              filter: 'brightness(1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(0.9)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)'
            }}
          >
            보내기
          </button>
        </form>
      </div>
    </div>
  )
}

export default ChatPanel
