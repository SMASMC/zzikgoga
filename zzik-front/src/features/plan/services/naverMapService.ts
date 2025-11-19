// src/features/plan/services/naverMapService.ts
// 네이버 맵 API를 사용한 이동시간 계산 서비스 (백엔드 API 호출)

/**
 * 두 지점 사이의 자동차 이동시간을 계산합니다
 * @param start 출발지 좌표 {lat, lng}
 * @param goal 도착지 좌표 {lat, lng}
 * @returns { durationMinutes: 소요시간(분), distance: 거리(미터) } 또는 null
 */
export async function calculateTravelTime(
  start: { lat: number; lng: number },
  goal: { lat: number; lng: number }
): Promise<{ durationMinutes: number; distance: number } | null> {
  // 시작점과 도착점이 동일한 경우 0분 반환
  const distance = Math.sqrt(Math.pow(goal.lat - start.lat, 2) + Math.pow(goal.lng - start.lng, 2))
  if (distance < 0.0001) {
    // 약 10미터 이내
    return { durationMinutes: 0, distance: 0 }
  }

  try {
    // 백엔드 API 호출 (환경 변수 사용)
    const baseUrl = import.meta.env.VITE_CRDT_URL || 'http://localhost:3100'
    const url = `${baseUrl}/api/naver-map/direction?start=${start.lng},${start.lat}&goal=${goal.lng},${goal.lat}&option=traoptimal`

    const response = await fetch(url, {
      method: 'GET',
    })

    if (!response.ok) {
      console.error('네이버 맵 API 요청 실패:', response.status)
      return null
    }

    const data: { durationMinutes: number; distance: number } = await response.json()

    return data
  } catch (error) {
    console.error('이동시간 계산 중 오류:', error)
    return null
  }
}

/**
 * 분을 HH:MM 형식으로 변환
 * @param minutes 분
 * @returns HH:MM 형식 문자열
 */
export function minutesToHHMM(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

/**
 * HH:MM 형식을 분으로 변환
 * @param hhmm HH:MM 형식 문자열
 * @returns 분
 */
export function hhmmToMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * 시작시간에 분을 더합니다
 * @param startTime YYYY-MM-DDTHH:mm 형식
 * @param minutes 더할 분
 * @returns YYYY-MM-DDTHH:mm 형식
 */
export function addMinutesToTime(startTime: string, minutes: number): string {
  const date = new Date(startTime)
  date.setMinutes(date.getMinutes() + minutes)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const mins = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${mins}`
}
