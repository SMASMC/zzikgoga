import { Link } from 'react-router-dom'
import Header from '@components/blocks/Header'
import SolidButton from '@/components/atoms/SolidButton'

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6">
          <h1 className="text-5xl font-bold text-gray-900">Zzikgoga에 오신 것을 환영합니다</h1>

          <div className="flex gap-4 justify-center mt-8">
            <Link to="/auth">
              <SolidButton variant="main" size="lg">
                로그인
              </SolidButton>
            </Link>
            <Link to="/mypage">
              <SolidButton variant="hover" size="lg">
                마이페이지
              </SolidButton>
            </Link>
            <Link to="/plan">
              <SolidButton variant="point" size="lg">
                여행 계획하기
              </SolidButton>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default HomePage
