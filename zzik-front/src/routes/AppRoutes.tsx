import { Routes, Route } from 'react-router-dom'
import HomePage from '@/pages/home/HomePage'
import { OAuthCallbackPage } from '@/pages/auth/OAuthCallbackPage'
import PlanPage from '@/pages/plan/PlanPage'
import MyPage from '@/pages/mypage/MyPage'
import { SignupPage } from '@/pages/auth/SignUpPage'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PublicOnlyRoute } from '@/components/auth/PublicOnlyRoute'

const AppRoutes = () => {
  return (
    <Routes>
      {/* 누구나 접근 가능 */}
      <Route path="/" element={<HomePage />} />
      <Route path="/auth/callback" element={<OAuthCallbackPage />} />

      {/* 비로그인 사용자만 접근 가능 */}
      <Route
        path="/auth/signup"
        element={
          <PublicOnlyRoute>
            <SignupPage />
          </PublicOnlyRoute>
        }
      />

      {/* 로그인 사용자만 접근 가능 */}
      <Route
        path="/plan"
        element={
          <ProtectedRoute>
            <PlanPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mypage"
        element={
          <ProtectedRoute>
            <MyPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default AppRoutes
