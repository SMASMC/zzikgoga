import { Link } from 'react-router-dom'
import Header from '@components/blocks/Header'
import Button from '@components/atoms/Button'

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6">
          <h1 className="text-5xl font-bold text-gray-900">Zzikgoga에 오신 것을 환영합니다</h1>
          <p className="text-lg text-gray-600">블루 그린이 되나</p>

          <div className="flex gap-4 justify-center mt-8">
            <Link to="/auth">
              <Button variant="main" size="lg">
                로그인
              </Button>
            </Link>
            <Link to="/plan">
              <Button variant="main" size="lg">
                여행 계획하기
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default HomePage
