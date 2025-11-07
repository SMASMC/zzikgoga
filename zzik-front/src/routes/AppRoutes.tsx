import { Routes, Route } from 'react-router-dom'
import HomePage from '@/pages/home/HomePage'
import { OAuthCallbackPage } from '@/pages/auth/OAuthCallbackPage'
import PlanPage from '@/pages/plan/PlanPage'
import MyPage from '@/pages/mypage/MyPage'
import { SignupPage } from '@/pages/auth/SignUpPage'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PublicOnlyRoute } from '@/components/auth/PublicOnlyRoute'
import CostPage from '@/pages/cost/CostPage'
import { InviteCallbackPage } from '@/pages/plan/InviteCallbackPage'

const AppRoutes = () => {
  return (
    <Routes>
      {/* 누구나 접근 가능 */}
      {/* 1. 홈 화면 */}
      <Route path="/" element={<HomePage />} />
      {/* 2. OAuth 콜백 */}
      <Route path="/auth/callback" element={<OAuthCallbackPage />} />
      {/* 3. 초대 링크 (query parameter 방식) */}
      <Route path="/invite" element={<InviteCallbackPage />} />

      {/* 비로그인 사용자만 접근 가능 */}
      {/* 3. 회원가입 */}
      <Route
        path="/auth/signup"
        element={
          <PublicOnlyRoute>
            <SignupPage />
          </PublicOnlyRoute>
        }
      />

      {/* 로그인 사용자만 접근 가능 */}
      {/* 4. 여행 계획 */}
      <Route
        path="/plan/:tripId"
        element={
          <ProtectedRoute>
            <PlanPage />
          </ProtectedRoute>
        }
      />
      {/* 5. 마이페이지 */}
      <Route
        path="/mypage"
        element={
          <ProtectedRoute>
            <MyPage />
          </ProtectedRoute>
        }
      />
      {/* 6. 정산 */}
      <Route
        path="/cost/:tripId"
        element={
          <ProtectedRoute>
            <CostPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default AppRoutes
