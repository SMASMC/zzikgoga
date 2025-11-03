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
  bankCode: string
  accountNum: string
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
  accessToken: string
  refreshToken: string
  signupRequired: false
  loggedIn: true
}

// 카카오 로그인 후 받는 응답 (Union Type)
export type OAuthCallbackResponse = SignupRequiredResponse | LoginSuccessResponse

// 추가 정보 입력 후 받는 응답
export interface SignupResponse {
  user: User
  accessToken: string
  refreshToken: string
  loggedIn: boolean
}
