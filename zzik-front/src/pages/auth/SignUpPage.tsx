// src/pages/auth/SignupPage.tsx
import { useSearchParams } from 'react-router-dom'
import SignUpForm from '@/features/auth/components/SignUpForm'

export function SignupPage() {
  const [params] = useSearchParams()
  const signupSessionToken = params.get('token')

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <SignUpForm signupSessionToken={signupSessionToken} />
    </div>
  )
}
