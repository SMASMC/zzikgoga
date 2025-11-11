// src/components/layout/BackgroundLayout.tsx
import React from 'react'

interface BackgroundLayoutProps {
  children: React.ReactNode
  className?: string
}

const themeConfig = {
  default: {
    // palette 적용: background / point / main
    background: 'bg-gradient-to-b from-background-500 via-background-600 to-background-500',
    elements: [
      {
        className:
          'absolute left-10 top-20 h-40 w-40 animate-pulse rounded-full bg-gradient-to-br from-point-500/25 to-main-700/15 blur-2xl',
        delay: undefined,
      },
      {
        className:
          'absolute right-20 top-60 h-32 w-32 animate-bounce rounded-full bg-gradient-to-br from-hover-600/25 to-point-600/15 blur-xl',
        delay: '3s',
      },
      {
        className:
          'absolute bottom-40 left-1/4 h-48 w-48 rounded-full bg-gradient-to-br from-background-700/20 to-point-500/10 blur-3xl',
        delay: undefined,
      },
      {
        className:
          'absolute right-1/3 top-1/2 h-36 w-36 animate-pulse rounded-full bg-gradient-to-br from-main-600/20 to-hover-600/10 blur-2xl',
        delay: '1s',
      },
      {
        className:
          'absolute right-1/4 top-32 h-8 w-8 rotate-45 animate-spin rounded-lg bg-gradient-to-br from-point-600 to-main-700 shadow-lg',
        delay: '8s',
      },
      {
        className:
          'absolute bottom-1/3 left-1/3 h-6 w-6 animate-bounce rounded-full bg-gradient-to-br from-hover-600 to-point-700 shadow-md',
        delay: '2s',
      },
      {
        className:
          'absolute right-10 top-2/3 h-10 w-10 rotate-12 animate-pulse rounded-lg bg-gradient-to-br from-point-500 to-main-800 shadow-lg',
        delay: undefined,
      },
      {
        className: 'absolute left-1/2 top-1/4 h-4 w-4 animate-ping rounded-full bg-point-500/40',
        delay: undefined,
      },
      {
        className:
          'absolute bottom-1/4 right-1/2 h-3 w-3 animate-ping rounded-full bg-hover-600/50',
        delay: '1.5s',
      },
    ],
  },
}

const BackgroundLayout: React.FC<BackgroundLayoutProps> = ({ children, className = '' }) => {
  const config = themeConfig.default

  return (
    <div className={`relative min-h-screen ${config.background} ${className}`}>
      {/* 배경 요소들 */}
      {config.elements.map((element, index) => (
        <div
          key={index}
          className={element.className}
          style={{
            animationDuration: element.delay || undefined,
            animationDelay: element.delay || undefined,
          }}
        />
      ))}

      {/* 컨텐츠 */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}

export default BackgroundLayout
