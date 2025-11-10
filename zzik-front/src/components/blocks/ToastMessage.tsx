// src/components/blocks/ToastMessage.tsx
import { useEffect, useRef } from 'react';
import type { IconType } from 'react-icons';
import {
  HiCheckCircle,
  HiExclamationCircle,
  HiXCircle,
  HiInformationCircle,
  HiX,
} from 'react-icons/hi';

export type ToastVariant = 'success' | 'warning' | 'error' | 'hint';

export type ToastState = {
  open?: boolean; // 표시 여부
  variant: ToastVariant; // success | warning | error | hint
  message: string; // 본문
  title?: string; // 제목
  autoCloseMs?: number; // 자동 닫힘(ms), 기본 3000
  onClose?: () => void; // 닫기 콜백
  className?: string; // 추가 클래스
  closable?: boolean; // 닫기 버튼 표시(기본 true)
};

const THEME: Record<
  ToastVariant,
  {
    icon: IconType;
    wrap: string; // 컨테이너 배경/보더/그림자
    title: string; // 타이틀 색
    iconColor: string;
    border: string;
  }
> = {
  success: {
    icon: HiCheckCircle,
    wrap: 'bg-emerald-50 border-emerald-400 shadow-[0_1px_0_rgba(0,0,0,0.04),0_6px_16px_rgba(16,185,129,0.15)]',
    title: 'text-emerald-700',
    iconColor: 'text-emerald-600',
    border: 'border-emerald-400',
  },
  warning: {
    icon: HiExclamationCircle,
    wrap: 'bg-amber-50 border-amber-400 shadow-[0_1px_0_rgba(0,0,0,0.04),0_6px_16px_rgba(245,158,11,0.18)]',
    title: 'text-amber-700',
    iconColor: 'text-amber-600',
    border: 'border-amber-400',
  },
  error: {
    icon: HiXCircle,
    wrap: 'bg-rose-50 border-rose-400 shadow-[0_1px_0_rgba(0,0,0,0.04),0_6px_16px_rgba(244,63,94,0.18)]',
    title: 'text-rose-700',
    iconColor: 'text-rose-600',
    border: 'border-rose-400',
  },
  hint: {
    icon: HiInformationCircle,
    wrap: 'bg-sky-50 border-sky-400 shadow-[0_1px_0_rgba(0,0,0,0.04),0_6px_16px_rgba(14,165,233,0.18)]',
    title: 'text-sky-700',
    iconColor: 'text-sky-600',
    border: 'border-sky-400',
  },
};

export function ToastMessage({
  open = true,
  variant,
  title,
  message,
  autoCloseMs = 3000,
  onClose,
  className,
  closable = true,
}: ToastState) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || !autoCloseMs) return;
    const t = setTimeout(() => closeRef.current?.(), autoCloseMs);
    return () => clearTimeout(t);
  }, [open, autoCloseMs]);

  if (!open) return null;

  const t = THEME[variant];
  const Icon = t.icon;

  return (
    <div
      role="status"
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      className={[
        'relative flex items-start gap-3 rounded-2xl border px-4 py-4 md:px-5 md:py-4',
        'transition-transform will-change-transform',
        t.wrap,
        className || '',
      ].join(' ')}
    >
      {/* 아이콘 */}
      <div className="pt-0.5">
        <Icon className={`h-5 w-5 ${t.iconColor}`} aria-hidden />
      </div>

      {/* 텍스트 */}
      <div className="pr-8">
        {/* tile은 굵게 */}
        {title && <div className={`text-sm font-semibold md:text-base ${t.title}`}>{title}</div>}
        <div className="text-sm text-gray-600 md:mt-0.5">{message}</div>
      </div>

      {/* 닫기 버튼(선택) */}
      {closable && (
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className={`absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-white/60 hover:text-gray-600 focus:outline-none focus:ring-2 ${t.border}`}
        >
          <HiX className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
