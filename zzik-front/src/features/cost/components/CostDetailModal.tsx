import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import CloseButton from '@/components/atoms/CloseButton'
import { CostDetailService, CostModifyService, CostSettleService } from '../services/costService'
import { CostDetailResponse, CostModifyRequest } from '../types/cost'
import { SettleResponse } from '../types/settle'
import { PlanService } from '@/features/plan/services/planServices'
import { Members } from '@/features/plan/types/plan'
import { EditLockStateService } from '../services/editLockStateService'
import SolidButton from '@/components/atoms/SolidButton'
import PayerSelectModal from './PayerSelectModal'
import MemberSelectModal from './MemberSelectModal'
import { User } from '@/features/auth/types/auth'
import Calendar from '@/components/atoms/Calendar'

interface CostDetailModalProps {
  isOpen: boolean
  onClose: () => void
  tripId: string
  costId: number
  onRefresh?: () => void // 삭제 후 목록 새로고침을 위한 콜백
}

const CostDetailModal = ({ isOpen, onClose, tripId, costId, onRefresh }: CostDetailModalProps) => {
  const [costDetail, setCostDetail] = useState<CostDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [members, setMembers] = useState<Members[]>([])
  const [canEdit, setCanEdit] = useState(true) // 기본값을 true로 설정 (아무도 수정 중이 아닐 때는 수정 가능)
  const [isEditing, setIsEditing] = useState(false) // 수정 모드 여부
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false) // 삭제 중 상태
  const [editFormError, setEditFormError] = useState<string | null>(null)
  const [settleInfo, setSettleInfo] = useState<SettleResponse | null>(null) // 정산 수락 정보
  const validateEditForm = (): string | null => {
    if (!isEditing) return null

    if (!formData.payerId) {
      return '결제자를 선택해주세요.'
    }
    if (!formData.paidAt || !formData.paidAt.trim()) {
      return '결제 일시를 입력해주세요.'
    }
    if (!formData.place || formData.place.trim() === '') {
      return '결제 장소를 입력해주세요.'
    }
    if (!formData.menus || formData.menus.length === 0) {
      return '최소 1개 이상의 품목을 추가해주세요.'
    }

    for (let i = 0; i < formData.menus.length; i += 1) {
      const menu = formData.menus[i]
      if (!menu.menuName || menu.menuName.trim() === '') {
        return `품목 ${i + 1}: 품목명을 입력해주세요.`
      }
      if (menu.amount === undefined || menu.amount === null || menu.amount <= 0) {
        return `품목 ${i + 1}: 금액은 1원 이상이어야 합니다.`
      }
      if (!menu.payerIds || menu.payerIds.length === 0) {
        return `품목 ${i + 1}: 결제 참여자를 최소 1명 이상 선택해주세요.`
      }
    }

    return null
  }

  // 수정 폼 데이터
  const [formData, setFormData] = useState<CostModifyRequest>({
    paidAt: '',
    place: '',
    payerId: 0,
    memo: null,
    menus: [],
  })
  const [payer, setPayer] = useState<User | null>(null)
  const [isPayerModalOpen, setIsPayerModalOpen] = useState(false)
  const [openMemberModalIndex, setOpenMemberModalIndex] = useState<number | null>(null)

  // 날짜와 시간 상태 (캘린더 및 시간 선택용)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string>('09:00')
  const [showCalendar, setShowCalendar] = useState(false)
  const calendarContainerRef = useRef<HTMLDivElement>(null)
  const dateTimeButtonRef = useRef<HTMLButtonElement>(null)

  // 24시간 형식을 12시간 형식으로 변환
  const convertTo12Hour = (time24: string): { hour: number; minute: number; isAM: boolean } => {
    const [hour24, minute] = time24.split(':').map(Number)
    let hour12 = hour24
    let isAM = true

    if (hour24 === 0) {
      hour12 = 12
      isAM = true
    } else if (hour24 === 12) {
      hour12 = 12
      isAM = false
    } else if (hour24 > 12) {
      hour12 = hour24 - 12
      isAM = false
    } else {
      hour12 = hour24
      isAM = true
    }

    return { hour: hour12, minute: minute || 0, isAM }
  }

  // 12시간 형식을 24시간 형식으로 변환
  const convertTo24Hour = (hour12: number, minute: number, isAM: boolean): string => {
    let hour24 = hour12

    if (isAM) {
      if (hour12 === 12) {
        hour24 = 0
      } else {
        hour24 = hour12
      }
    } else {
      if (hour12 === 12) {
        hour24 = 12
      } else {
        hour24 = hour12 + 12
      }
    }

    return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }

  // 날짜와 시간을 분리해서 관리
  const parsePaidAt = (paidAt: string): { date: Date | null; time: string } => {
    try {
      const [datePart, timePart] = paidAt.split(' ')
      if (datePart && timePart) {
        const [year, month, day] = datePart.split('-').map(Number)
        const [hour, minute] = timePart.split(':').map(Number)
        const date = new Date(year, month - 1, day)
        return { date, time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` }
      }
    } catch (error) {
      console.error('날짜 파싱 실패:', error)
    }
    const now = new Date()
    return { date: now, time: '09:00' }
  }

  // 초기 12시간 형식 값
  const [hour12, setHour12] = useState<number>(9)
  const [minute, setMinute] = useState<number>(0)
  const [isAM, setIsAM] = useState<boolean>(true)

  // selectedTime이 외부에서 변경될 때 12시간 형식으로 동기화
  useEffect(() => {
    if (selectedTime) {
      const converted = convertTo12Hour(selectedTime)
      setHour12(converted.hour)
      setMinute(converted.minute)
      setIsAM(converted.isAM)
    }
  }, [selectedTime])

  // 외부 클릭 감지하여 캘린더 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      // 버튼이나 캘린더/시간 선택 영역 내부 클릭은 무시
      if (
        dateTimeButtonRef.current?.contains(target) ||
        calendarContainerRef.current?.contains(target)
      ) {
        return
      }
      // 외부 클릭 시 캘린더 닫기
      setShowCalendar(false)
    }

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCalendar])

  // 날짜와 시간을 합쳐서 paidAt 업데이트
  const updatePaidAt = (date: Date | null, time: string) => {
    if (date) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const paidAt = `${year}-${month}-${day} ${time}:00`
      setFormData({ ...formData, paidAt })
    }
  }

  // 날짜 선택 핸들러
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDateSelect = (start: Date, _end: Date) => {
    setSelectedDate(start)
    updatePaidAt(start, selectedTime)
    // 날짜 선택 시 모달을 닫지 않음
  }

  // 시간 선택 핸들러
  const handleTimeChange = (time: string) => {
    setSelectedTime(time)
    if (selectedDate) {
      updatePaidAt(selectedDate, time)
    }
  }

  // 12시간 형식 시간 변경 핸들러
  const handle12HourTimeChange = (newHour?: number, newMinute?: number, newIsAM?: boolean) => {
    const updatedHour = newHour !== undefined ? newHour : hour12
    const updatedMinute = newMinute !== undefined ? newMinute : minute
    const updatedIsAM = newIsAM !== undefined ? newIsAM : isAM

    // 범위 검증
    const validHour = Math.max(1, Math.min(12, updatedHour))
    const validMinute = Math.max(0, Math.min(59, updatedMinute))

    setHour12(validHour)
    setMinute(validMinute)
    setIsAM(updatedIsAM)

    // 24시간 형식으로 변환
    const time24 = convertTo24Hour(validHour, validMinute, updatedIsAM)
    handleTimeChange(time24)
  }

  // 날짜 포맷 함수 (Date 객체용)
  const formatDateFromDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 멤버 목록 로드
  useEffect(() => {
    if (isOpen && tripId) {
      const loadMembers = async () => {
        try {
          const response = await PlanService.getTripMembers(Number(tripId))
          setMembers(response.members)
        } catch (err) {
          console.error('멤버 목록 불러오기 실패:', err)
        }
      }
      loadMembers()
    } else {
      setMembers([])
    }
  }, [isOpen, tripId])

  // 초기 로드
  useEffect(() => {
    if (isOpen && tripId && costId) {
      const loadCostDetail = async () => {
        setIsLoading(true)
        setError(null)
        try {
          const response = await CostDetailService.getCostDetail(Number(tripId), costId)
          setCostDetail(response)
        } catch (err) {
          console.error('비용 상세 불러오기 실패:', err)
          setError('비용 상세 정보를 불러오는데 실패했습니다.')
        } finally {
          setIsLoading(false)
        }
      }
      loadCostDetail()

      // 초기 수정 가능 여부 확인
      const checkEditStatus = async () => {
        try {
          const response = await EditLockStateService.getLockState(Number(tripId), costId)
          setCanEdit(response.canEdit)
        } catch (err) {
          console.error('수정 상태 확인 실패:', err)
          // 에러 발생 시에도 기본값 true 유지 (아무도 수정 중이 아닐 때는 수정 가능해야 함)
          // setCanEdit(true) // 이미 초기값이 true이므로 생략 가능
        }
      }
      checkEditStatus()

      // 정산 수락 정보 로드
      const loadSettleInfo = async () => {
        try {
          const response = await CostSettleService.getSettle(Number(tripId))
          setSettleInfo(response)
        } catch (err) {
          console.error('정산 수락 정보 불러오기 실패:', err)
        }
      }
      loadSettleInfo()
    } else {
      setCostDetail(null)
      setError(null)
      setCanEdit(false)
    }
  }, [isOpen, tripId, costId])

  // 1분마다 자동으로 GET 요청 (polling) - 읽기 모드일 때만
  useEffect(() => {
    if (!isOpen || !tripId || !costId || isEditing) return // 수정 모드일 때는 실행하지 않음

    const pollCostDetail = async () => {
      try {
        // 수정 상태 조회 요청
        const response = await EditLockStateService.getLockState(Number(tripId), costId)
        // 수정 가능 여부 업데이트
        setCanEdit(response.canEdit)
      } catch (err) {
        console.error('수정 상태 polling 실패:', err)
      }
    }

    // 1분(60000ms)마다 요청
    const intervalId = setInterval(pollCostDetail, 60000)

    // cleanup: 모달이 닫히거나 컴포넌트가 unmount되면 interval 정리
    return () => {
      clearInterval(intervalId)
    }
  }, [isOpen, tripId, costId, isEditing])

  // 수정 모드일 때 1분마다 락 갱신
  useEffect(() => {
    if (!isOpen || !tripId || !costId || !isEditing) return

    const renewLock = async () => {
      try {
        await EditLockStateService.modifyLockState(Number(tripId), costId)
        // console.log('락 갱신 성공')
      } catch (err) {
        console.error('락 갱신 실패:', err)
        // 락 갱신 실패 시 수정 모드 종료 및 락 해제 시도
        try {
          await EditLockStateService.releaseLockState(Number(tripId), costId)
        } catch (releaseErr) {
          console.error('락 해제 실패:', releaseErr)
        }
        setIsEditing(false)
        setError('락 갱신에 실패했습니다. 수정 모드를 종료합니다.')
      }
    }

    // 1분(60000ms)마다 락 갱신
    const intervalId = setInterval(renewLock, 60000)

    // cleanup: 수정 모드가 종료되면 interval 정리
    return () => {
      clearInterval(intervalId)
    }
  }, [isOpen, tripId, costId, isEditing])

  const handleEditClick = async () => {
    // 수정 상태 획득 요청
    const response = await EditLockStateService.acquireLockState(Number(tripId), costId)
    if (response.lockAcquired) {
      // 수정 모드로 전환
      setIsEditing(true)
      setError(null)
      setEditFormError(null)

      // 기존 데이터를 폼 데이터로 변환
      if (costDetail) {
        const payerMember = members.find((m) => m.memberId === costDetail.payerId)
        setPayer(
          payerMember
            ? {
                id: String(payerMember.memberId),
                name: payerMember.memberName,
                email: '',
                picture: payerMember.thumbnailUrl,
              }
            : null
        )

        // paidAt을 날짜와 시간으로 분리
        const { date, time } = parsePaidAt(costDetail.paidAt)
        setSelectedDate(date)
        setSelectedTime(time)

        setFormData({
          paidAt: costDetail.paidAt, // 원래 형식 유지 (YYYY-MM-DD HH:MM:SS)
          place: costDetail.place,
          payerId: costDetail.payerId,
          memo: costDetail.memo,
          menus: costDetail.items.map((item) => ({
            costMenuId: item.menuId, // CostItem의 menuId를 costMenuId로 사용
            menuName: item.menuName,
            count: item.count,
            amount: item.amount,
            payerIds: item.memberIds.map((id) => Number(id)),
          })),
        })
      }
    } else {
      // 수정 불가능
      setError('이미 다른 사람이 수정 중입니다.')
    }
  }

  const handleCancelEdit = async () => {
    // 수정 락 해제
    try {
      await EditLockStateService.releaseLockState(Number(tripId), costId)
    } catch (err) {
      console.error('수정 락 해제 실패:', err)
    }
    setIsEditing(false)
    setError(null)
    setEditFormError(null)
  }

  const handleSaveEdit = async () => {
    const validationMessage = validateEditForm()
    if (validationMessage) {
      setEditFormError(validationMessage)
      return
    }

    setEditFormError(null)
    setIsSubmitting(true)
    setError(null)

    try {
      // CostModifyRequest 형식으로 변환
      const modifyRequest: CostModifyRequest = {
        paidAt: formData.paidAt.replace('T', ' ') + ':00',
        place: formData.place,
        payerId: formData.payerId,
        memo: formData.memo || null,
        menus: formData.menus,
      }

      await CostModifyService.modifyCost(Number(tripId), costId, modifyRequest)

      // 수정 락 해제
      await EditLockStateService.releaseLockState(Number(tripId), costId)

      // 수정 모드 종료 및 데이터 새로고침
      setIsEditing(false)
      const response = await CostDetailService.getCostDetail(Number(tripId), costId)
      setCostDetail(response)
      setEditFormError(null)

      // 목록 및 정산 내역 새로고침 (비동기 처리)
      if (onRefresh) {
        await onRefresh()
      }
    } catch (err) {
      console.error('비용 수정 실패:', err)
      setError('비용 수정에 실패했습니다. 다시 시도해주세요.')

      // 오류 발생 시 락 해제
      try {
        await EditLockStateService.releaseLockState(Number(tripId), costId)
      } catch (releaseErr) {
        console.error('락 해제 실패:', releaseErr)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // 결제자 선택 핸들러
  const handlePayerSelect = (selectedUser: User) => {
    setPayer(selectedUser)
    setFormData({ ...formData, payerId: Number(selectedUser.id) })
  }

  // 멤버 선택 핸들러
  const handleMemberSelect = (index: number, memberIds: string[]) => {
    const newMenus = [...formData.menus]
    newMenus[index].payerIds = memberIds.map((id) => Number(id))
    // count는 참여자 수와 독립적으로 유지 (수동으로 변경 가능)
    setFormData({ ...formData, menus: newMenus })
  }

  // 결제 항목 삭제 핸들러
  const handleDelete = async () => {
    if (!confirm('정말로 이 결제 내역을 삭제하시겠습니까?')) {
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      await CostDetailService.deleteCost(Number(tripId), costId)
      // 삭제 성공 시 모달 닫기 및 목록 새로고침
      onClose()
      if (onRefresh) {
        onRefresh()
      }
    } catch (err) {
      console.error('결제 내역 삭제 실패:', err)
      setError('결제 내역 삭제에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsDeleting(false)
    }
  }

  // 모달 닫을 때 수정 모드라면 락 해제
  const handleClose = async () => {
    if (isEditing) {
      try {
        await EditLockStateService.releaseLockState(Number(tripId), costId)
      } catch (err) {
        console.error('수정 락 해제 실패:', err)
      }
      setIsEditing(false)
    }
    setEditFormError(null)
    onClose()
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}`
    } catch {
      return dateString
    }
  }

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('ko-KR')
  }

  // 멤버 ID로 이름 찾기
  const getMemberName = (memberId: number): string => {
    const member = members.find((m) => m.memberId === memberId)
    return member?.memberName || `ID: ${memberId}`
  }

  // 멤버 ID로 멤버 정보 찾기 (string ID를 number로 변환)
  const getMemberById = (memberIdString: string): Members | undefined => {
    const memberId = Number(memberIdString)
    return members.find((m) => m.memberId === memberId)
  }

  // 모든 인원이 정산 수락했는지 확인
  const isAllMembersAccepted =
    settleInfo &&
    settleInfo.acceptedCount === settleInfo.totalMemberCount &&
    settleInfo.totalMemberCount > 0

  // 수정/삭제 가능 여부 (정산 수락 완료되면 불가능, settleInfo가 로드되기 전에는 버튼 숨김)
  const canModifyOrDelete = settleInfo !== null && canEdit && !isAllMembersAccepted

  if (!isOpen) return null

  // 증빙 자료가 있는지 확인
  const hasReceipt = costDetail?.receiptJson

  const modalContent = (
    <>
      {scrollbarStyle}
      <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-[100] p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

        {/* Modal Content */}
        <div
          className={`relative w-full ${
            hasReceipt ? 'max-w-2xl lg:max-w-4xl' : 'max-w-lg lg:max-w-xl'
          } bg-white rounded-3xl shadow-xl p-6 sm:p-8 font-bmjua max-h-[90vh] overflow-y-auto custom-scrollbar`}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6 pt-6">
            <h2 className="text-xl font-bold text-text-500 font-bmjua">
              {isEditing ? '결제 내역 수정' : '결제 내역 상세'}
            </h2>
            {isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center whitespace-nowrap font-bmjua px-6 py-2.5 text-base rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                >
                  취소
                </button>
                <SolidButton onClick={handleSaveEdit} disabled={isSubmitting}>
                  {isSubmitting ? '저장 중...' : '저장'}
                </SolidButton>
              </div>
            ) : (
              <div className="flex flex-col items-end gap-2">
                {canModifyOrDelete ? (
                  <>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDelete}
                        disabled={!canEdit}
                        className="inline-flex items-center justify-center whitespace-nowrap font-bmjua px-6 py-2.5 text-base rounded-full bg-red-500 text-white hover:bg-red-600 shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                      >
                        {isDeleting ? '삭제 중...' : '삭제'}
                      </button>
                      <SolidButton onClick={handleEditClick} disabled={!canEdit}>
                        수정하기
                      </SolidButton>
                    </div>
                    {!canEdit && (
                      <p className="text-xs text-red-500 font-bmjua">
                        다른 사용자가 수정 중입니다.
                      </p>
                    )}
                  </>
                ) : null}
              </div>
            )}
            <CloseButton onClick={handleClose} className="absolute top-3 right-4" />
          </div>

          {/* Modal Body */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">로딩 중...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">{error}</div>
            ) : costDetail ? (
              <>
                {isEditing ? (
                  // 수정 모드
                  <>
                    {editFormError && (
                      <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
                        {editFormError}
                      </div>
                    )}
                    {/* 기본 정보 카드 */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                      <h3 className="text-lg font-bold text-text-500">기본 정보</h3>

                      {/* 결제자 선택 */}
                      <div>
                        <p className="text-sm text-text-600 mb-1">결제자</p>
                        <div className="bg-white rounded-2xl p-3 shadow-sm flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {payer?.picture ? (
                              <img
                                src={payer.picture}
                                alt={payer.name}
                                className="w-12 h-12 rounded-full object-cover border-2 border-blue-400"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-2 border-blue-400">
                                <span className="text-white font-bold text-lg">
                                  {payer?.name.charAt(0) || 'U'}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-text-500">{payer?.name || '사용자'}</p>
                          </div>
                          <button
                            type="button"
                            className="px-3 py-1.5 text-sm bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors font-bold"
                            onClick={() => setIsPayerModalOpen(true)}
                          >
                            변경
                          </button>
                        </div>
                      </div>

                      {/* 결제 일시 */}
                      <div>
                        <p className="text-sm text-text-600 mb-1">결제 일시</p>
                        <button
                          ref={dateTimeButtonRef}
                          type="button"
                          onClick={() => setShowCalendar(!showCalendar)}
                          className="w-full bg-white rounded-2xl py-2.5 sm:py-3 px-4 sm:px-5 text-left text-text-500 text-sm sm:text-base shadow-sm hover:shadow-md hover:scale-[1.02] transition-all flex items-center justify-between"
                        >
                          <span>
                            {selectedDate && selectedTime
                              ? `${formatDateFromDate(selectedDate)} ${selectedTime}`
                              : 'YYYY-MM-DD HH:MM'}
                          </span>
                          <svg
                            className={`w-4 h-4 text-slate-400 transition-transform ${showCalendar ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                        {/* 캘린더와 시간 선택 표시 */}
                        {showCalendar && (
                          <div
                            ref={calendarContainerRef}
                            className="mt-3 flex flex-col sm:flex-row gap-2 justify-center items-start"
                          >
                            {/* 캘린더 */}
                            <div className="flex justify-center">
                              <Calendar
                                mode="single"
                                onDateSelect={handleDateSelect}
                                initialStartDate={selectedDate || undefined}
                                initialEndDate={selectedDate || undefined}
                              />
                            </div>
                            {/* 시간 선택 */}
                            <div className="w-full sm:w-auto min-w-[160px] max-w-[180px] bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 font-bmjua">
                              <div className="grid grid-cols-3 gap-2">
                                {/* 시 */}
                                <div className="flex flex-col">
                                  <label className="text-xs font-semibold text-slate-600 mb-1 text-center">
                                    시
                                  </label>
                                  <div className="max-h-48 overflow-y-auto custom-scrollbar border border-slate-200 rounded-lg">
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                                      <button
                                        key={h}
                                        type="button"
                                        onClick={() =>
                                          handle12HourTimeChange(h, undefined, undefined)
                                        }
                                        className={`w-full px-2 py-1.5 text-sm text-center transition ${
                                          hour12 === h
                                            ? 'bg-blue-500 text-white font-semibold'
                                            : 'hover:bg-slate-100 text-slate-700'
                                        }`}
                                      >
                                        {h}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                {/* 분 */}
                                <div className="flex flex-col">
                                  <label className="text-xs font-semibold text-slate-600 mb-1 text-center">
                                    분
                                  </label>
                                  <div className="max-h-48 overflow-y-auto custom-scrollbar border border-slate-200 rounded-lg">
                                    {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                                      <button
                                        key={m}
                                        type="button"
                                        onClick={() =>
                                          handle12HourTimeChange(undefined, m, undefined)
                                        }
                                        className={`w-full px-2 py-1.5 text-sm text-center transition ${
                                          minute === m
                                            ? 'bg-blue-500 text-white font-semibold'
                                            : 'hover:bg-slate-100 text-slate-700'
                                        }`}
                                      >
                                        {String(m).padStart(2, '0')}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                {/* 오전/오후 */}
                                <div className="flex flex-col gap-2 justify-center items-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handle12HourTimeChange(undefined, undefined, true)
                                    }
                                    className={`w-10 h-10 rounded-full text-xs font-semibold transition flex items-center justify-center ${
                                      isAM
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                  >
                                    오전
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handle12HourTimeChange(undefined, undefined, false)
                                    }
                                    className={`w-10 h-10 rounded-full text-xs font-semibold transition flex items-center justify-center ${
                                      !isAM
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                  >
                                    오후
                                  </button>
                                </div>
                              </div>
                              {/* 미리보기 */}
                              <div className="mt-3 pt-2 border-t border-slate-100">
                                <div className="text-xs font-semibold text-slate-700 text-center">
                                  {selectedTime || '00:00'}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 장소 */}
                      <div>
                        <p className="text-sm text-text-600 mb-1">장소</p>
                        <input
                          type="text"
                          value={formData.place}
                          onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                          placeholder="예: 스타벅스 강남점"
                          className="w-full px-4 py-2.5 text-sm text-text-500 rounded-xl border-none outline-none focus:outline-none focus:ring-0 transition-all hover:shadow-md placeholder:text-gray-400"
                        />
                      </div>

                      {/* 메모 */}
                      <div>
                        <p className="text-sm text-text-600 mb-1">메모</p>
                        <textarea
                          value={formData.memo || ''}
                          onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                          placeholder="메모를 입력하세요"
                          rows={3}
                          className="w-full px-4 py-2.5 text-sm text-text-500 rounded-xl border-none outline-none focus:outline-none focus:ring-0 transition-all hover:shadow-md resize-none placeholder:text-gray-400"
                        />
                      </div>
                    </div>

                    {/* 상세 정보 카드 */}
                    {formData.menus.length > 0 && (
                      <div className="bg-blue-50 rounded-xl p-4">
                        <h3 className="text-lg font-bold text-text-500 mb-2">상세 정보</h3>
                        <div className="space-y-2">
                          {formData.menus.map((menu, index) => (
                            <div
                              key={index}
                              className="bg-white rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-hidden mb-3 sm:mb-4"
                            >
                              <div>
                                <label className="block text-xs text-text-500 mb-1 sm:mb-2">
                                  품목명
                                </label>
                                <input
                                  type="text"
                                  value={menu.menuName}
                                  onChange={(e) => {
                                    const newMenus = [...formData.menus]
                                    newMenus[index].menuName = e.target.value
                                    setFormData({ ...formData, menus: newMenus })
                                  }}
                                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-50 border border-blue-300 rounded-lg text-sm outline-none focus:outline-none focus:ring-0 focus:border-blue-400"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-text-500 mb-1 sm:mb-2">
                                  금액
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100000000"
                                  value={menu.amount || ''}
                                  onChange={(e) => {
                                    const newMenus = [...formData.menus]
                                    const value = Number(e.target.value)
                                    // 최대값 1억(100,000,000) 제한
                                    newMenus[index].amount = value > 100000000 ? 100000000 : value
                                    setFormData({ ...formData, menus: newMenus })
                                  }}
                                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-50 border border-blue-300 rounded-lg text-sm text-right outline-none focus:outline-none focus:ring-0 focus:border-blue-400"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-text-500 mb-1 sm:mb-2">
                                  수량
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max="9999"
                                  value={menu.count || ''}
                                  onChange={(e) => {
                                    const newMenus = [...formData.menus]
                                    const value = Number(e.target.value)
                                    // 최대값 9999 제한
                                    newMenus[index].count = value > 9999 ? 9999 : value
                                    setFormData({ ...formData, menus: newMenus })
                                  }}
                                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-50 border border-blue-300 rounded-lg text-sm text-right outline-none focus:outline-none focus:ring-0 focus:border-blue-400"
                                />
                              </div>
                              {/* 참여자 선택 */}
                              <div>
                                <label className="block text-xs text-text-500 mb-1 sm:mb-2">
                                  결제 참여자
                                </label>
                                {menu.payerIds && menu.payerIds.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    {menu.payerIds.map((memberId) => {
                                      const member = members.find((m) => m.memberId === memberId)
                                      if (!member) return null
                                      return (
                                        <div
                                          key={memberId}
                                          className="flex items-center space-x-2 px-2 py-1 bg-blue-50 rounded-lg border border-blue-200"
                                        >
                                          {member.thumbnailUrl ? (
                                            <img
                                              src={member.thumbnailUrl}
                                              alt={member.memberName}
                                              className="w-6 h-6 rounded-full object-cover"
                                            />
                                          ) : (
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                                              <span className="text-white text-xs font-bold">
                                                {member.memberName.charAt(0)}
                                              </span>
                                            </div>
                                          )}
                                          <span className="text-xs font-bold text-text-500">
                                            {member.memberName}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newMenus = [...formData.menus]
                                              newMenus[index].payerIds = newMenus[
                                                index
                                              ].payerIds.filter((id) => id !== memberId)
                                              // count는 참여자 수와 독립적으로 유지 (수동으로 변경 가능)
                                              setFormData({ ...formData, menus: newMenus })
                                            }}
                                            className="text-blue-600 hover:text-blue-800"
                                          >
                                            <svg
                                              className="w-3 h-3"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M6 18L18 6M6 6l12 12"
                                              />
                                            </svg>
                                          </button>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setOpenMemberModalIndex(index)}
                                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm text-left flex items-center justify-between"
                                >
                                  <span className="text-text-500">
                                    {menu.payerIds && menu.payerIds.length > 0
                                      ? `${menu.payerIds.length}명 선택됨`
                                      : '참여자 선택'}
                                  </span>
                                  <svg
                                    className="w-4 h-4 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 9l-7 7-7-7"
                                    />
                                  </svg>
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const newMenus = formData.menus.filter((_, i) => i !== index)
                                  setFormData({ ...formData, menus: newMenus })
                                }}
                                className="text-xs text-red-500 hover:text-red-700"
                              >
                                삭제
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              menus: [
                                ...formData.menus,
                                {
                                  costMenuId: null, // 새 메뉴는 null로 설정 (서버에서 새 항목으로 인식)
                                  menuName: '',
                                  count: 1,
                                  amount: 0,
                                  payerIds: [],
                                },
                              ],
                            })
                          }}
                          className="mt-2 px-3 py-1 text-xs bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors font-bold"
                        >
                          + 품목 추가
                        </button>
                      </div>
                    )}
                  </>
                ) : // 읽기 모드
                costDetail.receiptJson ? (
                  // 증빙 자료가 있을 때: 그리드 레이아웃
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    {/* 왼쪽 열: 기본 정보 + 상세 정보 */}
                    <div className="lg:col-span-3 space-y-4">
                      {/* 기본 정보 */}
                      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                        <h3 className="text-lg font-bold text-text-500">기본 정보</h3>

                        <div>
                          <p className="text-sm text-text-600 mb-1">결제자</p>
                          <p className="text-base font-semibold text-text-500">
                            {getMemberName(costDetail.payerId)}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-text-600 mb-1">결제 일시</p>
                          <p className="text-base font-semibold text-text-500">
                            {formatDate(costDetail.paidAt)}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-text-600 mb-1">결제 금액</p>
                          <p className="text-lg font-bold text-blue-600">
                            {formatAmount(costDetail.totalAmount)}원
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-text-600 mb-1">장소</p>
                          <p className="text-base font-semibold text-text-500">
                            {costDetail.place}
                          </p>
                        </div>

                        {costDetail.memo && (
                          <div>
                            <p className="text-sm text-text-600 mb-1">메모</p>
                            <p className="text-base text-text-500">{costDetail.memo}</p>
                          </div>
                        )}
                      </div>

                      {/* 상세 정보 */}
                      {costDetail.items && costDetail.items.length > 0 && (
                        <div className="bg-blue-50 rounded-xl p-4">
                          <h3 className="text-lg font-bold text-text-500">상세 정보</h3>
                          <div className="space-y-2">
                            {costDetail.items.map((item, index) => (
                              <div key={index} className="bg-white rounded-lg p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <p className="font-semibold text-text-500">{item.menuName}</p>
                                  <p className="font-bold text-blue-600">
                                    {formatAmount(item.amount)}원
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-xs text-text-600">
                                    <span>수량: {item.count}</span>
                                  </div>
                                  {item.memberIds && item.memberIds.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-xs text-text-600">참여자:</span>
                                      {item.memberIds.map((memberIdString) => {
                                        const member = getMemberById(memberIdString)
                                        return (
                                          <div
                                            key={memberIdString}
                                            className="flex items-center gap-1.5 bg-white rounded-full px-2 py-1 border border-gray-200"
                                          >
                                            {member?.thumbnailUrl ? (
                                              <img
                                                src={member.thumbnailUrl}
                                                alt={member.memberName}
                                                className="w-5 h-5 rounded-full object-cover"
                                              />
                                            ) : (
                                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                                                <span className="text-white text-xs font-bold">
                                                  {member?.memberName?.charAt(0) || '?'}
                                                </span>
                                              </div>
                                            )}
                                            <span className="text-xs font-semibold text-text-500">
                                              {member?.memberName || `ID: ${memberIdString}`}
                                            </span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 증빙 자료 - 오른쪽 (큰 화면) / 하단 (작은 화면) */}
                    <div className="lg:col-span-2 lg:row-span-2 lg:self-start">
                      <p className="text-sm text-text-600 mb-2 font-bmjua">증빙 자료</p>
                      <div className="relative bg-white rounded-xl overflow-hidden border border-gray-200">
                        <img
                          src={costDetail.receiptJson}
                          alt="증빙 자료"
                          className="w-full h-auto max-h-96 lg:max-h-full object-contain"
                          onError={(e) => {
                            // 이미지 로드 실패 시 에러 처리
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const parent = target.parentElement
                            if (parent) {
                              parent.innerHTML =
                                '<div class="p-4 text-center text-gray-500">증빙 자료를 불러올 수 없습니다.</div>'
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  // 증빙 자료가 없을 때: 원래 레이아웃
                  <>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                      <h3 className="text-lg font-bold text-text-500">기본 정보</h3>

                      <div>
                        <p className="text-sm text-text-600 mb-1">결제자</p>
                        <p className="text-base font-semibold text-text-500">
                          {getMemberName(costDetail.payerId)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-text-600 mb-1">결제 일시</p>
                        <p className="text-base font-semibold text-text-500">
                          {formatDate(costDetail.paidAt)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-text-600 mb-1">결제 금액</p>
                        <p className="text-lg font-bold text-blue-600">
                          {formatAmount(costDetail.totalAmount)}원
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-text-600 mb-1">장소</p>
                        <p className="text-base font-semibold text-text-500">{costDetail.place}</p>
                      </div>

                      {costDetail.memo && (
                        <div>
                          <p className="text-sm text-text-600 mb-1">메모</p>
                          <p className="text-base text-text-500">{costDetail.memo}</p>
                        </div>
                      )}
                    </div>

                    {/* 상세 정보 */}
                    {costDetail.items && costDetail.items.length > 0 && (
                      <div className="bg-blue-50 rounded-xl p-4">
                        <h3 className="text-lg font-bold text-text-500">상세 정보</h3>
                        <div className="space-y-2">
                          {costDetail.items.map((item, index) => (
                            <div key={index} className="bg-white rounded-lg p-3">
                              <div className="flex justify-between items-start mb-2">
                                <p className="font-semibold text-text-500">{item.menuName}</p>
                                <p className="font-bold text-blue-600">
                                  {formatAmount(item.amount)}원
                                </p>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-text-600">
                                  <span>수량: {item.count}</span>
                                </div>
                                {item.memberIds && item.memberIds.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-text-600">참여자:</span>
                                    {item.memberIds.map((memberIdString) => {
                                      const member = getMemberById(memberIdString)
                                      return (
                                        <div
                                          key={memberIdString}
                                          className="flex items-center gap-1.5 bg-white rounded-full px-2 py-1 border border-gray-200"
                                        >
                                          {member?.thumbnailUrl ? (
                                            <img
                                              src={member.thumbnailUrl}
                                              alt={member.memberName}
                                              className="w-5 h-5 rounded-full object-cover"
                                            />
                                          ) : (
                                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                                              <span className="text-white text-xs font-bold">
                                                {member?.memberName?.charAt(0) || '?'}
                                              </span>
                                            </div>
                                          )}
                                          <span className="text-xs font-semibold text-text-500">
                                            {member?.memberName || `ID: ${memberIdString}`}
                                          </span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : null}
          </div>
        </div>

        {/* 결제자 선택 모달 */}
        {isPayerModalOpen && (
          <PayerSelectModal
            isOpen={isPayerModalOpen}
            onClose={() => setIsPayerModalOpen(false)}
            tripId={tripId}
            onSelect={handlePayerSelect}
          />
        )}

        {/* 멤버 선택 모달 */}
        {openMemberModalIndex !== null && (
          <MemberSelectModal
            isOpen={openMemberModalIndex !== null}
            onClose={() => setOpenMemberModalIndex(null)}
            tripId={tripId}
            selectedMemberIds={
              formData.menus[openMemberModalIndex]?.payerIds.map((id) => String(id)) || []
            }
            onSelect={(memberIds) => {
              handleMemberSelect(openMemberModalIndex, memberIds)
              setOpenMemberModalIndex(null)
            }}
          />
        )}
      </div>
    </>
  )

  return createPortal(modalContent, document.body)
}

// 스크롤바 스타일 (CostDetailModal 내부에서 사용)
const scrollbarStyle = (
  <style>{`
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 3px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
  `}</style>
)

export default CostDetailModal
