import { getCookie } from '../utils/cookie'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

interface RequestConfig extends RequestInit {
  headers?: Record<string, string>
}

interface ApiResponse<T> {
  code: number
  content: T
  message?: string | null
}

function isApiResponse<T = unknown>(data: unknown): data is ApiResponse<T> {
  return typeof data === 'object' && data !== null && 'code' in data && 'content' in data
}

function extractMessage(input: unknown): string | undefined {
  if (typeof input !== 'object' || input === null) return undefined
  const msg = (input as Record<string, unknown>)['message']
  if (msg === null || typeof msg === 'undefined') return undefined
  return String(msg)
}

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    // 쿠키에서 accessToken 가져오기
    const accessToken = getCookie('accessToken')

    // FormData인지 확인
    const isFormData = config.body instanceof FormData

    const headers: Record<string, string> = {
      // FormData일 때는 Content-Type을 설정하지 않음 (브라우저가 자동으로 boundary 설정)
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }), // 토큰이 있으면 Authorization 헤더 추가
      ...config.headers,
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...config,
      headers,
      credentials: 'include', // 쿠키 자동 전송도 유지
    })

    let data: unknown = null
    try {
      // Attempt to parse JSON for both success and error handling
      data = await response.json()
    } catch {
      data = null
    }

    if (!response.ok) {
      // Prefer API-provided message when available
      if (isApiResponse(data)) {
        throw new Error(data.message || `HTTP Error: ${response.status}`)
      }
      const message = extractMessage(data)
      throw new Error(message || `HTTP Error: ${response.status}`)
    }

    // Handle API envelope: { code, content, message }
    if (isApiResponse<T>(data)) {
      if (data.code === 20000) {
        return data.content
      }
      throw new Error(data.message || `API Error: ${data.code}`)
    }

    // Fallback: return parsed JSON directly when not wrapped
    return data as T
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' })
  }

  async post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    // FormData인 경우 그대로 전송, 아닌 경우 JSON.stringify
    const body = data instanceof FormData ? data : JSON.stringify(data)
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body,
    })
  }

  async put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
