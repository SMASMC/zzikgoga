export interface LoginRequest {
  email: string
  password: string
}

// User 타입 정의
export interface User {
  id: string
  email: string
  name: string
  picture?: string
}

// 추가 정보 입력 후 보내는 요청
export interface SignupRequest {
  gender: string
  birthYear: number
  bankCode?: string // 선택사항 (정산 기능 사용 시 필요)
  accountNum?: string // 선택사항 (정산 기능 사용 시 필요)
  signupSessionToken: string
  picture: string
  name: string
  email: string
}

// 카카오 로그인 후 받는 응답 (회원가입 필요)
export interface SignupRequiredResponse {
  email: string
  name: string
  picture?: string
  signupRequired: true
  signupSessionToken: string
  loggedIn: false
}

// 카카오 로그인 후 받는 응답 (로그인 완료)
export interface LoginSuccessResponse {
  user: User
  loggedIn: true
}

// 카카오 로그인 후 받는 응답 (Union Type)
export type OAuthCallbackResponse = SignupRequiredResponse | LoginSuccessResponse

// 추가 정보 입력 후 받는 응답
export interface SignupResponse {
  user: User
  loggedIn: boolean
}

// 카카오 로그인 체크 응답
export interface KakaoLoginResponse {
  loggedIn: boolean
  user: User
}
