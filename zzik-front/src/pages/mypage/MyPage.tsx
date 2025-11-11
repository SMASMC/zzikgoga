import { useState, useEffect, useRef, useCallback } from 'react'
import { ToastDock } from '@/components/blocks/ToastDock'
import LoginModal from '@/features/auth/components/LoginModal'
import { TravelCard, TravelAddCard } from '@/features/mypage/components/TravelCard'
import CreateTravelModal from '@/features/mypage/components/CreateTravelModal'
import { TravelService } from '@/features/mypage/services/travelService'
import { Travel } from '@/features/mypage/types/mypage'
import { useAuthStore } from '@/shared/stores/useAuthStore'
import { AuthService } from '@/features/auth/services/authService'

const MyPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [travels, setTravels] = useState<Travel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const isFirstRender = useRef(true)
  const logout = useAuthStore((state) => state.logout)

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
  }, [logout])

  const loadTravels = useCallback(
    async (options?: { skipReissue?: boolean; suppressLoading?: boolean }) => {
      const { skipReissue = false, suppressLoading = false } = options ?? {}
      try {
        if (!suppressLoading) {
          setIsLoading(true)
        }
        if (!skipReissue) {
          setError(null)
        }
        const data = await TravelService.getTravelList()
        setTravels(data)
      } catch (error) {
        console.error('여행 목록 조회 실패:', error)
        const fallbackMessage = '여행 목록을 불러오는데 실패했습니다.'
        const message = error instanceof Error ? error.message : fallbackMessage

        if (!skipReissue && message && isUnauthorizedMessage(message)) {
          try {
            await AuthService.reissue()
            await loadTravels({ skipReissue: true, suppressLoading: true })
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

  const handleCloseTravelModal = useCallback(() => {
    setIsModalOpen(false)
    loadTravels()
  }, [loadTravels])

  useEffect(() => {
    const saved = sessionStorage.getItem('toastAfterLogin')
    if (saved) {
      setToastMessage(saved)
      sessionStorage.removeItem('toastAfterLogin')
    }
  }, [])

  useEffect(() => {
    // 초기 로드
    loadTravels()

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadTravels()
      }
    }

    const handleFocus = () => {
      if (!isFirstRender.current) {
        loadTravels()
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
  }, [loadTravels])

  return (
    <div>
      <ToastDock
        open={Boolean(toastMessage)}
        variant="warning"
        title="다시 로그인 필요"
        message={toastMessage ?? ''}
        autoCloseMs={3000}
        offsetPx={16}
        onClose={() => setToastMessage(null)}
      />
      <main className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 mt-6 sm:mt-8 md:mt-10 pb-10">
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
              onClick={() => loadTravels()}
              className="px-6 py-2 bg-gradient-to-br from-point-500 to-main-700 text-white rounded-full hover:scale-105 transition-transform"
            >
              다시 시도
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8 lg:gap-10 justify-items-center">
            <TravelAddCard onCreateTravel={handleOpenTravelModal} />
            {travels.length === 0 ? (
              <div className="col-span-full flex justify-center items-center py-10">
                <p className="text-text-400 text-lg">
                  아직 생성된 여행이 없습니다. 첫 여행을 만들어보세요! ✈️
                </p>
              </div>
            ) : (
              travels.map((travel) => (
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
        )}
      </main>

      {isModalOpen && <CreateTravelModal onClose={handleCloseTravelModal} />}
      {isLoginModalOpen && <LoginModal onClose={handleCloseLoginModal} />}
    </div>
  )
}

export default MyPage
