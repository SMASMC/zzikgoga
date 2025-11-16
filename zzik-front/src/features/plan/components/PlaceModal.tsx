import SolidButton from '@/components/atoms/SolidButton'
import CloseButton from '@/components/atoms/CloseButton'
import TimePicker from '@/components/atoms/TimePicker'
import { useMemo, useState, useCallback, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ToastDock } from '@/components/blocks/ToastDock'
import { useYTripDoc } from '../hooks/useYTripDoc'
import type { AddressComponent } from './PlaceSearchPanel'

interface PlaceModalProps {
  onClose: () => void
  place: {
    name: string
    full_address?: string
    latitude?: number | null
    longitude?: number | null
    addressComponents?: AddressComponent[]
  }
}

const PlaceModal = ({ onClose, place }: PlaceModalProps) => {
  const parsedAddress = useMemo(() => {
    const components = place.addressComponents ?? []

    // 디버깅: addressComponents 확인
    if (components.length > 0) {
      console.log('[PlaceModal] addressComponents:', components)
    }

    const pick = (candidates: string[]) => {
      const match = components.find((component) =>
        component.types?.some((type) => candidates.includes(type))
      )
      return (match?.longText ?? match?.shortText ?? '').trim()
    }

    // 시/도: administrative_area_level_1 또는 country
    const sido = pick(['administrative_area_level_1']) || pick(['country'])

    // 시/군/구: 여러 레벨 시도
    const sigungu =
      pick(['locality']) ||
      pick(['administrative_area_level_2']) ||
      pick(['sublocality', 'sublocality_level_1']) ||
      pick(['administrative_area_level_3'])

    // 도로명: route 또는 thoroughfare
    const roadName =
      pick(['route']) ||
      pick(['thoroughfare']) ||
      pick(['sublocality_level_2', 'sublocality_level_3', 'sublocality_level_4'])

    // 건물번호: street_number 우선, 없으면 premise
    const streetNumber = pick(['street_number'])
    const premise = pick(['premise'])
    const buildingNum = streetNumber || premise

    // 상세 주소: establishment, point_of_interest 등
    const establishment = pick(['establishment', 'point_of_interest'])
    const subPremise = pick(['subpremise'])
    const floor = pick(['floor'])

    // 상세 주소 조합
    const detailParts = [establishment, subPremise, floor].filter(Boolean)
    const detailFromComponents = detailParts.join(' ').trim()

    // fallback: formattedAddress 전체 사용
    const fallbackDetail = detailFromComponents || (place.full_address?.trim() ?? '')

    const result = {
      sido,
      sigungu,
      roadName,
      buildingNum,
      detail: fallbackDetail,
    }

    console.log('[PlaceModal] Parsed address:', result)
    return result
  }, [place.addressComponents, place.full_address])

  const [startDateTime, setStartDateTime] = useState<string>('')
  const [endDateTime, setEndDateTime] = useState<string>('')
  const [activity, setActivity] = useState<string>('')
  const [detailAddress, setDetailAddress] = useState<string>(parsedAddress.detail)
  const [sido, setSido] = useState<string>(parsedAddress.sido)
  const [sigungu, setSigungu] = useState<string>(parsedAddress.sigungu)
  const [roadName, setRoadName] = useState<string>(parsedAddress.roadName)
  const [buildingNum, setBuildingNum] = useState<string>(parsedAddress.buildingNum)

  useEffect(() => {
    setSido(parsedAddress.sido)
    setSigungu(parsedAddress.sigungu)
    setRoadName(parsedAddress.roadName)
    setBuildingNum(parsedAddress.buildingNum)
    setDetailAddress(parsedAddress.detail)
  }, [parsedAddress])

  const { tripId } = useParams<{ tripId: string }>()
  const roomId = useMemo(
    () => (tripId && tripId.trim().length > 0 ? `trip-${tripId.trim()}` : 'trip-default'),
    [tripId]
  )
  const { addSchedule, tripInfo, schedulesByDate } = useYTripDoc(roomId)
  const metaStorageKey = useMemo(() => (tripId ? `plan-meta-${tripId}` : null), [tripId])
  const [selectedDateKey, setSelectedDateKey] = useState<string>('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const isWithinTripRange = useCallback(
    (dateKey: string) => {
      if (!tripInfo.start_date || !tripInfo.end_date) {
        return true
      }
      return tripInfo.start_date <= dateKey && dateKey <= tripInfo.end_date
    },
    [tripInfo.end_date, tripInfo.start_date]
  )

  const buildRangeMessage = useCallback(() => {
    if (tripInfo.start_date && tripInfo.end_date) {
      return `여행 기간은 ${tripInfo.start_date} ~ ${tripInfo.end_date} 입니다.`
    }
    return '여행 일정 날짜를 확인해주세요.'
  }, [tripInfo.end_date, tripInfo.start_date])

  const durationHHMM = useMemo(() => {
    if (!startDateTime || !endDateTime) return ''
    try {
      const start = new Date(`${selectedDateKey}T${startDateTime}`)
      const end = new Date(`${selectedDateKey}T${endDateTime}`)
      const ms = end.getTime() - start.getTime()
      if (Number.isNaN(ms) || ms < 0) return 'invalid'
      const totalMin = Math.floor(ms / 60000)
      const hh = String(Math.floor(totalMin / 60)).padStart(2, '0')
      const mm = String(totalMin % 60).padStart(2, '0')
      return `${hh}:${mm}`
    } catch {
      return ''
    }
  }, [selectedDateKey, startDateTime, endDateTime])

  const notifyOutOfRange = useCallback(() => {
    setToastMessage(buildRangeMessage())
  }, [buildRangeMessage])

  useEffect(() => {
    // Restore selected date from session and subscribe to changes from PlaceBoard
    if (!metaStorageKey || typeof window === 'undefined') return
    try {
      const raw = window.sessionStorage.getItem(metaStorageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        const stored: string | undefined = parsed?.selectedDate
        if (stored) setSelectedDateKey(stored)
      }
    } catch {
      // ignore
    }
    const listener = (ev: Event) => {
      const ce = ev as CustomEvent<{ tripId: string | null; dateKey: string }>
      const sameTrip = !tripId || ce.detail.tripId === tripId
      if (!ce.detail?.dateKey || !sameTrip) return
      setSelectedDateKey(ce.detail.dateKey)
    }
    window.addEventListener('zzik-plan-selected-date', listener as EventListener)
    return () => window.removeEventListener('zzik-plan-selected-date', listener as EventListener)
  }, [metaStorageKey, tripId])

  const handleSubmit = () => {
    if (!startDateTime) {
      setToastMessage('시간을 선택해주세요.')
      return
    }
    if (!selectedDateKey) {
      setToastMessage('여행 일정에서 날짜를 먼저 선택해주세요.')
      return
    }
    if (!isWithinTripRange(selectedDateKey)) {
      notifyOutOfRange()
      return
    }

    // 시간 유효성 검사
    if (endDateTime) {
      const start = new Date(`${selectedDateKey}T${startDateTime}`)
      const end = new Date(`${selectedDateKey}T${endDateTime}`)
      if (end.getTime() - start.getTime() < 0) {
        setToastMessage('종료 시간은 시작 시간보다 빠를 수 없습니다.')
        return
      }
    }

    // 시간 겹침 체크
    const existingSchedules = schedulesByDate[selectedDateKey] || []
    if (existingSchedules.length > 0) {
      const newStart = new Date(`${selectedDateKey}T${startDateTime}`)
      const newEnd = endDateTime
        ? new Date(`${selectedDateKey}T${endDateTime}`)
        : new Date(newStart.getTime() + 60 * 60 * 1000) // 종료시간 없으면 1시간 후로 가정

      // 기존 일정과 시간 겹침 확인
      for (const schedule of existingSchedules) {
        const existingStart = new Date(schedule.start_time)

        // 기존 일정의 종료시간 계산
        let existingEnd: Date
        if (schedule.offset_time) {
          const offsetMatch = String(schedule.offset_time).match(/^(\d+):(\d+)$/)
          if (offsetMatch) {
            const hours = parseInt(offsetMatch[1], 10)
            const minutes = parseInt(offsetMatch[2], 10)
            existingEnd = new Date(existingStart.getTime() + (hours * 60 + minutes) * 60 * 1000)
          } else {
            existingEnd = new Date(existingStart.getTime() + 60 * 60 * 1000) // 기본 1시간
          }
        } else {
          existingEnd = new Date(existingStart.getTime() + 60 * 60 * 1000) // 기본 1시간
        }

        // 시간 겹침 확인: 겹치지 않으려면 (newEnd <= existingStart) 또는 (newStart >= existingEnd)
        const isOverlapping = !(
          newEnd.getTime() <= existingStart.getTime() || newStart.getTime() >= existingEnd.getTime()
        )

        if (isOverlapping) {
          const existingStartTime = existingStart.toTimeString().slice(0, 5)
          const existingEndTime = existingEnd.toTimeString().slice(0, 5)
          setToastMessage(
            `선택한 시간이 기존 일정(${existingStartTime} ~ ${existingEndTime})과 겹칩니다. 다른 시간을 선택해주세요.`
          )
          return
        }
      }
    }

    // 장소 이름 검증: 빈 문자열이면 에러
    const locationName = place.name?.trim() || ''
    if (locationName.length === 0) {
      setToastMessage('장소 이름이 없습니다. 다른 장소를 선택해주세요.')
      return
    }

    const startIso = `${selectedDateKey}T${startDateTime}`
    const endIso = endDateTime ? `${selectedDateKey}T${endDateTime}` : null

    const locationData = {
      name: locationName,
      full_address: place.full_address ?? '',
      detail: detailAddress.trim(),
      sido: sido.trim(),
      sigungu: sigungu.trim(),
      road_name: roadName.trim(),
      building_num: buildingNum.trim(),
      latitude: place.latitude ?? null,
      longitude: place.longitude ?? null,
    }

    console.log('[PlaceModal] Submitting location data:', locationData)

    addSchedule({
      startTimeLocal: startIso,
      endTimeLocal: endIso,
      memo: activity,
      location: locationData,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
      <ToastDock
        open={Boolean(toastMessage)}
        variant="warning"
        title="알림"
        message={toastMessage ?? ''}
        autoCloseMs={3000}
        offsetPx={24}
        onClose={() => setToastMessage(null)}
      />
      <div className="w-full max-w-md sm:max-w-lg bg-gradient-to-br from-white via-background-500 to-background-600 rounded-3xl shadow-xl p-6 sm:p-8 font-bmjua relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        <CloseButton onClick={onClose} className="absolute top-3 right-4" />

        <h2 className="text-xl sm:text-2xl text-text-500 mb-4 sm:mb-6 font-bold">장소 추가하기</h2>

        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg mb-2 sm:mb-3 text-text-600">장소</h3>
          <input
            type="text"
            value={place.name}
            readOnly
            className="w-full px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base text-text-500 rounded-xl border-none outline-none focus:outline-none focus:ring-0 transition-all hover:shadow-md hover:scale-[1.02] cursor-not-allowed"
          />
        </div>

        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg mb-2 sm:mb-3 text-text-600">시작 시간</h3>
          <TimePicker
            value={startDateTime}
            onChange={setStartDateTime}
            placeholder="시작 시간"
            className="w-full"
          />
        </div>

        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg mb-2 sm:mb-3 text-text-600">종료 시간</h3>
          <TimePicker
            value={endDateTime}
            onChange={setEndDateTime}
            placeholder="종료 시간"
            className="w-full"
          />
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
              선택 날짜: {selectedDateKey || '미선택'}
            </span>
            {durationHHMM && durationHHMM !== 'invalid' ? (
              <span className="text-slate-600">예정 소요시간: {durationHHMM}</span>
            ) : endDateTime ? (
              <span className="text-red-500">시간 범위를 확인하세요</span>
            ) : null}
          </div>
        </div>

        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg mb-2 sm:mb-3 text-text-600">활동 메모</h3>
          <textarea
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            placeholder="예) 체크인, 점심 식사, 관광 등"
            rows={3}
            className="w-full px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base text-text-500 rounded-xl border-none outline-none focus:outline-none focus:ring-0 transition-all hover:shadow-md hover:scale-[1.02] resize-none placeholder:text-gray-400"
          />
        </div>

        <div className="mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg mb-2 sm:mb-3 text-text-600">주소 정보</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-text-500">시/도</label>
              <input
                type="text"
                value={sido}
                onChange={(e) => setSido(e.target.value)}
                placeholder="예) 서울특별시"
                className="w-full px-4 sm:px-5 py-2 text-sm sm:text-base text-text-500 rounded-xl border-none outline-none focus:outline-none focus:ring-0 transition-all hover:shadow-md hover:scale-[1.02] placeholder:text-gray-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-text-500">시/군/구</label>
              <input
                type="text"
                value={sigungu}
                onChange={(e) => setSigungu(e.target.value)}
                placeholder="예) 강남구"
                className="w-full px-4 sm:px-5 py-2 text-sm sm:text-base text-text-500 rounded-xl border-none outline-none focus:outline-none focus:ring-0 transition-all hover:shadow-md hover:scale-[1.02] placeholder:text-gray-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-text-500">도로명</label>
              <input
                type="text"
                value={roadName}
                onChange={(e) => setRoadName(e.target.value)}
                placeholder="예) 강남대로"
                className="w-full px-4 sm:px-5 py-2 text-sm sm:text-base text-text-500 rounded-xl border-none outline-none focus:outline-none focus:ring-0 transition-all hover:shadow-md hover:scale-[1.02] placeholder:text-gray-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-text-500">건물 번호</label>
              <input
                type="text"
                value={buildingNum}
                onChange={(e) => setBuildingNum(e.target.value)}
                placeholder="예) 123"
                className="w-full px-4 sm:px-5 py-2 text-sm sm:text-base text-text-500 rounded-xl border-none outline-none focus:outline-none focus:ring-0 transition-all hover:shadow-md hover:scale-[1.02] placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>

        <div className="mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg mb-2 sm:mb-3 text-text-600">상세 주소</h3>
          <input
            type="text"
            value={detailAddress}
            onChange={(e) => setDetailAddress(e.target.value)}
            placeholder="상세 주소를 입력해주세요."
            className="w-full px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base text-text-500 rounded-xl border-none outline-none focus:outline-none focus:ring-0 transition-all hover:shadow-md hover:scale-[1.02] placeholder:text-gray-400"
          />
        </div>

        <div className="flex justify-center">
          <SolidButton
            onClick={handleSubmit}
            className="w-full sm:w-auto bg-gradient-to-br from-hover-600 to-point-600 text-white text-base sm:text-lg px-8 sm:px-12 py-2.5 sm:py-3 rounded-full shadow-lg hover:scale-105 hover:from-point-600 hover:to-main-800 transition-all font-bold"
          >
            장소 추가하기
          </SolidButton>
        </div>
      </div>
    </div>
  )
}

export default PlaceModal
