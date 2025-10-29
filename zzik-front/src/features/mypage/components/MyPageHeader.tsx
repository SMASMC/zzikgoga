// 마이페이지에서만 필요할 것 같아서 만든 헤더
import { Link } from 'react-router-dom'

const MyPageHeader = () => {
  return (
    <header className="w-full bg-white shadow-md">
      <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/mypage" className="text-2xl font-bold text-main-600">
          <img src="zzikgoga_logo.png" alt="logo" className="w-32" />
        </Link>
        <div className="flex items-center gap-4">
          <div className="px-5 py-2 text-text-600 font-bmjua">김싸피님 반갑습니다</div>
        </div>
      </nav>
    </header>
  )
}
export default MyPageHeader
