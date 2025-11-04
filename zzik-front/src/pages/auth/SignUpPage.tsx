// src/pages/auth/SignupPage.tsx
import { Navigate, useLocation } from 'react-router-dom'
import SignUpForm from '@/features/auth/components/SignUpForm'

export function SignupPage() {
  const location = useLocation();
  const data = location.state

  if (!data || !data.signupRequired || !data.signupSessionToken) {
    console.error('회원가입 세션 정보가 없습니다. 홈으로 이동합니다.')
    return <Navigate to="/" replace />
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <SignUpForm
        signupSessionToken={data.signupSessionToken}
        initialName={data.name}
        initialEmail={data.email}
        initialPicture={data.picture}
      />
    </div>
  )
}
