import { useEffect, useRef, useState, useCallback } from 'react'

interface CollaborativeTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
}

/**
 * 실시간 협업 편집을 지원하는 Textarea 컴포넌트
 *
 * 문제: React controlled input과 Yjs 동기화가 충돌하여
 *       동시 편집 시 글자가 중복되는 현상 발생
 *
 * 해결: 로컬 상태를 분리하고 디바운싱을 적용하여
 *       입력 중에는 로컬 상태를 사용하고, 일정 시간 후에만 Yjs에 동기화
 */
const CollaborativeTextarea = ({
  value,
  onChange,
  placeholder,
  rows = 2,
  className = '',
}: CollaborativeTextareaProps) => {
  const [localValue, setLocalValue] = useState(value)
  const [isEditing, setIsEditing] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 외부 값이 변경되었을 때 (다른 사용자의 편집)
  // 현재 편집 중이 아닐 때만 로컬 값을 업데이트
  useEffect(() => {
    if (!isEditing && value !== localValue) {
      setLocalValue(value)
    }
  }, [value, isEditing, localValue])

  const syncToYjs = useCallback(
    (newValue: string) => {
      if (newValue !== value) {
        onChange(newValue)
      }
      setIsEditing(false)
    },
    [value, onChange]
  )

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = event.target.value
      setLocalValue(newValue)
      setIsEditing(true)

      // 기존 타이머 취소
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // 500ms 후에 Yjs에 동기화 (디바운싱)
      timeoutRef.current = setTimeout(() => {
        syncToYjs(newValue)
      }, 500)
    },
    [syncToYjs]
  )

  const handleBlur = useCallback(() => {
    // blur 시 즉시 동기화
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    syncToYjs(localValue)
  }, [localValue, syncToYjs])

  const handleFocus = useCallback(() => {
    setIsEditing(true)
  }, [])

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <textarea
      ref={textareaRef}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder={placeholder}
      rows={rows}
      className={className}
    />
  )
}

export default CollaborativeTextarea
