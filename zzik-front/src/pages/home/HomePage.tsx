import Header from '@components/blocks/Header'
import { Button } from '@components/atoms/Button'
import { useState, useEffect, cloneElement, isValidElement, useRef } from 'react'
import { ChevronLeft, ChevronRight, Wallet, MessageSquare, BookOpen } from 'lucide-react'
import { ImageWithFallback } from '@/components/atoms/ImageWithFallback'
import { Link, useSearchParams } from 'react-router-dom'
import ErrorModal from '@/components/atoms/ErrorModal'

interface OnboardingSlide {
  id: number
  title: string
  description: string
  image: string
  icon: React.ReactNode
  color: string
}

const slides: OnboardingSlide[] = [
  {
    id: 1,
    title: '실시간 협업 계획',
    description:
      '커서챗으로 여행 계획을 함께 세우세요. 실시간으로 대화하며 모두의 의견을 모아 완벽한 여행을 만들어보세요.',
    image: '/home/mainpage_1.jpg',
    icon: <MessageSquare />,
    color: '#7DD3FC',
  },
  {
    id: 2,
    title: '간편한 여행 정산',
    description:
      '친구들과 함께한 여행 경비를 쉽고 빠르게 정산하세요. 누가 얼마를 냈는지 한눈에 확인하고 공정하게 나눌 수 있습니다.',
    image: '/home/settle.jpg',
    icon: <Wallet />,
    color: '#3B82F6',
  },
  {
    id: 3,
    title: '소중한 여행 기록',
    description:
      '여행의 모든 순간을 기록하고 추억을 되새기세요. 사진, 메모, 경로까지 하나의 여행 다이어리로 완성됩니다.',
    image:
      'https://images.unsplash.com/photo-1759823420597-2b2c0fbe522b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjBqb3VybmFsJTIwbWVtb3JpZXN8ZW58MXx8fHwxNzYxMjY5NjM2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    icon: <BookOpen />,
    color: '#1E40AF',
  },
  // {
  //   id: 4,
  //   title: '블록체인 영구 보관',
  //   description:
  //     '소중한 여행 사진을 블록체인에 안전하게 저장하세요. 언제까지나 변하지 않는 추억을 영원히 간직할 수 있습니다.',
  //   image:
  //     'https://images.unsplash.com/photo-1736944288238-27348f74c1d0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjBwaG90b3MlMjBjYW1lcmF8ZW58MXx8fHwxNzYxMjY5NjM3fDA&ixlib=rb-4.1.0&q=80&w=1080',
  //   icon: <Shield />,
  //   color: '#CFF3FF',
  // },
]

