export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface LoginResponse {
  user: {
    id: string
    email: string
    name: string
  }
  token: string
}
