// src/components/blocks/ToastDock.tsx
import React from 'react';
import { ToastMessage } from './ToastMessage';

type Props = {
  open?: boolean;
  variant: 'success' | 'warning' | 'error' | 'hint';
  title?: string;
  message: string;
  autoCloseMs?: number;
  offsetPx?: number;
  onClose?: () => void;
  className?: string;
};

export const ToastDock: React.FC<Props> = ({
  open = true,
  variant,
  title,
  message,
  autoCloseMs,
  offsetPx = 8,
  onClose,
  className,
}) => {
  if (!open || !message) return null;

  return (
    <div
      className={`fixed left-1/2 z-[1000] -translate-x-1/2 px-3 sm:px-0 ${className || ''}`}
      style={{ top: `calc(var(--navbar-h, 64px) + ${offsetPx}px)` }}
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
  );
};
