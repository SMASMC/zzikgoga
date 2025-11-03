import { Routes, Route } from 'react-router-dom'
import HomePage from '@/pages/home/HomePage'
import { OAuthCallbackPage } from '@/pages/auth/OAuthCallbackPage'
import PlanPage from '@/pages/plan/PlanPage'
import MyPage from '@/pages/mypage/MyPage'
import { SignupPage } from '@/pages/auth/SignUpPage'

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/auth/signup" element={<SignupPage />} />
      <Route path="/auth/callback" element={<OAuthCallbackPage />} />
      <Route path="/plan" element={<PlanPage />} />
      <Route path="/mypage" element={<MyPage />} />
    </Routes>
  )
}

export default AppRoutes
