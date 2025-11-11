import Header from '@components/blocks/Header'
import LoginForm from '@features/auth/components/LoginForm'

const LoginPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header showBackButton />

      <main className="container mx-auto px-4 py-16 flex justify-center">
        <LoginForm />
      </main>
    </div>
  )
}

export default LoginPage
