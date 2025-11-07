import GradientBackground from '@/components/blocks/GradientBackground'
import MyPageHeader from '@/features/mypage/components/MyPageHeader'
import { TravelCard, TravelAddCard } from '@/features/mypage/components/TravelCard'
import CreateTravelModal from '@/features/mypage/components/CreateTravelModal'
import { useState, useEffect, useRef } from 'react'
import { TravelService } from '@/features/mypage/services/travelService'
import { Travel } from '@/features/mypage/types/mypage'

const MyPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [travels, setTravels] = useState<Travel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isFirstRender = useRef(true)

  const handleOpenTravelModal = () => setIsModalOpen(true)
  const handleCloseTravelModal = () => {
    setIsModalOpen(false)
    loadTravels()
  }

  const loadTravels = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await TravelService.getTravelList()
      setTravels(data)
      console.log('여행 목록 조회 성공:', data)
    } catch (error) {
      console.error('여행 목록 조회 실패:', error)
      setError(error instanceof Error ? error.message : '여행 목록을 불러오는데 실패했습니다.')
      setTravels([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // 초기 로드
    loadTravels()

    // 페이지가 보일 때마다 여행 목록 새로고침 (탭 전환, 다른 앱에서 돌아올 때)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('페이지가 다시 보임 (탭 전환) - 여행 목록 새로고침')
        loadTravels()
      }
    }

    // 윈도우 포커스 이벤트 (다른 페이지에서 MyPage로 돌아올 때)
    const handleFocus = () => {
      // 첫 렌더링에서는 실행하지 않음 (이미 loadTravels()가 실행되었으므로)
      if (!isFirstRender.current) {
        console.log('🔄 MyPage로 돌아옴 - 여행 목록 새로고침')
        loadTravels()
      } else {
        isFirstRender.current = false
      }
    }

    // 이벤트 리스너 등록
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    // cleanup 함수
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  return (
    <GradientBackground>
      <MyPageHeader />
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
              onClick={loadTravels}
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
                />
              ))
            )}
          </div>
        )}
      </main>

      {isModalOpen && <CreateTravelModal onClose={handleCloseTravelModal} />}
    </GradientBackground>
  )
}

export default MyPage
