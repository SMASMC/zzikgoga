import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { MemoryService } from '@/features/memory/services/memoryService'
import { MemoryNftInfoResponse, MemoryNftOwnershipResponse } from '@/features/memory/types/memory'
import SolidButton from '@/components/atoms/SolidButton'

const MemoryNftPage = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const safeTripId = useMemo(() => tripId ?? '', [tripId])

  const [info, setInfo] = useState<MemoryNftInfoResponse | null>(null)
  const [ownership, setOwnership] = useState<MemoryNftOwnershipResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!safeTripId) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const [infoRes, ownershipRes] = await Promise.all([
          MemoryService.getNftInfo(safeTripId),
          MemoryService.getNftOwnership(safeTripId),
        ])
        if (cancelled) return
        setInfo(infoRes)
        setOwnership(ownershipRes)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'NFT 정보를 불러오지 못했습니다.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [safeTripId])

  const handleOpenVerify = () => {
    if (!ownership?.verifyUrl) return
    window.open(ownership.verifyUrl, '_blank', 'noopener,noreferrer')
  }

  if (loading) {
    return (
      <main className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 mt-6 sm:mt-8 md:mt-10 pb-10">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-point-500 mb-4" />
          <p className="text-text-500">NFT 정보를 불러오는 중입니다...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 mt-6 sm:mt-8 md:mt-10 pb-10">
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-red-600 mb-4">{error}</p>
          <SolidButton onClick={() => window.location.reload()}>다시 시도</SolidButton>
        </div>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 mt-6 sm:mt-8 md:mt-10 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          <div className="bg-white rounded-3xl shadow-lg p-4 sm:p-6 h-full min-h-[400px]">
            <h2 className="text-xl font-bold text-text-500 mb-4 font-bmjua">영구 저장된 기록</h2>
            {info?.pdfUrl ? (
              <div className="w-full h-[70vh]">
                <iframe
                  src={info.pdfUrl}
                  title="영구 저장된 여행 기록 PDF"
                  className="w-full h-full rounded-2xl border border-gray-200"
                />
              </div>
            ) : (
              <p className="text-text-400">PDF 정보를 찾을 수 없습니다.</p>
            )}
          </div>
        </section>

        <aside className="lg:col-span-1">
          <div className="bg-white rounded-3xl shadow-lg p-4 sm:p-6 h-full min-h-[200px] flex flex-col gap-4">
            <h3 className="text-lg font-bold text-text-500 font-bmjua">NFT 정보</h3>
            <div className="text-sm text-text-500 space-y-2">
              <div>
                <span className="font-semibold">여행 ID: </span>
                <span>{info?.tripId ?? ownership?.tripId ?? '-'}</span>
              </div>
              <div>
                <span className="font-semibold">지갑 주소: </span>
                <span className="break-all">{ownership?.walletAddress ?? '-'}</span>
              </div>
              <div>
                <span className="font-semibold">메타데이터 URL: </span>
                {info?.metadataUrl ? (
                  <a
                    href={info.metadataUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline break-all"
                  >
                    {info.metadataUrl}
                  </a>
                ) : (
                  <span>-</span>
                )}
              </div>
            </div>

            <div className="mt-4">
              <SolidButton
                onClick={handleOpenVerify}
                disabled={!ownership?.verifyUrl}
                className="w-full"
              >
                블록체인에서 확인하기
              </SolidButton>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}

export default MemoryNftPage
