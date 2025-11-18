// CostAdd.tsx
// 정산 추가 컴포넌트
// 영수증 모달과 사진 직접 추가 모달을 위함

import CostPlusModal from './CostPlusModal'
import { useState, useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { CostReciptService, CostSettleService } from '../services/costService'
import { ToastDock } from '@/components/blocks/ToastDock'
import { SettleResponse } from '../types/settle'

interface CostAddProps {
  onCostAdded?: () => void
}

export interface CostAddRef {
  refreshSettleInfo: () => void
}

const CostAdd = forwardRef<CostAddRef, CostAddProps>(({ onCostAdded }, ref) => {
  const { tripId } = useParams<{ tripId: string }>()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [settleInfo, setSettleInfo] = useState<SettleResponse | null>(null)
  const [toast, setToast] = useState<{
    variant: 'success' | 'warning' | 'error'
    message: string
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 모든 인원이 정산 수락했는지 확인
  const isAllMembersAccepted =
    settleInfo &&
    settleInfo.acceptedCount === settleInfo.totalMemberCount &&
    settleInfo.totalMemberCount > 0

  const canAddCost = !isAllMembersAccepted

  // 정산 수락 정보 로드 함수
  const loadSettleInfo = useCallback(async () => {
    if (!tripId) return
    try {
      const response = await CostSettleService.getSettle(Number(tripId))
      setSettleInfo(response)
    } catch (err) {
      console.error('정산 수락 정보 불러오기 실패:', err)
    }
  }, [tripId])

  // 초기 로드
  useEffect(() => {
    if (tripId) {
      loadSettleInfo()
    }
  }, [tripId, loadSettleInfo])

  // 부모 컴포넌트에서 ref를 통해 loadSettleInfo 호출 가능하도록
  useImperativeHandle(
    ref,
    () => ({
      refreshSettleInfo: loadSettleInfo,
    }),
    [loadSettleInfo]
  )

  // 주기적으로 정산 수락 정보 polling (2초마다 - 빠른 반응을 위해)
  useEffect(() => {
    if (!tripId || isAllMembersAccepted) return // 이미 모든 인원이 수락했으면 polling 중단

    const pollSettleInfo = async () => {
      await loadSettleInfo()
    }

    // 2초(2000ms)마다 요청 - 빠른 반응을 위해
    const intervalId = setInterval(pollSettleInfo, 2000)

    // cleanup: 컴포넌트가 unmount되거나 모든 인원이 수락하면 interval 정리
    return () => {
      clearInterval(intervalId)
    }
  }, [tripId, isAllMembersAccepted, loadSettleInfo])

  const handleReceiptUpload = () => {
    if (!canAddCost) {
      setToast({
        variant: 'warning',
        message: '모든 인원이 정산을 수락하여 더 이상 추가할 수 없습니다.',
      })
      return
    }
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !tripId) return

    if (!canAddCost) {
      setToast({
        variant: 'warning',
        message: '모든 인원이 정산을 수락하여 더 이상 추가할 수 없습니다.',
      })
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setIsUploading(true)

    try {
      // 파일을 FormData로 감싸서 그대로 전송
      await CostReciptService.uploadReceipt(tripId, { file })

      // console.log('영수증 업로드 성공:', response)
      setToast({ variant: 'success', message: '영수증이 성공적으로 업로드되었습니다.' })

      // 파일 input 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // 정산 정보 업데이트
      await loadSettleInfo()

      // 목록 새로고침
      if (onCostAdded) {
        onCostAdded()
      }
    } catch (error) {
      console.error('영수증 업로드 실패:', error)
      setToast({
        variant: 'error',
        message: '영수증 업로드에 실패했습니다. 내역이 잘 보일 수 있도록 찍어주세요.',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleModalOpen = () => {
    if (!canAddCost) {
      setToast({
        variant: 'warning',
        message: '모든 인원이 정산을 수락하여 더 이상 추가할 수 없습니다.',
      })
      return
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    // 모달 닫힐 때 정산 내역 전송해야 함
    setIsModalOpen(false)
  }

  const handleModalSuccess = async () => {
    setIsModalOpen(false)
    // 정산 정보 업데이트
    await loadSettleInfo()
    // 목록 새로고침
    if (onCostAdded) {
      onCostAdded()
    }
  }

  return (
    <>
      <ToastDock
        open={Boolean(toast)}
        variant={toast?.variant ?? 'hint'}
        title="알림"
        message={toast?.message ?? ''}
        autoCloseMs={3000}
        offsetPx={16}
        onClose={() => setToast(null)}
      />
      <div className="bg-white rounded-3xl shadow-lg p-6 h-full">
        <h2 className="text-xl font-bold text-text-500 mb-6 font-bmjua">비용 추가하기</h2>

        {/* 파일 입력 (숨김) */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="space-y-4">
          {/* 영수증으로 추가하기 */}
          <button
            disabled={!canAddCost || isUploading || !tripId}
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (!isUploading && tripId && canAddCost) {
                handleReceiptUpload()
              }
            }}
            className={`relative z-10 w-full group bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 transition-all duration-300 border-2 touch-manipulation ${
              !canAddCost || isUploading || !tripId
                ? 'opacity-50 cursor-not-allowed border-blue-200'
                : 'cursor-pointer border-blue-200 hover:border-blue-400 hover:shadow-lg active:scale-[0.98]'
            }`}
            aria-disabled={!canAddCost || isUploading || !tripId}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-500 font-bmjua mb-1">
                  {isUploading ? '업로드 중...' : '영수증으로 추가하기'}
                </h3>
                <p className="text-xs text-text-600">
                  {isUploading ? '영수증을 처리하고 있습니다...' : '영수증을 업로드 해주세요'}
                </p>
              </div>
            </div>
          </button>
          <p className="h-4"></p>
          {/* 직접 추가하기 */}
          <button
            disabled={!canAddCost}
            type="button"
            onClick={handleModalOpen}
            className={`w-full group bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 transition-all duration-300 border-2 ${
              !canAddCost
                ? 'opacity-50 cursor-not-allowed border-blue-200'
                : 'cursor-pointer border-blue-200 hover:border-blue-400 hover:shadow-lg active:scale-[0.98]'
            }`}
            aria-disabled={!canAddCost}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-500 font-bmjua mb-1">직접 추가하기</h3>
                <p className="text-xs text-text-600">정산 할 내용을 직접 추가해주세요</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 직접 추가 모달 */}
      {isModalOpen && tripId && (
        <CostPlusModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          tripId={tripId}
          onSuccess={handleModalSuccess}
        />
      )}
    </>
  )
})

CostAdd.displayName = 'CostAdd'

export default CostAdd
