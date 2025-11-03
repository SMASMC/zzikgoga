// src/pages/auth/SignupPage.tsx
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { useAuthStore } from '../../shared/stores/useAuthStore'

export function SignupPage() {
  const [params] = useSearchParams()
  const signupSessionToken = params.get('token')
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  const [form, setForm] = useState({
    gender: 'MALE',
    birthYear: 2000,
    bankCode: '',
    accountNum: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async () => {
    try {
      const payload = {
        ...form,
        signupSessionToken,
        picture: 'http://k.kakaocdn.net/dn/example.jpg',
        name: '이준희',
        email: 'ljntiger325@naver.com',
      }

      const { data } = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/signup`, payload)

      if (data.accessToken) {
        setAuth(data.user, data.accessToken)
        navigate('/', { replace: true })
      }
    } catch (err) {
      console.error('회원가입 실패:', err)
      alert('회원가입 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold mb-4">추가 정보 입력</h1>
      <input
        name="bankCode"
        placeholder="은행 코드"
        onChange={handleChange}
        className="border p-2 w-full"
      />
      <input
        name="accountNum"
        placeholder="계좌번호"
        onChange={handleChange}
        className="border p-2 w-full"
      />
      <input
        name="birthYear"
        placeholder="출생연도"
        onChange={handleChange}
        className="border p-2 w-full"
      />
      <button
        onClick={handleSubmit}
        className="bg-yellow-400 text-black font-semibold w-full py-2 rounded"
      >
        회원가입 완료
      </button>
    </div>
  )
}
