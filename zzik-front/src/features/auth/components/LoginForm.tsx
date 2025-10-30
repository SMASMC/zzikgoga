import SolidButton from "@components/atoms/SolidButton"

const LoginForm = () => {

  return (
    <div className="w-full max-w-md space-y-4">
    <h1 className="text-3xl font-bold text-center mb-6">로그인</h1>
    <img src="pwa-512x512.png" alt="" className="w-1/2 mx-auto" />
    <SolidButton variant="kakao" className="w-full flex items-center justify-center gap-2">
      <img src="kakao.png" alt="" className="w-6 h-6"/>
      카카오로 로그인
      </SolidButton>
    </div>
  )
}

export default LoginForm
