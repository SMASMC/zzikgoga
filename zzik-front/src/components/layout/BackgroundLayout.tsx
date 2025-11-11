// src/components/layout/BackgroundLayout.tsx
import React from 'react';

interface BackgroundLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const themeConfig = {
  default: {
    background: 'bg-gradient-to-br from-emerald-50/20 via-sky-50/30 to-teal-50/10',
    elements: [
      {
        className:
          'absolute left-10 top-20 h-40 w-40 animate-pulse rounded-full bg-gradient-to-br from-emerald-400/20 to-green-600/10 blur-2xl',
        delay: undefined,
      },
      {
        className:
          'absolute right-20 top-60 h-32 w-32 animate-bounce rounded-full bg-gradient-to-br from-lime-400/25 to-emerald-500/15 blur-xl',
        delay: '3s',
      },
      {
        className:
          'absolute bottom-40 left-1/4 h-48 w-48 rounded-full bg-gradient-to-br from-green-300/15 to-emerald-400/10 blur-3xl',
        delay: undefined,
      },
      {
        className:
          'absolute right-1/3 top-1/2 h-36 w-36 animate-pulse rounded-full bg-gradient-to-br from-emerald-500/20 to-lime-400/10 blur-2xl',
        delay: '1s',
      },
      {
        className:
          'absolute right-1/4 top-32 h-8 w-8 rotate-45 animate-spin rounded-lg bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg',
        delay: '8s',
      },
      {
        className:
          'absolute bottom-1/3 left-1/3 h-6 w-6 animate-bounce rounded-full bg-gradient-to-br from-lime-400 to-emerald-500 shadow-md',
        delay: '2s',
      },
      {
        className:
          'absolute right-10 top-2/3 h-10 w-10 rotate-12 animate-pulse rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg',
        delay: undefined,
      },
      {
        className: 'absolute left-1/2 top-1/4 h-4 w-4 animate-ping rounded-full bg-emerald-400/30',
        delay: undefined,
      },
      {
        className: 'absolute bottom-1/4 right-1/2 h-3 w-3 animate-ping rounded-full bg-lime-400/40',
        delay: '1.5s',
      },
    ],
  },
};

const BackgroundLayout: React.FC<BackgroundLayoutProps> = ({ children, className = '' }) => {
  const config = themeConfig.default;

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
  );
};

export default BackgroundLayout;
