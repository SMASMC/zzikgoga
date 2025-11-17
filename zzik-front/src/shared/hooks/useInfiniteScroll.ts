import { useEffect, useRef, useCallback } from 'react'

interface UseInfiniteScrollOptions {
  // 스크롤이 끝에 도달했을 때 호출되는 콜백
  onLoadMore: () => void
  // 현재 로딩 중인지 여부
  isLoading: boolean
  // 더 불러올 데이터가 있는지 여부
  hasMore: boolean
  // 바닥에서 얼마나 떨어진 지점에서 트리거할지 (픽셀, 기본값: 100)
  threshold?: number
}

// 무한 스크롤을 구현하는 훅
// Intersection Observer를 사용하여 페이지 끝을 감지합니다

export function useInfiniteScroll({
  onLoadMore,
  isLoading,
  hasMore,
  threshold = 100,
}: UseInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries
      if (target.isIntersecting && !isLoading && hasMore) {
        onLoadMore()
      }
    },
    [isLoading, hasMore, onLoadMore]
  )

  useEffect(() => {
    const options = {
      root: null, // viewport를 root로 사용
      rootMargin: `${threshold}px`, // threshold만큼 미리 트리거
      threshold: 0,
    }

    observerRef.current = new IntersectionObserver(handleObserver, options)

    const currentSentinel = sentinelRef.current
    if (currentSentinel) {
      observerRef.current.observe(currentSentinel)
    }

    return () => {
      if (observerRef.current && currentSentinel) {
        observerRef.current.unobserve(currentSentinel)
      }
    }
  }, [handleObserver, threshold])

  return sentinelRef
}
