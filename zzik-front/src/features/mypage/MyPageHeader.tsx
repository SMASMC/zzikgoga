import { Link } from 'react-router-dom'

const MyPageHeader = () => {
  return (
    <header className="w-full bg-white shadow-md">
      <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/mypage" className="text-2xl font-bold text-main-600">
          <img src="zzikgoga_logo.png" alt="logo" className="w-32" />
        </Link>
        <div className="flex items-center gap-4">
          <button className="w-10 h-10 bg-white rounded-full shadow-md flex justify-center items-center hover:bg-hover-500 transition-colors">
            <i className="text-point-600">🔔</i>
          </button>
          <button className="w-10 h-10 bg-white rounded-full shadow-md flex justify-center items-center hover:bg-hover-500 transition-colors">
            <i className="text-point-600">⚙️</i>
          </button>
          <div className="px-5 py-2 text-text-600 font-bmjua">
            김싸피님 반갑습니다
          </div>
        </div>
      </nav>
    </header>
  )
}
export default MyPageHeader
