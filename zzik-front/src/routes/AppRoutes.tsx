import { Routes, Route } from 'react-router-dom'
import HomePage from '@pages/home/HomePage'
import LoginPage from '@pages/auth/LoginPage'
import { OAuthCallbackPage } from '@pages/auth/OAuthCallbackPage'
import PlanPage from '@pages/plan/PlanPage'
import MyPage from '@pages/mypage/MyPage'

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/auth" element={<LoginPage />} />
      <Route path="/auth/callback" element={<OAuthCallbackPage />} />
      <Route path="/plan" element={<PlanPage />} />
      <Route path="/mypage" element={<MyPage />} />
    </Routes>
  )
}

export default AppRoutes
