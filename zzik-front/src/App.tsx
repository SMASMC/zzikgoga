import { BrowserRouter } from 'react-router-dom'
import AppRoutes from '@routes/AppRoutes'
import AuthProvider from '@/components/auth/AuthProvider'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
