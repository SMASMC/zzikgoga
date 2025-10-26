import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Input from '@components/atoms/Input'
import Button from '@components/atoms/Button'
import { useLogin } from '../hooks/useLogin'

const LoginForm = () => {
  const navigate = useNavigate()
  const { login, isLoading, error } = useLogin()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    try {
      await login(formData)
      navigate('/')
    } catch (err) {
      console.error('Login failed:', err)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
      <h2 className="text-2xl font-bold text-center mb-6">로그인</h2>

      <Input
        type="email"
        label="이메일"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="이메일을 입력하세요"
        required
      />

      <Input
        type="password"
        label="비밀번호"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        placeholder="비밀번호를 입력하세요"
        required
      />

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? '로그인 중...' : '로그인'}
      </Button>
    </form>
  )
}

export default LoginForm
