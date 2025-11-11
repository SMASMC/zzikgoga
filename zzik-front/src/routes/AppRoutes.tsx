import type { ReactNode } from 'react'
import { Routes, Route, Outlet } from 'react-router-dom'
import BackgroundLayout from '@/components/layout/BackgroundLayout'
import Header from '@/components/blocks/Header'
import HomePage from '@/pages/home/HomePage'
import { OAuthCallbackPage } from '@/pages/auth/OAuthCallbackPage'
import PlanPage from '@/pages/plan/PlanPage'
import MyPage from '@/pages/mypage/MyPage'
import { SignupPage } from '@/pages/auth/SignUpPage'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PublicOnlyRoute } from '@/components/auth/PublicOnlyRoute'
import CostPage from '@/pages/cost/CostPage'
import { InviteCallbackPage } from '@/pages/plan/InviteCallbackPage'

type BackgroundShellProps = {
  header?: ReactNode
}

const BackgroundShell = ({ header }: BackgroundShellProps) => (
  <BackgroundLayout>
    <div className="flex min-h-screen flex-col">
      {header === undefined ? <Header showBackButton /> : header}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  </BackgroundLayout>
)

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      <Route element={<BackgroundShell />}>
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />
        <Route path="/invite" element={<InviteCallbackPage />} />
        <Route
          path="/auth/signup"
          element={
            <PublicOnlyRoute>
              <SignupPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/cost/:tripId"
          element={
            <ProtectedRoute>
              <CostPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Plan 페이지는 Header를 직접 렌더링하여 커서 공유 */}
      <Route element={<BackgroundShell header={null} />}>
        <Route
          path="/plan/:tripId"
          element={
            <ProtectedRoute>
              <PlanPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route element={<BackgroundShell />}>
        <Route
          path="/mypage"
          element={
            <ProtectedRoute>
              <MyPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  )
}

export default AppRoutes
