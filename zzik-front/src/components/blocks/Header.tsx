import { Link, useNavigate } from 'react-router-dom'
import SolidButton from '@/components/atoms/SolidButton'
import { useEffect, useState } from 'react'
import LoginModal from '@/features/auth/components/LoginModal'
import { useAuthStore } from '@/shared/stores/useAuthStore'

interface HeaderProps {
  transparentUntilScroll?: boolean
  scrollOffset?: number // px
}

const Header = ({ transparentUntilScroll = false, scrollOffset = 10 }: HeaderProps) => {
  const [scrolled, setScrolled] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  useEffect(() => {
    if (!transparentUntilScroll) return

    const onScroll = () => {
      setScrolled(window.scrollY > scrollOffset)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [transparentUntilScroll, scrollOffset])

  const wrapperBase = 'w-full'
  const wrapperMode = transparentUntilScroll
    ? `fixed top-0 left-0 right-0 z-50 ${scrolled ? 'bg-white shadow-md' : 'bg-transparent'}`
    : 'bg-white shadow-md'

  const handleLoginForm = () => {
    setIsLoginModalOpen(true)
  }

  const handleCloseLoginModal = () => {
    setIsLoginModalOpen(false)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <header className={`${wrapperBase} ${wrapperMode}`}>
      <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold">
          <img src="/zzikgoga_logo.png" alt="logo" className="w-32" />
        </Link>

        <div className="flex gap-4 items-center">
          {user ? (
            <SolidButton onClick={handleLogout} variant="point" size="md" rounded="full">
              로그아웃
            </SolidButton>
          ) : (
            <SolidButton onClick={handleLoginForm} variant="point" size="md" rounded="full">
              로그인
            </SolidButton>
          )}
        </div>
      </nav>

      {isLoginModalOpen && <LoginModal onClose={handleCloseLoginModal} />}
    </header>
  )
}

export default Header
