import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import SolidButton from '@/components/atoms/SolidButton'
import LoginModal from '@/features/auth/components/LoginModal'
import { useAuthStore } from '@/shared/stores/useAuthStore'
import { ToastDock } from '@/components/blocks/ToastDock'

interface HeaderProps {
  transparentUntilScroll?: boolean
  scrollOffset?: number // px
  showBackButton?: boolean
  whiteBackground?: boolean
  backUrl?: string // 커스텀 뒤로가기 URL (지정하지 않으면 기본 동작)
}

const Header = ({
  transparentUntilScroll = false,
  scrollOffset = 10,
  showBackButton = false,
  whiteBackground = false,
  backUrl,
}: HeaderProps) => {
  const headerRef = useRef<HTMLElement | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
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

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return undefined
    const element = headerRef.current
    if (!element) return undefined

    const setHeaderHeight = () => {
      const nextHeight = Math.round(element.getBoundingClientRect().height)
      document.documentElement.style.setProperty(
        '--zzik-header-height',
        `${Number.isFinite(nextHeight) ? nextHeight : 0}px`
      )
    }

    setHeaderHeight()

    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(() => setHeaderHeight())
      observer.observe(element)
      return () => {
        observer.disconnect()
        document.documentElement.style.removeProperty('--zzik-header-height')
      }
    }

    window.addEventListener('resize', setHeaderHeight)
    return () => {
      window.removeEventListener('resize', setHeaderHeight)
      document.documentElement.style.removeProperty('--zzik-header-height')
    }
  }, [])

  const wrapperBase = 'w-full'
  const wrapperMode = whiteBackground
    ? 'sticky top-0 z-40 bg-white shadow-sm'
    : transparentUntilScroll
      ? `fixed top-0 left-0 right-0 z-50 ${
          scrolled ? 'bg-white/90 shadow-md backdrop-blur' : 'bg-transparent'
        }`
      : 'sticky top-0 z-40 bg-transparent backdrop-blur'

  const handleLoginForm = () => {
    setIsLoginModalOpen(true)
  }

  const handleCloseLoginModal = () => {
    setIsLoginModalOpen(false)
  }

  const handleLogout = async () => {
    await logout()
    setToastMessage('로그아웃되었습니다.')
    navigate('/')
  }

  const handleBack = () => {
    if (backUrl) {
      navigate(backUrl)
      return
    }
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/')
  }

  const greeting = user ? `${user.name ?? '사용자'}님 반갑습니다` : '로그인이 필요해요'

  return (
    <header ref={headerRef} className={`${wrapperBase} ${wrapperMode}`} data-toast-anchor>
      <ToastDock
        open={Boolean(toastMessage)}
        variant="hint"
        title="알림"
        message={toastMessage ?? ''}
        autoCloseMs={3000}
        offsetPx={12}
        onClose={() => setToastMessage(null)}
      />
      <nav className="container mx-auto flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <button
              type="button"
              onClick={handleBack}
              aria-label="뒤로가기"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-main-600 shadow-sm transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-point-500/60"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <Link to="/" className="text-2xl font-bold">
            <img src="/zzikgoga_logo.png" alt="logo" className="w-32" />
          </Link>
        </div>

        <div className="flex gap-4 items-center">
          <span className="rounded-full bg-white/30 px-4 py-1.5 text-sm font-bmjua text-text-500/90 shadow-sm backdrop-blur">
            {greeting}
          </span>
          {user ? (
            <SolidButton onClick={handleLogout} variant="main" size="md" rounded="full">
              로그아웃
            </SolidButton>
          ) : (
            <SolidButton onClick={handleLoginForm} variant="main" size="md" rounded="full">
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
