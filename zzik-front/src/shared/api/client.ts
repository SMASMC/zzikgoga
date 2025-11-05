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
  return (
    typeof data === 'object' &&
    data !== null &&
    'code' in data &&
    'content' in data
  )
}

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers,
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...config,
      headers,
      credentials: 'include',
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
      const message = (typeof data === 'object' && data && 'message' in (data as any))
        ? String((data as any).message)
        : undefined
      throw new Error(message || `HTTP Error: ${response.status}`)
    }

    // Handle API envelope: { code, content, message }
    if (isApiResponse<T>(data)) {
      
      return data.content
      
    }

    // Fallback: return parsed JSON directly when not wrapped
    return data as T
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' })
  }

  async post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: JSON.stringify(data),
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
