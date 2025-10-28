import { Link } from 'react-router-dom'
import SolidButton from '@/components/atoms/SolidButton'

const Header = () => {
  return (
    <header className="w-full bg-white shadow-md">
      <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-main-600">
          <img src="zzikgoga_logo.png" alt="logo" className="w-32" />
        </Link>

        <div className="flex gap-4 items-center">
          <Link to="/auth">
            <SolidButton variant="point" size="sm">
              로그인
            </SolidButton>
          </Link>
        </div>
      </nav>
    </header>
  )
}

export default Header
