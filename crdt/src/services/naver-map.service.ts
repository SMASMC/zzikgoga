import * as https from 'https'
import { IncomingMessage } from 'http'

interface NaverDirectionResponse {
  code: number
  message: string
  currentDateTime: string
  route: {
    traoptimal?: Array<{
      summary: {
        duration: number // milliseconds
        distance: number // meters
      }
    }>
  }
}

export class NaverMapService {
  private readonly clientId: string
  private readonly clientSecret: string

  constructor() {
    this.clientId = process.env.NAVER_MAP_CLIENT_ID || ''
    this.clientSecret = process.env.NAVER_MAP_CLIENT_SECRET || ''

    if (!this.clientId || !this.clientSecret) {
      console.warn('[NaverMapService] API credentials not configured')
    } else {
      console.log('[NaverMapService] API credentials loaded successfully')
      console.log('[NaverMapService] Client ID:', this.clientId.substring(0, 4) + '***')
    }
  }

  /**
   * 두 지점 사이의 자동차 이동시간 계산
   */
  async calculateTravelTime(
    start: { lat: number; lng: number },
    goal: { lat: number; lng: number },
    option: string = 'traoptimal'
  ): Promise<{ durationMinutes: number; distance: number } | null> {
    // 시작점과 도착점이 동일한 경우
    const distance = Math.sqrt(
      Math.pow(goal.lat - start.lat, 2) + Math.pow(goal.lng - start.lng, 2)
    )
    if (distance < 0.0001) {
      console.log('[NaverMapService] Same start and goal, returning 0')
      return { durationMinutes: 0, distance: 0 }
    }

    const url = `https://maps.apigw.ntruss.com/map-direction/v1/driving?start=${start.lng},${start.lat}&goal=${goal.lng},${goal.lat}&option=${option}`

    return new Promise((resolve, reject) => {
      const req = https.get(
        url,
        {
          headers: {
            'X-NCP-APIGW-API-KEY-ID': this.clientId,
            'X-NCP-APIGW-API-KEY': this.clientSecret,
          },
        },
        (res: IncomingMessage) => {
          let data = ''

          res.on('data', (chunk) => {
            data += chunk
          })

          res.on('end', () => {
            if (res.statusCode !== 200) {
              console.error('[NaverMapService] API request failed:', res.statusCode, data)
              resolve(null)
              return
            }

            try {
              const result: NaverDirectionResponse = JSON.parse(data)

              if (result.code !== 0 || !result.route.traoptimal || result.route.traoptimal.length === 0) {
                console.error('[NaverMapService] No route found:', result.message)
                resolve(null)
                return
              }

              const routeSummary = result.route.traoptimal[0]?.summary
              if (!routeSummary) {
                console.error('[NaverMapService] No route summary found')
                resolve(null)
                return
              }

              const durationMs = routeSummary.duration
              const distanceM = routeSummary.distance
              const durationMinutes = Math.ceil(durationMs / 1000 / 60)

              resolve({
                durationMinutes,
                distance: distanceM,
              })
            } catch (error) {
              console.error('[NaverMapService] Failed to parse response:', error)
              resolve(null)
            }
          })
        }
      )

      req.on('error', (error) => {
        console.error('[NaverMapService] Request error:', error)
        reject(error)
      })

      req.end()
    })
  }
}

export const naverMapService = new NaverMapService()
