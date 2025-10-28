import GradientBackground from '@/features/mypage/GradientBackground'
import MyPageHeader from '@/features/mypage/MyPageHeader'
import { TravelCard, TravelAddCard } from '@/features/mypage/TravelCard'

const MyPage = () => {
  const trips = [
    { title: '여행 제목', date: '스위스 · 2024.08', img: '/img/sample1.jpg' },
    { title: '여행 제목', date: '스위스 · 2024.08', img: '/img/sample2.jpg' },
  ]

  return (
    <GradientBackground>
      <MyPageHeader />
      <main className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 mt-6 sm:mt-8 md:mt-10 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8 lg:gap-10 justify-items-center">
          <TravelAddCard />
          {/* 여행 리스트 아래는 목업이고 실제 데이터가 쌓였을 때 이거 불러와야 함!!!! */}
          {trips.map((t, i) => (
            <TravelCard key={i} {...t} />
          ))}
        </div>
      </main>
    </GradientBackground>
  )
}

export default MyPage
