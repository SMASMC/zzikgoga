import { Routes, Route } from 'react-router-dom'
import HomePage from '@pages/HomePage'
import AuthPage from '@pages/AuthPage'
import PlanPage from '@pages/PlanPage'

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/plan" element={<PlanPage />} />
    </Routes>
  )
}

export default AppRoutes
