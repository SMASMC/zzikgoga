import { apiClient } from '@shared/api/client'
import { LoginRequest, LoginResponse, RegisterRequest } from '../types/auth'

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/auth/login', credentials)
  },

  async register(data: RegisterRequest): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/auth/register', data)
  },

  async logout(): Promise<void> {
    return apiClient.post<void>('/auth/logout')
  },

  async refreshToken(): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/auth/refresh')
  },
}
