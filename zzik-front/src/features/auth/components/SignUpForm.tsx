import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Input from '@components/atoms/Input'
import SolidButton from '@components/atoms/SolidButton'
import { DropdownSelect } from '@/components/blocks/DropdownSelect' // 성별 선택용
import { SignupRequest } from '../types/auth'
import { AuthService } from '../services/authService'
import { useAuthStore } from '@/shared/stores/useAuthStore'
import { ToastDock } from '@/components/blocks/ToastDock'

interface SignupFormProps {
  signupSessionToken: string | null
  initialEmail?: string
  initialName?: string
  initialPicture?: string
  redirectUrl?: string | null
}

const SignUpForm = ({
  signupSessionToken,
  initialEmail = '',
  initialName = '',
  initialPicture = '',
  redirectUrl = null,
}: SignupFormProps) => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<Omit<SignupRequest, 'signupSessionToken'>>({
    name: initialName,
    email: initialEmail,
    picture: initialPicture,
    gender: '',
    birthYear: new Date().getFullYear() - 20,
    // 은행/계좌 정보는 정산 기능 구현 시 마이페이지에서 입력 예정
  })

  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({})
  const [toast, setToast] = useState<{
    variant: 'success' | 'warning' | 'error' | 'hint'
    title?: string
    message: string
  } | null>(null)

  // console.log(formData)

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

    // 은행/계좌 정보 검증 제거 (선택사항으로 변경)

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!signupSessionToken) {
      setToast({
        variant: 'error',
        title: '회원가입 세션 오류',
        message: '유효하지 않은 회원가입 세션입니다.',
      })
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

      // console.log('회원가입 요청 데이터:', registerData)

      const response = await AuthService.register(registerData)
      // console.log('회원가입 응답:', response)

      // accessToken과 user 정보를 store에 저장
      if (response.loggedIn && response.user) {
        useAuthStore.getState().setAuth(response.user)
        // console.log('회원가입 성공 - 로그인 정보 전역 저장 완료')
        // console.log('사용자 정보 저장 완료:', response.user)
      } else {
        throw new Error('회원가입 응답에 필수 정보가 없습니다')
      }

      setToast({
        variant: 'success',
        title: '회원가입 완료',
        message: '회원가입이 완료되었습니다!',
      })

      // 초대 링크 확인 (props 또는 sessionStorage)
      console.log('[SignUpForm] 회원가입 완료!')
      console.log('[SignUpForm] props로 받은 redirectUrl:', redirectUrl)

      const sessionRedirectUrl = sessionStorage.getItem('redirectAfterLogin')
      console.log('[SignUpForm] sessionStorage의 redirectUrl:', sessionRedirectUrl)

      // props 우선, 없으면 sessionStorage 확인
      const finalRedirectUrl = redirectUrl || sessionRedirectUrl

      console.log('[SignUpForm] 최종 redirectUrl:', finalRedirectUrl)

      // 약간의 딜레이 후 navigate (인증 상태 안정화 대기)
      await new Promise((resolve) => setTimeout(resolve, 300))

      if (finalRedirectUrl) {
        sessionStorage.removeItem('redirectAfterLogin')
        console.log('[SignUpForm] 초대 링크로 리다이렉트:', finalRedirectUrl)
        navigate(finalRedirectUrl, { replace: true })
      } else {
        console.log('[SignUpForm] mypage로 리다이렉트')
        navigate('/mypage', { replace: true })
      }
    } catch (error) {
      console.error('회원가입 실패:', error)
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
      setToast({
        variant: 'error',
        title: '회원가입 실패',
        message: errorMessage,
      })
    }
  }

  // 은행 목록은 정산 기능 구현 시 마이페이지에서 사용 예정

  return (
    <div className="w-full max-w-md space-y-4">
      <ToastDock
        open={Boolean(toast)}
        variant={toast?.variant ?? 'hint'}
        title={toast?.title}
        message={toast?.message ?? ''}
        autoCloseMs={3000}
        offsetPx={16}
        onClose={() => setToast(null)}
      />
      <h1 className="text-3xl font-bmjua font-bold text-center mb-6">추가 정보 입력</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="w-full">
          <label className="block text-lg font-bmjua font-bold text-slate-800 mb-3">성별</label>
          <DropdownSelect
            options={[
              { value: 'MALE', label: '남성' },
              { value: 'FEMALE', label: '여성' },
            ]}
            value={formData.gender}
            onChange={(value) => {
              setFormData((prev) => ({ ...prev, gender: value }))
              if (errors.gender) {
                setErrors((prev) => ({ ...prev, gender: undefined }))
              }
            }}
            placeholder="성별을 선택하세요"
          />
          {errors.gender && (
            <p className="mt-2 text-base font-semibold text-red-600">{errors.gender}</p>
          )}
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

        {/* 은행/계좌 정보는 정산 기능 구현 시 마이페이지에서 입력 예정 */}

        <SolidButton type="submit" variant="main" size="lg" className="w-full mt-6">
          회원가입 완료
        </SolidButton>
      </form>
    </div>
  )
}

export default SignUpForm
