import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Input from '@components/atoms/Input'
import SolidButton from '@components/atoms/SolidButton'
import { SignupRequest } from '../types/auth'
import { AuthService } from '../services/authService'
import { useAuthStore } from '@/shared/stores/useAuthStore'

interface SignupFormProps {
  signupSessionToken: string | null
  initialEmail?: string
  initialName?: string
  initialPicture?: string
}

const SignUpForm = ({
  signupSessionToken,
  initialEmail = '',
  initialName = '',
  initialPicture = '',
}: SignupFormProps) => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<Omit<SignupRequest, 'signupSessionToken'>>({
    name: initialName,
    email: initialEmail,
    picture: initialPicture,
    gender: '',
    birthYear: new Date().getFullYear() - 20,
    bankCode: '',
    accountNum: '',
  })

  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({})

  console.log(formData)

  const handleChange =
    (field: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value
      setFormData((prev) => ({ ...prev, [field]: value }))
      // 에러 클리어
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }))
      }
    }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof typeof formData, string>> = {}

    if (!formData.gender) {
      newErrors.gender = '성별을 선택해주세요'
    }

    const currentYear = new Date().getFullYear()
    if (!formData.birthYear || formData.birthYear < 1900 || formData.birthYear > currentYear) {
      newErrors.birthYear = `출생년도를 확인해주세요 (1900-${currentYear})`
    }

    if (!formData.bankCode) {
      newErrors.bankCode = '은행을 선택해주세요'
    }

    if (!formData.accountNum.trim()) {
      newErrors.accountNum = '계좌번호를 입력해주세요'
    } else if (!/^\d+$/.test(formData.accountNum)) {
      newErrors.accountNum = '계좌번호는 숫자만 입력 가능합니다'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!signupSessionToken) {
      alert('유효하지 않은 회원가입 세션입니다')
      navigate('/auth')
      return
    }

    if (!validate()) {
      return
    }

    try {
      const registerData: SignupRequest = {
        ...formData,
        signupSessionToken,
      }

      console.log('회원가입 요청 데이터:', registerData)

      const response = await AuthService.register(registerData)
      console.log('회원가입 응답:', response)

      // accessToken과 user 정보를 store에 저장
      if (response.loggedIn && response.user) {
        useAuthStore.getState().setAuth(response.user)
        console.log('회원가입 성공 - 로그인 정보 전역 저장 완료')
        console.log('사용자 정보 저장 완료:', response.user)
      } else {
        throw new Error('회원가입 응답에 필수 정보가 없습니다')
      }

      alert('회원가입이 완료되었습니다!')
      console.log('mypage로 이동')
      navigate('/mypage', { replace: true })
    } catch (error) {
      console.error('회원가입 실패:', error)
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
      alert(errorMessage)
    }
  }

  // 한국 주요 은행 목록
  const banks = [
    {
      code: '001',
      name: '한국은행',
    },
    {
      code: '002',
      name: '산업은행',
    },
    {
      code: '003',
      name: '기업은행',
    },
    {
      code: '004',
      name: '국민은행',
    },
    {
      code: '011',
      name: '농협은행',
    },
    {
      code: '020',
      name: '우리은행',
    },
    {
      code: '023',
      name: 'SC제일은행',
    },
    {
      code: '027',
      name: '시티은행',
    },
    {
      code: '032',
      name: '대구은행',
    },
    {
      code: '034',
      name: '광주은행',
    },
    {
      code: '035',
      name: '제주은행',
    },
    {
      code: '037',
      name: '전북은행',
    },
    {
      code: '039',
      name: '경남은행',
    },
    {
      code: '045',
      name: '새마을금고',
    },
    {
      code: '081',
      name: 'KEB하나은행',
    },
    {
      code: '088',
      name: '신한은행',
    },
    {
      code: '090',
      name: '카카오뱅크',
    },
    {
      code: '999',
      name: '싸피은행',
    },
  ]

  return (
    <div className="w-full max-w-md space-y-4">
      <h1 className="text-3xl font-bmjua font-bold text-center mb-6">추가 정보 입력</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">성별</label>
          <select
            value={formData.gender}
            onChange={handleChange('gender')}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.gender ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">성별을 선택하세요</option>
            <option value="MALE">남성</option>
            <option value="FEMALE">여성</option>
          </select>
          {errors.gender && <p className="mt-1 text-sm text-red-500">{errors.gender}</p>}
        </div>

        <Input
          label="출생년도"
          type="number"
          placeholder="1995"
          value={formData.birthYear}
          onChange={handleChange('birthYear')}
          error={errors.birthYear}
          min={1900}
          max={new Date().getFullYear()}
        />

        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">은행</label>
          <select
            value={formData.bankCode}
            onChange={handleChange('bankCode')}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.bankCode ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">은행을 선택하세요</option>
            {banks.map((bank) => (
              <option key={bank.code} value={bank.code}>
                {bank.name}
              </option>
            ))}
          </select>
          {errors.bankCode && <p className="mt-1 text-sm text-red-500">{errors.bankCode}</p>}
        </div>

        <Input
          label="계좌번호"
          placeholder="숫자만 입력하세요 (- 제외)"
          value={formData.accountNum}
          onChange={handleChange('accountNum')}
          error={errors.accountNum}
        />

        <SolidButton type="submit" variant="main" size="lg" className="w-full mt-6">
          회원가입 완료
        </SolidButton>
      </form>
    </div>
  )
}

export default SignUpForm
