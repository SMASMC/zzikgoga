// src/components/blocks/DropdownSelect.tsx
import clsx from 'clsx'
import { HiChevronDown } from 'react-icons/hi'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type Option = { label: string; value: string }

type Props = {
  options: Option[]
  value?: string
  defaultValue?: string
  placeholder?: string
  onChange?: (value: string) => void
  className?: string
  menuClassName?: string
  disabled?: boolean
}

export const DropdownSelect: React.FC<Props> = ({
  options,
  value,
  defaultValue,
  placeholder = '선택하세요',
  onChange,
  className,
  menuClassName,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false)
  const isControlled = typeof value !== 'undefined'
  const [internal, setInternal] = useState(defaultValue)
  const selectedValue = isControlled ? value : internal

  const selected = useMemo(
    () => options.find((o) => o.value === selectedValue),
    [options, selectedValue]
  )

  const [highlight, setHighlight] = useState(
    Math.max(
      0,
      options.findIndex((o) => o.value === selectedValue)
    )
  )

  const wrapRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [menuWidth, setMenuWidth] = useState<number | undefined>(undefined)

  const syncWidth = useCallback(() => {
    if (btnRef.current) {
      setMenuWidth(btnRef.current.offsetWidth)
    }
  }, [])

  useEffect(() => {
    syncWidth()
  }, [syncWidth])

  useEffect(() => {
    if (open) {
      syncWidth()
    }
  }, [open, syncWidth])

  useEffect(() => {
    const onResize = () => syncWidth()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [syncWidth])

  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const select = useCallback(
    (nextValue: string) => {
      if (!isControlled) {
        setInternal(nextValue)
      }
      onChange?.(nextValue)
      setOpen(false)
      btnRef.current?.focus()
    },
    [isControlled, onChange]
  )

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        btnRef.current?.focus()
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setHighlight((prev) => Math.min(options.length - 1, prev + 1))
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setHighlight((prev) => Math.max(0, prev - 1))
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        const opt = options[highlight]
        if (opt) {
          select(opt.value)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [highlight, open, options, select])

  return (
    <div ref={wrapRef} className={clsx('relative w-full', className)}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={clsx(
          'flex w-full items-center justify-between gap-3 rounded-full border-2 border-slate-300 bg-white px-4 py-4 text-base text-slate-600 transition focus:outline-none focus:ring-2 focus:ring-blue-200',
          'hover:border-blue-300 hover:shadow-md',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        <span className={clsx(!selected && 'text-slate-400')}>
          {selected?.label ?? placeholder}
        </span>
        <HiChevronDown
          className={clsx('h-5 w-5 text-slate-500 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          className={clsx(
            'absolute left-0 z-50 mt-2 rounded-2xl border border-slate-200 bg-white shadow-2xl',
            'overflow-hidden',
            menuClassName
          )}
          style={{ width: menuWidth }}
        >
          <ul
            ref={listRef}
            role="listbox"
            aria-label={placeholder}
            className="max-h-64 overflow-auto py-1"
          >
            {options.map((option, index) => {
              const active = index === highlight
              const isSelected = option.value === selectedValue
              return (
                <li key={option.value}>
                  <button
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => select(option.value)}
                    className={clsx(
                      'flex w-full items-center justify-between px-4 py-2 text-sm transition-colors',
                      active ? 'bg-blue-50 text-blue-600' : 'text-slate-700',
                      isSelected ? 'font-semibold' : 'font-normal',
                      'focus:outline-none focus:bg-blue-100'
                    )}
                  >
                    <span>{option.label}</span>
                    {isSelected ? (
                      <span className="text-xs font-semibold text-blue-500">선택됨</span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
