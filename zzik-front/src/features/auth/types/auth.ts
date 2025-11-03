export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  gender: string
  birthYear: number
  bankCode: string
  accountNum: string
  signupSessionToken: string
  picture: string
  name: string
  email: string
}

export interface LoginResponse {
  user: {
    id: string
    email: string
    name: string
  }
  token: string
}
