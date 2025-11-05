/**
 * 쿠키에서 특정 값을 가져오는 유틸 함수
 * @param name 쿠키 이름
 * @returns 쿠키 값 또는 null
 */
export function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null
  }
  return null
}

/**
 * 쿠키 설정 함수
 * @param name 쿠키 이름
 * @param value 쿠키 값
 * @param days 만료 일수
 */
export function setCookie(name: string, value: string, days?: number): void {
  let expires = ''
  if (days) {
    const date = new Date()
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
    expires = `; expires=${date.toUTCString()}`
  }
  document.cookie = `${name}=${value}${expires}; path=/`
}

/**
 * 쿠키 삭제 함수
 * @param name 쿠키 이름
 */
export function deleteCookie(name: string): void {
  document.cookie = `${name}=; Max-Age=-99999999; path=/`
}
