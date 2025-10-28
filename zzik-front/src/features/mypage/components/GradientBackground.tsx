// 그라데이션 되어있는 배경

const GradientBackground = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background-500 via-background-600 to-background-500 overflow-hidden relative">
      {/* 부드러운 블러 원 - tailwind.config.js 색상 사용 */}
      <div
        className="absolute w-72 h-72 opacity-20 blur-[80px] left-[40%] top-[100px]"
        style={{
          background:
            'radial-gradient(ellipse 98% 98% at 30% 30%, #7DD3FC 0%, #3B82F6 50%, #1E40AF 100%)',
        }}
      />
      <div
        className="absolute w-80 h-80 opacity-20 blur-[90px] left-[10%] top-[600px]"
        style={{
          background:
            'radial-gradient(ellipse 98% 98% at 30% 30%, #CFF3FF 0%, #7DD3FC 50%, #3B82F6 100%)',
        }}
      />
      {children}
    </div>
  )
}
export default GradientBackground
