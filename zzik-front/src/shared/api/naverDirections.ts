const NAVER_DIRECTIONS_ENDPOINT =
  'https://naveropenapi.apigw.ntruss.com/map-direction-15/v1/driving'

type DrivingOption = 'trafast' | 'traoptimal' | 'tracomfort'

export interface Coordinates {
  lat: number
  lng: number
}

export interface DrivingSummary {
  durationMs: number
  distanceMeters: number
  tollFare?: number
  fuelPrice?: number
}

export interface DrivingTimeRequest {
  start: Coordinates
  goal: Coordinates
  option?: DrivingOption
}

const resolveCredentials = () => {
  const clientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID
  const clientSecret = import.meta.env.VITE_NAVER_MAP_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return null
  }

  return { clientId, clientSecret }
}

const pickSummary = (payload: unknown): DrivingSummary | null => {
  if (typeof payload !== 'object' || payload === null) {
    return null
  }

  const data = payload as Record<string, unknown>
  const route = data.route
  if (typeof route !== 'object' || route === null) {
    return null
  }

  const extract = (key: string) => {
    const list = (route as Record<string, unknown>)[key]
    if (!Array.isArray(list) || list.length === 0) return null
    const summary = list[0]?.summary as Record<string, unknown> | undefined
    if (!summary) return null

    const duration = Number(summary.duration ?? NaN)
    const distance = Number(summary.distance ?? NaN)
    const tollFare = summary.tollFare !== undefined ? Number(summary.tollFare) : undefined
    const fuelPrice = summary.fuelPrice !== undefined ? Number(summary.fuelPrice) : undefined

    if (!Number.isFinite(duration) || !Number.isFinite(distance)) {
      return null
    }

    return {
      durationMs: duration,
      distanceMeters: distance,
      tollFare: Number.isFinite(tollFare) ? tollFare : undefined,
      fuelPrice: Number.isFinite(fuelPrice) ? fuelPrice : undefined,
    }
  }

  return extract('trafast') ?? extract('traoptimal') ?? extract('tracomfort')
}

export const fetchDrivingSummary = async (
  payload: DrivingTimeRequest
): Promise<DrivingSummary | null> => {
  const creds = resolveCredentials()
  if (!creds) {
    console.warn('NAVER map API credentials are missing.')
    return null
  }

  const { start, goal, option = 'traoptimal' } = payload
  if (
    !start ||
    typeof start.lat !== 'number' ||
    typeof start.lng !== 'number' ||
    !goal ||
    typeof goal.lat !== 'number' ||
    typeof goal.lng !== 'number'
  ) {
    return null
  }

  const params = new URLSearchParams({
    start: `${start.lng},${start.lat}`,
    goal: `${goal.lng},${goal.lat}`,
    option,
  })

  const response = await fetch(`${NAVER_DIRECTIONS_ENDPOINT}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'X-NCP-APIGW-API-KEY-ID': creds.clientId,
      'X-NCP-APIGW-API-KEY': creds.clientSecret,
    },
  })

  if (!response.ok) {
    console.warn('Naver directions request failed', response.status)
    return null
  }

  let data: unknown = null
  try {
    data = await response.json()
  } catch (error) {
    console.warn('Failed to parse Naver directions response', error)
    return null
  }

  return pickSummary(data)
}