const HomePage = () => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const errorType = searchParams.get('error')
  
  // 터치 스와이프를 위한 상태
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)
  const minSwipeDistance = 50 // 최소 스와이프 거리 (px)

  const handleCloseErrorModal = () => {
    // URL에서 error 파라미터 제거
    searchParams.delete('error')
    setSearchParams(searchParams)
  }

  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length)
      }, 4000)

      return () => clearInterval(interval)
    }
  }, [isPaused])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  // 터치 이벤트 핸들러
  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null
    touchStartX.current = e.targetTouches[0].clientX
  }

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return

    const distance = touchStartX.current - touchEndX.current
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      nextSlide()
    } else if (isRightSwipe) {
      prevSlide()
    }

    // 리셋
    touchStartX.current = null
    touchEndX.current = null
  }

  const current = slides[currentSlide]
  const gradientMap: Record<number, string> = {
    1: 'from-blue-500 to-blue-700',
    2: 'from-sky-300 to-cyan-400',
    3: 'from-indigo-800 to-blue-700',
  }
  // const Icon = current.icon

  return (
    <div className="min-h-screen bg-background-500">
      <Header transparentUntilScroll />

      {/* 에러 모달 */}
      {errorType && <ErrorModal errorType={errorType} onClose={handleCloseErrorModal} />}
      <div
        className="relative h-screen w-full overflow-hidden"
        style={{ backgroundColor: '#0A0F1A' }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 transition-opacity duration-1000">
          <ImageWithFallback
            src={current.image}
            alt={current.title}
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0 transition-colors duration-1000"
            // style={{
            //   background: `linear-gradient(135deg, rgba(10, 15, 26, 0.85) 0%, rgba(10, 15, 26, 0.7) 5%, transparent 100%)`,
            // }}
          />
        </div>

        {/* Content Container */}
        <div className="relative z-10 h-full flex flex-col">
          {/* Main Content */}
          <div className="flex-1 flex items-center">
            <div className="w-full max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left Side - Text Content */}
              <div className="space-y-8">
                <div
                  className="inline-flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-md transition-all duration-500"
                  style={{
                    backgroundColor: `${current.color}20`,
                    border: `2px solid ${current.color}`,
                  }}
                >
                  {/* <Icon className="w-6 h-6" style={{ color: current.color }} /> */}
                  <span className="tracking-wide" style={{ color: current.color }}>
                    {`0${currentSlide + 1}`}
                  </span>
                </div>

                <div className="space-y-4 transition-all duration-500">
                  <h1 className="text-5xl lg:text-6xl leading-tight font-extrabold drop-shadow-lg tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-point-500 via-hover-600 to-main-500">
                    {current.title}
                  </h1>
                  <p className="text-white text-lg lg:text-xl leading-relaxed max-w-xl drop-shadow">
                    {current.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-4">
                  {(() => {
                    const primary =
                      current.id === 1
                        ? { label: '계획 하기', to: '/mypage' }
                        : current.id === 2
                          ? { label: '정산 하기', to: '/mypage' }
                          : current.id === 3
                            ? { label: '기록 하기', to: '/mypage' }
                            : { label: '시작하기', to: '/' }
                    return (
                      <Link to={primary.to}>
                        <Button
                          className={`px-8 py-6 rounded-full transition-all duration-300 hover:scale-105 shadow-xl ring-2 ring-white/20 bg-gradient-to-br ${gradientMap[current.id] ?? 'from-blue-500 to-blue-700'}`}
                          style={{ color: '#FFFFFF' }}
                        >
                          {primary.label}
                        </Button>
                      </Link>
                    )
                  })()}
                </div>
              </div>

              {/* Right Side - Feature Icon */}
              <div className="hidden lg:flex items-center justify-center">
                <div
                  className="relative w-80 h-80 rounded-full flex items-center justify-center backdrop-blur-xl transition-all duration-500 animate-pulse-slow"
                  style={{
                    backgroundColor: `${current.color}15`,
                    border: `3px solid ${current.color}40`,
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-full animate-ping opacity-20"
                    style={{ backgroundColor: current.color }}
                  />
                  {isValidElement(current.icon)
                    ? cloneElement(current.icon as React.ReactElement, {
                        className:
                          'w-32 h-32 z-10 transition-transform duration-500 hover:scale-110',
                        style: { color: current.color },
                      })
                    : null}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="px-8 py-8">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              {/* Navigation Arrows */}
              <div className="flex gap-3">
                <button
                  onClick={prevSlide}
                  className="w-12 h-12 rounded-full backdrop-blur-md border border-white/20 text-white hover:bg-white/10 flex items-center justify-center transition-all duration-200"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextSlide}
                  className="w-12 h-12 rounded-full backdrop-blur-md border border-white/20 text-white hover:bg-white/10 flex items-center justify-center transition-all duration-200"
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Progress Dots */}
              <div className="flex gap-3">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    onClick={() => goToSlide(index)}
                    className="relative group"
                    aria-label={`Go to slide ${index + 1}`}
                  >
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        currentSlide === index ? 'w-12' : 'w-2 group-hover:w-8'
                      }`}
                      style={{
                        backgroundColor: currentSlide === index ? slide.color : '#ffffff40',
                      }}
                    />
                    {currentSlide === index && (
                      <div
                        className="absolute top-0 left-0 h-2 rounded-full animate-progress"
                        style={{ backgroundColor: slide.color }}
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Skip Button */}
              <div className="text-white/60 hover:text-white transition-colors duration-200 px-4 py-2"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage
