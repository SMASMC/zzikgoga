import { useState, useEffect } from 'react'

// 미디어 쿼리 감지 훅
// @param query - CSS 미디어 쿼리 문자열 (예: '(max-width: 768px)')
// @returns 미디어 쿼리가 매칭되는지 여부
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)

    // 초기값 설정
    setMatches(mediaQuery.matches)

    // 변경 감지
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // 이벤트 리스너 등록
    mediaQuery.addEventListener('change', handler)

    return () => {
      mediaQuery.removeEventListener('change', handler)
    }
  }, [query])

  return matches
}

// 모바일 화면 감지 훅 (1024px 이하)
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 1024px)')
}
