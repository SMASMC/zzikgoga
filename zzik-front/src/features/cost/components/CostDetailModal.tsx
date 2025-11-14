import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import CloseButton from '@/components/atoms/CloseButton'
import { CostDetailService, CostModifyService } from '../services/costService'
import { CostDetailResponse, CostModifyRequest } from '../types/cost'
import { PlanService } from '@/features/plan/services/planServices'
import { Members } from '@/features/plan/types/plan'
import { EditLockStateService } from '../services/editLockStateService'
import SolidButton from '@/components/atoms/SolidButton'
import PayerSelectModal from './PayerSelectModal'
import MemberSelectModal from './MemberSelectModal'
import { User } from '@/features/auth/types/auth'

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
        console.log('수정 상태 polling 성공:', response)
        // 수정 가능 여부 업데이트
        setCanEdit(response.canEdit)
      } catch (err) {
        console.error('수정 상태 polling 실패:', err)
        // polling 실패 시 이전 상태 유지 (에러로 인해 false로 설정하지 않음)
        // 아무도 수정 중이 아닐 때는 수정 가능해야 하므로 false로 설정하지 않음
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
        console.log('락 갱신 성공')
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

        setFormData({
          paidAt: formatDateForInput(costDetail.paidAt), // 원래 날짜 값을 datetime-local 형식으로 변환
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
  }

  const handleSaveEdit = async () => {
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

      // 목록 및 정산 내역 새로고침
      if (onRefresh) {
        onRefresh()
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

  // datetime-local input 형식으로 변환 (YYYY-MM-DDTHH:mm)
  const formatDateForInput = (dateString: string): string => {
    try {
      // "2024-01-01 12:00:00" 형식을 "2024-01-01T12:00" 형식으로 변환
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        // Date 파싱 실패 시 직접 변환 시도
        const normalized = dateString.replace(' ', 'T').replace(/:\d{2}$/, '') // 초 제거
        return normalized.slice(0, 16) // "YYYY-MM-DDTHH:mm" 형식으로 자르기
      }
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    } catch {
      // 변환 실패 시 기본 변환 시도
      return dateString.replace(' ', 'T').slice(0, 16)
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

  if (!isOpen) return null

  const modalContent = (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-[100] p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      {/* Modal Content */}
      <div className="relative w-full max-w-md sm:max-w-lg bg-gradient-to-br from-white via-background-500 to-background-600 rounded-3xl shadow-xl p-6 sm:p-8 font-bmjua max-h-[90vh] overflow-y-auto custom-scrollbar">
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
                className="inline-flex items-center justify-center whitespace-nowrap font-bmjua px-6 py-2.5 text-base rounded-2xl bg-gray-200 text-gray-700 hover:bg-gray-300 shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
              >
                취소
              </button>
              <SolidButton onClick={handleSaveEdit} disabled={isSubmitting}>
                {isSubmitting ? '저장 중...' : '저장'}
              </SolidButton>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center justify-center whitespace-nowrap font-bmjua px-6 py-2.5 text-base rounded-2xl bg-red-500 text-white hover:bg-red-600 shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
              <SolidButton onClick={handleEditClick} disabled={!canEdit}>
                수정하기
              </SolidButton>
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
                          className="px-3 py-1.5 text-sm bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors font-bold"
                          onClick={() => setIsPayerModalOpen(true)}
                        >
                          변경
                        </button>
                      </div>
                    </div>

                    {/* 결제 일시 */}
                    <div>
                      <p className="text-sm text-text-600 mb-1">결제 일시</p>
                      <input
                        type="datetime-local"
                        value={formData.paidAt}
                        onChange={(e) => setFormData({ ...formData, paidAt: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm text-text-500 rounded-xl border-none outline-none focus:outline-none focus:ring-0 transition-all hover:shadow-md"
                      />
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
                          <div key={index} className="bg-white rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-hidden mb-3 sm:mb-4">
                            <div>
                              <label className="block text-xs text-text-500 mb-1 sm:mb-2">품목명</label>
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
                              <label className="block text-xs text-text-500 mb-1 sm:mb-2">금액</label>
                              <input
                                type="number"
                                value={menu.amount || ''}
                                onChange={(e) => {
                                  const newMenus = [...formData.menus]
                                  newMenus[index].amount = Number(e.target.value)
                                  setFormData({ ...formData, menus: newMenus })
                                }}
                                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-50 border border-blue-300 rounded-lg text-sm outline-none focus:outline-none focus:ring-0 focus:border-blue-400"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-text-500 mb-1 sm:mb-2">수량</label>
                              <input
                                type="number"
                                value={menu.count || ''}
                                onChange={(e) => {
                                  const newMenus = [...formData.menus]
                                  newMenus[index].count = Number(e.target.value)
                                  setFormData({ ...formData, menus: newMenus })
                                }}
                                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-50 border border-blue-300 rounded-lg text-sm outline-none focus:outline-none focus:ring-0 focus:border-blue-400"
                              />
                            </div>
                            {/* 참여자 선택 */}
                            <div>
                              <label className="block text-xs text-text-500 mb-1 sm:mb-2">결제 참여자</label>
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
                        className="mt-2 px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-bold"
                      >
                        + 품목 추가
                      </button>
                    </div>
                  )}
                </>
              ) : (
                // 읽기 모드
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
              )}

              {/* 읽기 모드일 때만 상세 정보 표시 */}
              {!isEditing && costDetail.items && costDetail.items.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <h3 className="text-lg font-bold text-text-500">상세 정보</h3>
                  <div className="space-y-2">
                    {costDetail.items.map((item, index) => (
                      <div key={index} className="bg-white rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-semibold text-text-500">{item.menuName}</p>
                          <p className="font-bold text-blue-600">{formatAmount(item.amount)}원</p>
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
  )

  return createPortal(modalContent, document.body)
}

export default CostDetailModal
