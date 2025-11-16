import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ToastDock } from '@/components/blocks/ToastDock'
import LoginModal from '@/features/auth/components/LoginModal'
import { TravelCard, TravelAddCard } from '@/features/mypage/components/TravelCard'
import CreateTravelModal from '@/features/mypage/components/CreateTravelModal'
import { TravelService } from '@/features/mypage/services/travelService'
import { Travel } from '@/features/mypage/types/mypage'
import { useAuthStore } from '@/shared/stores/useAuthStore'
import { AuthService } from '@/features/auth/services/authService'

const MyPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [travels, setTravels] = useState<Travel[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const isFirstRender = useRef(true)
  const logout = useAuthStore((state) => state.logout)
  const [toastVariant, setToastVariant] = useState<'warning' | 'error' | 'success' | 'hint'>(
    'warning'
  )
  const [toastTitle, setToastTitle] = useState<string>('')

  const handleOpenTravelModal = () => setIsModalOpen(true)
  const handleCloseLoginModal = () => setIsLoginModalOpen(false)

  const isUnauthorizedMessage = (message: string) => {
    const lower = message.toLowerCase()
    return (
      lower.includes('401') ||
      lower.includes('unauthor') ||
      lower.includes('토큰') ||
      lower.includes('token')
    )
  }

  const handleUnauthorized = useCallback(async () => {
    setToastMessage('로그인 세션이 만료되었습니다. 다시 로그인해주세요.')
    setIsModalOpen(false)
    await logout()
    setIsLoginModalOpen(true)
    setToastVariant('warning')
    setToastTitle('다시 로그인 필요')
  }, [logout])

  const loadTravels = useCallback(
    async (page: number = 1, options?: { skipReissue?: boolean; suppressLoading?: boolean }) => {
      console.log('📞 loadTravels called with page:', page)
      const { skipReissue = false, suppressLoading = false } = options ?? {}
      try {
        if (!suppressLoading) {
          setIsLoading(true)
        }
        if (!skipReissue) {
          setError(null)
        }
        const data = await TravelService.getTravelList(page)
        setTravels(data.trips)
        setCurrentPage(data.currentPage)
        setTotalPages(data.totalPages)
        setTotalCount(data.totalCount)
      } catch (error) {
        console.error('여행 목록 조회 실패:', error)
        const fallbackMessage = '여행 목록을 불러오는데 실패했습니다.'
        const message = error instanceof Error ? error.message : fallbackMessage

        if (!skipReissue && message && isUnauthorizedMessage(message)) {
          try {
            await AuthService.reissue()
            await loadTravels(page, { skipReissue: true, suppressLoading: true })
            return
          } catch (reissueError) {
            console.error('토큰 재발급 실패:', reissueError)
          }
        }

        if (message && isUnauthorizedMessage(message)) {
          await handleUnauthorized()
          setError('로그인 후 이용해주세요.')
        } else {
          setError(message || fallbackMessage)
        }
        setTravels([])
      } finally {
        if (!suppressLoading) {
          setIsLoading(false)
        }
      }
    },
    [handleUnauthorized]
  )

  const handleGoToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setSearchParams({ page: String(page) })
        // URL 변경만 수행 - useEffect에서 loadTravels 호출됨
      }
    },
    [totalPages, setSearchParams]
  )

  const handleCloseTravelModal = useCallback(() => {
    setIsModalOpen(false)
    // 새로운 여행 생성 후 첫 페이지로 리셋 - URL 변경만 수행
    setSearchParams({ page: '1' })
  }, [setSearchParams])

  useEffect(() => {
    const saved = sessionStorage.getItem('toastAfterLogin')
    if (saved) {
      setToastMessage(saved)
      setToastVariant('success')
      setToastTitle('로그인 성공')
      sessionStorage.removeItem('toastAfterLogin')
    }
  }, [])

  // URL의 page 파라미터가 변경될 때마다 로드
  useEffect(() => {
    const pageParam = searchParams.get('page')
    const page = parseInt(pageParam || '1', 10)
    console.log('🔄 URL Changed - pageParam:', pageParam, 'parsed page:', page)

    // URL에 page 파라미터가 없으면 추가
    if (!pageParam) {
      setSearchParams({ page: '1' }, { replace: true })
      return
    }

    loadTravels(page)
  }, [searchParams, loadTravels, setSearchParams])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const page = parseInt(searchParams.get('page') || '1', 10)
        loadTravels(page)
      }
    }

    const handleFocus = () => {
      if (!isFirstRender.current) {
        const page = parseInt(searchParams.get('page') || '1', 10)
        loadTravels(page)
      } else {
        isFirstRender.current = false
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [loadTravels, searchParams])

  return (
    <div>
      <ToastDock
        open={Boolean(toastMessage)}
        variant={toastVariant}
        title={toastTitle}
        message={toastMessage ?? ''}
        autoCloseMs={3000}
        offsetPx={16}
        onClose={() => setToastMessage(null)}
      />
      <main className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 mt-4 sm:mt-6 md:mt-8 pb-6">
        {isLoading ? (
          // 로딩 중
          <div className="flex justify-center items-center py-20">
            <p className="text-text-500 text-lg">여행 목록을 불러오는 중...</p>
          </div>
        ) : error ? (
          // 에러 발생
          <div className="flex flex-col justify-center items-center py-20">
            <p className="text-red-500 text-lg mb-4">{error}</p>
            <button
              onClick={() => loadTravels(1)}
              className="px-6 py-2 bg-gradient-to-br from-point-500 to-main-700 text-white rounded-full hover:scale-105 transition-transform"
            >
              다시 시도
            </button>
          </div>
        ) : (
          <>
            {/* 첫 번째 줄: 여행시작하기 + 3개 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6 lg:gap-8 justify-items-center mb-4 sm:mb-5 md:mb-6">
              <TravelAddCard onCreateTravel={handleOpenTravelModal} />
              {travels.length === 0 ? (
                <div className="col-span-full flex justify-center items-center py-10">
                  <p className="text-text-400 text-lg">
                    아직 생성된 여행이 없습니다. 첫 여행을 만들어보세요! ✈️
                  </p>
                </div>
              ) : (
                travels
                  .slice(0, 3)
                  .map((travel) => (
                    <TravelCard
                      key={travel.tripId}
                      tripId={travel.tripId}
                      title={travel.title}
                      date={`${travel.start_date} ~ ${travel.end_date}`}
                      img={travel.thumbnail || 'pwa-512x512.png'}
                      startDate={travel.start_date}
                      endDate={travel.end_date}
                    />
                  ))
              )}
            </div>

            {/* 두 번째 줄: 4개 */}
            {travels.length > 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6 lg:gap-8 justify-items-center">
                {travels.slice(3, 7).map((travel) => (
                  <TravelCard
                    key={travel.tripId}
                    tripId={travel.tripId}
                    title={travel.title}
                    date={`${travel.start_date} ~ ${travel.end_date}`}
                    img={travel.thumbnail || 'pwa-512x512.png'}
                    startDate={travel.start_date}
                    endDate={travel.end_date}
                  />
                ))}
              </div>
            )}

            {/* 페이지네이션 */}
            {totalPages > 0 && travels.length > 0 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <button
                  onClick={() => handleGoToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gradient-to-br from-point-500 to-main-700 text-white rounded-full hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  이전
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handleGoToPage(page)}
                    className={`min-w-[40px] px-3 py-2 rounded-full font-semibold transition-all ${
                      page === currentPage
                        ? 'bg-gradient-to-br from-point-500 to-main-700 text-white scale-110'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300 hover:scale-105'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => handleGoToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gradient-to-br from-point-500 to-main-700 text-white rounded-full hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {isModalOpen && <CreateTravelModal onClose={handleCloseTravelModal} />}
      {isLoginModalOpen && <LoginModal onClose={handleCloseLoginModal} />}
    </div>
  )
}

export default MyPage
