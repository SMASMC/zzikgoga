import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { ToastMessage } from './ToastMessage'

type Props = {
  open?: boolean
  variant: 'success' | 'warning' | 'error' | 'hint'
  title?: string
  message: string
  autoCloseMs?: number
  offsetPx?: number
  onClose?: () => void
  className?: string
  anchorSelector?: string
}

const DEFAULT_TOP = 64

export const ToastDock = ({
  open = true,
  variant,
  title,
  message,
  autoCloseMs,
  offsetPx = 8,
  onClose,
  className,
  anchorSelector = '[data-toast-anchor]',
}: Props) => {
  const [top, setTop] = useState(DEFAULT_TOP + offsetPx)

  const recompute = useCallback(() => {
    const anchor =
      typeof document !== 'undefined'
        ? (document.querySelector(anchorSelector) as HTMLElement | null)
        : null
    if (anchor) {
      const rect = anchor.getBoundingClientRect()
      setTop(rect.bottom + window.scrollY + offsetPx)
    } else {
      setTop(DEFAULT_TOP + offsetPx)
    }
  }, [anchorSelector, offsetPx])

  useLayoutEffect(() => {
    recompute()
  }, [recompute])

  useEffect(() => {
    const handler = () => recompute()
    window.addEventListener('resize', handler)
    window.addEventListener('scroll', handler, { passive: true })
    return () => {
      window.removeEventListener('resize', handler)
      window.removeEventListener('scroll', handler)
    }
  }, [recompute])

  if (!open || !message) return null

  return (
    <div
      className={`fixed left-1/2 z-[1000] -translate-x-1/2 px-3 sm:px-0 ${className || ''}`}
      style={{ top }}
    >
      <div className="pointer-events-auto max-w-[90vw] sm:max-w-sm">
        <ToastMessage
          open={open}
          variant={variant}
          title={title}
          message={message}
          autoCloseMs={autoCloseMs}
          onClose={onClose}
          className="backdrop-blur"
        />
      </div>
    </div>
  )
}
