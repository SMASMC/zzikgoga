import type { RefObject, FormEvent, KeyboardEvent } from 'react'
import { cn } from '@/shared/utils/cn'
import CloseButton from '@/components/atoms/CloseButton'

/**
 * ChatPanel Component
 *
 * Displays a chat panel for sending cursor messages.
 * Includes form submission logic and keyboard shortcuts.
 */

interface ChatPanelProps {
  isOpen: boolean
  chatValue: string
  onClose: () => void
  onSubmit: (value: string) => void
  onValueChange: (value: string) => void
  inputRef?: RefObject<HTMLInputElement>
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
  onFocus?: () => void
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
}: ChatPanelProps) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = chatValue.trim()
    if (trimmed.length === 0) {
      onValueChange('')
      return
    }
    onSubmit(trimmed)
  }

  return (
    <div
      className={cn(
        'absolute right-8 top-20 z-40 w-96 max-w-[90vw] rounded-2xl border-2 border-white/70 bg-white/95 shadow-2xl backdrop-blur transition-all duration-300',
        isOpen
          ? 'pointer-events-auto translate-y-0 opacity-100'
          : 'pointer-events-none -translate-y-2 opacity-0'
      )}
    >
      <div className="flex items-center justify-between border-b-2 border-slate-100 px-6 py-4">
        <div className="text-lg font-bold text-slate-800">커서 메시지 보내기</div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>ESC로 닫기</span>
          <CloseButton onClick={onClose} className="text-xl" />
        </div>
      </div>
      <div className="px-6 py-3 text-sm text-slate-600">
        입력한 내용은 내 커서 풍선으로만 표시됩니다.
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
            maxLength={200}
            className="flex-1 rounded-full border-2 border-slate-200 bg-white px-5 py-3 text-base text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            autoComplete="off"
          />
          <button
            type="submit"
            className="rounded-full bg-blue-500 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-blue-600 hover:shadow-lg"
          >
            보내기
          </button>
        </form>
      </div>
    </div>
  )
}

export default ChatPanel
