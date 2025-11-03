import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Input from '@components/atoms/Input'
import SolidButton from '@components/atoms/SolidButton'
import { RegisterRequest } from '../types/auth'

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
  const [formData, setFormData] = useState<Omit<RegisterRequest, 'signupSessionToken'>>({
    name: initialName,
    email: initialEmail,
    picture: initialPicture,
    gender: '',
    birthYear: new Date().getFullYear() - 20,
    bankCode: '',
    accountNum: '',
  })

  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({})
  const [profilePreview, setProfilePreview] = useState<string>(initialPicture)
  const [isUploading, setIsUploading] = useState(false)

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다')
      return
    }

    // 파일 크기 검증 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하여야 합니다')
      return
    }

    try {
      setIsUploading(true)

      // 미리보기를 위한 로컬 URL 생성
      const previewUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          resolve(reader.result as string)
        }
        reader.readAsDataURL(file)
      })

      setProfilePreview(previewUrl)

      // TODO: 실제 파일 업로드 API 호출
      // const uploadFormData = new FormData()
      // uploadFormData.append('file', file)
      // const response = await fetch('/api/upload', {
      //   method: 'POST',
      //   body: uploadFormData,
      // })
      // const data = await response.json()
      // const uploadedUrl = data.url

      // 임시: 로컬 미리보기 URL을 저장 (실제로는 서버에서 받은 URL 사용)
      // 실제 배포 시에는 위의 API 호출 결과로 받은 uploadedUrl을 사용
      const uploadedUrl = previewUrl

      setFormData((prev) => ({ ...prev, picture: uploadedUrl }))
    } catch (error) {
      console.error('파일 업로드 실패:', error)
      alert('파일 업로드에 실패했습니다')
    } finally {
      setIsUploading(false)
    }
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof typeof formData, string>> = {}

    if (!formData.name.trim()) {
      newErrors.name = '이름을 입력해주세요'
    }

    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다'
    }

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
      const registerData: RegisterRequest = {
        ...formData,
        signupSessionToken,
      }

      // TODO: API 호출 로직 추가
      console.log('회원가입 데이터:', registerData)

      alert('회원가입이 완료되었습니다!')
      navigate('/')
    } catch (error) {
      console.error('회원가입 실패:', error)
      alert('회원가입에 실패했습니다. 다시 시도해주세요.')
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
        <Input
          label="이름"
          placeholder="이름을 입력하세요"
          value={formData.name}
          onChange={handleChange('name')}
          error={errors.name}
          disabled={!!initialName}
        />

        <Input
          label="이메일"
          type="email"
          placeholder="example@email.com"
          value={formData.email}
          onChange={handleChange('email')}
          error={errors.email}
          disabled={!!initialEmail}
        />

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

        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            프로필 사진 (선택사항)
          </label>
          <div className="space-y-3">
            {profilePreview && (
              <div className="flex justify-center">
                <img
                  src={profilePreview}
                  alt="프로필 미리보기"
                  className="w-32 h-32 rounded-full object-cover border-2 border-gray-300"
                />
              </div>
            )}
            <div className="relative">
              <input
                type="file"
                id="profile-upload"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden"
              />
              <label
                htmlFor="profile-upload"
                className={`w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 text-sm cursor-pointer hover:bg-gray-50 flex items-center justify-center gap-2 ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                파일 업로드
              </label>
              {isUploading && <p className="mt-2 text-sm text-blue-600">업로드 중...</p>}
            </div>
          </div>
        </div>

        <SolidButton type="submit" variant="main" size="lg" className="w-full mt-6">
          회원가입 완료
        </SolidButton>
      </form>
    </div>
  )
}

export default SignUpForm
