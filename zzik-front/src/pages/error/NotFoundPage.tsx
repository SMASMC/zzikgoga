import { Link } from 'react-router-dom'
import SolidButton from '@/components/atoms/SolidButton'

const NotFoundPage = () => {
  return (
    <div>
      <main className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 mt-6 sm:mt-8 md:mt-10 pb-10">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          {/* 404 숫자 */}
          <div className="mb-8">
            <h1 className="text-9xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-point-500 via-hover-600 to-main-500 font-bmjua">
              404
            </h1>
          </div>
          <div className="mb-8">
            <img src="crying.png" alt="" className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40" />
          </div>

          {/* 메시지 */}
          <div className="mb-8 space-y-4">
            <h2 className="text-3xl font-bold text-text-500 font-bmjua">
              페이지를 찾을 수 없습니다
            </h2>
            <p className="text-lg text-text-600 max-w-md">
              요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
              <br />
              URL을 확인해주세요.
            </p>
          </div>

          {/* 버튼 */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/">
              <SolidButton className="px-8 py-3 rounded-full">홈으로 가기</SolidButton>
            </Link>
            <Link to="/mypage">
              <SolidButton className="px-8 py-3 rounded-full">내 여행 보기</SolidButton>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default NotFoundPage
