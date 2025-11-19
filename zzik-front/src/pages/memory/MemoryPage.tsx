import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { HelpCircle, Upload } from 'lucide-react'
import Input from '@/components/atoms/Input'
import SolidButton from '@/components/atoms/SolidButton'
import CloseButton from '@/components/atoms/CloseButton'
import MarkdownEditor from '@/features/memory/components/MarkdownEditor'
import MemoryPhotoGallery from '@/features/memory/components/MemoryPhotoGallery'
import { CreateMemoryRequest, MemoryBlock, MemoryEntity } from '@/features/memory/types/memory'
import { MemoryService, MediaService } from '@/features/memory/services/memoryService'
import { ToastDock } from '@/components/blocks/ToastDock'

const MemoryPage = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const safeTripId = useMemo(() => tripId ?? '', [tripId])
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [markdown, setMarkdown] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [mintLoading, setMintLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<number | null>(null)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [photoRefreshKey, setPhotoRefreshKey] = useState(0)
  const [memory, setMemory] = useState<MemoryEntity | null>(null)
  const [hasPdf, setHasPdf] = useState(false)
  const [showMintConfirm, setShowMintConfirm] = useState(false)
  const [showMintComplete, setShowMintComplete] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [toast, setToast] = useState<{
    open: boolean
    variant: 'success' | 'warning' | 'error' | 'hint'
    message: string
  }>({ open: false, variant: 'success', message: '' })

  const canSave = title.trim().length > 0 && markdown.trim().length > 0 && !!safeTripId

  const canGeneratePdf =
    !!safeTripId &&
    !!memory?.title &&
    Array.isArray(memory?.content?.blocks) &&
    (memory?.content?.blocks.length ?? 0) > 0

  const markdownToBlocks = (md: string): MemoryBlock[] => {
    const lines = md.replace(/\r\n/g, '\n').split('\n')
    const blocks: MemoryBlock[] = []
    let paraBuf: string[] = []

    const flushPara = () => {
      if (paraBuf.length === 0) return
      const text = paraBuf.join('\n').trim()
      if (text.length === 0) return
      blocks.push({ id: crypto.randomUUID(), type: 'paragraph', data: { text } })
      paraBuf = []
    }

    const imageMd = /^!\[([^\]]*)\]\(([^)]+)\)/

    for (const raw of lines) {
      const line = raw.trimEnd()
      const trimmed = line.trim()
      if (trimmed.length === 0) {
        flushPara()
        continue
      }

      if (trimmed.startsWith('### ')) {
        flushPara()
        const text = trimmed.replace(/^###\s+/, '')
        blocks.push({ id: crypto.randomUUID(), type: 'heading3', data: { text } })
        continue
      }
      if (trimmed.startsWith('## ')) {
        flushPara()
        const text = trimmed.replace(/^##\s+/, '')
        blocks.push({ id: crypto.randomUUID(), type: 'heading2', data: { text } })
        continue
      }
      if (trimmed.startsWith('# ')) {
        flushPara()
        const text = trimmed.replace(/^#\s+/, '')
        blocks.push({ id: crypto.randomUUID(), type: 'heading1', data: { text } })
        continue
      }

      const m = trimmed.match(imageMd)
      if (m) {
        flushPara()
        const alt = m[1] || ''
        const url = m[2]
        blocks.push({ id: crypto.randomUUID(), type: 'image', data: { url, caption: alt } })
        continue
      }

      paraBuf.push(line)
    }
    flushPara()
    return blocks
  }

  const blocksToMarkdown = (blocks: MemoryBlock[]): string => {
    const parts: string[] = []
    for (const b of blocks) {
      switch (b.type) {
        case 'heading1':
          parts.push(`# ${b.data.text ?? ''}`)
          break
        case 'heading2':
          parts.push(`## ${b.data.text ?? ''}`)
          break
        case 'heading3':
          parts.push(`### ${b.data.text ?? ''}`)
          break
        case 'image': {
          const alt = b.data.caption ?? 'image'
          const url = b.data.url ?? ''
          parts.push(`![${alt}](${url})`)
          break
        }
        case 'list': {
          const style = b.data.style
          const items = b.data.items ?? []
          if (style === 'ordered') {
            const lines = items.map((item, idx) => `${idx + 1}. ${item}`)
            parts.push(lines.join('\n'))
          } else {
            const lines = items.map((item) => `- ${item}`)
            parts.push(lines.join('\n'))
          }
          break
        }
        default:
          parts.push(b.data.text ?? '')
      }
    }
    return parts.join('\n\n')
  }

  useEffect(() => {
    if (!safeTripId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await MemoryService.getMemory(safeTripId)
        if (cancelled || !res) return
        setMemory(res)
        setHasPdf(!!res.pdfUrl)
        setTitle(res.title ?? '')
        const blocks = res.content?.blocks
        if (Array.isArray(blocks) && blocks.length > 0) {
          setMarkdown(blocksToMarkdown(blocks))
        } else {
          setMarkdown('')
        }
      } catch {
        setMarkdown('')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [safeTripId])

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const payload: CreateMemoryRequest = {
        title,
        content: { blocks: markdownToBlocks(markdown) },
        status: 'onprocess',
      }
      const res = await MemoryService.putMemory(safeTripId, payload)
      setSavedId(res.memoryId)
      setMemory(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleGeneratePdf = async () => {
    if (!safeTripId || !canGeneratePdf) return
    setPdfLoading(true)
    setError(null)
    try {
      const res = await MemoryService.convertToPdf(safeTripId)
      const url = res.pdfUrl
      if (!url) throw new Error('PDF URL을 찾을 수 없습니다.')
      const a = document.createElement('a')
      a.href = url
      a.target = '_blank'
      a.rel = 'noopener'
      a.download = `memory-${res.memoryId ?? ''}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setHasPdf(true)
      setMemory((prev) => (prev ? { ...prev, pdfUrl: res.pdfUrl } : prev))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF 생성에 실패했습니다.')
    } finally {
      setPdfLoading(false)
    }
  }

  const startMintNft = async () => {
    if (!safeTripId || !hasPdf || mintLoading) return
    setShowMintConfirm(false)
    setMintLoading(true)
    setError(null)
    try {
      await MemoryService.mintNft(safeTripId)
      setShowMintComplete(true)
    } catch (e) {
      const message = e instanceof Error ? e.message : '영구 저장 중 오류가 발생했습니다.'
      setError(message)
      setToast({ open: true, variant: 'error', message })
    } finally {
      setMintLoading(false)
    }
  }

  const handleMintClick = () => {
    if (!safeTripId || !hasPdf || mintLoading) return
    setShowMintConfirm(true)
  }

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    try {
      setUploading(true)
      await MediaService.uploadMedia(safeTripId, files)
      e.target.value = ''
      setToast({ open: true, variant: 'success', message: '사진이 업로드되었습니다.' })
      setTimeout(() => {
        setPhotoRefreshKey((prev) => prev + 1)
      }, 500)
    } catch (err) {
      console.error(err)
      setToast({ open: true, variant: 'error', message: '사진 업로드에 실패했습니다.' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <main className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 mt-6 sm:mt-8 md:mt-10 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-lg overflow-hidden flex flex-col h-full min-h-[400px] lg:min-h-[calc(100vh-200px)]">
              <div className="flex items-center justify-between mt-6 mx-6 mb-6">
                <h2 className="text-xl font-bold text-text-500 font-bmjua">사진 모아보기</h2>
                <SolidButton
                  onClick={handleUploadButtonClick}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  <Upload size={16} />
                  {uploading ? '업로드 중...' : '사진 업로드'}
                </SolidButton>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              {safeTripId && <MemoryPhotoGallery key={photoRefreshKey} tripId={safeTripId} />}
            </div>
          </aside>

          <section className="lg:col-span-2 flex flex-col min-h-0">
            <div className="bg-white rounded-3xl shadow-lg p-6 flex flex-col h-full min-h-[400px] lg:min-h-[calc(100vh-200px)] relative">
              <div className="flex items-center gap-2 mb-6">
                <h2 className="text-xl font-bold text-text-500 font-bmjua">기록하기</h2>
                <button
                  onClick={() => setShowHelpModal(true)}
                  className="text-blue-500 hover:text-blue-600 transition-colors"
                  aria-label="마크다운 사용법 보기"
                >
                  <HelpCircle size={20} />
                </button>
              </div>
              <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 shrink-0 relative z-10">
                <div className="flex-1 relative z-10">
                  <Input
                    placeholder="제목을 입력해주세요"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="rounded-full flex-1"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="flex gap-2">
                  <SolidButton
                    onClick={handleSave}
                    disabled={!canSave || saving}
                    className="flex-1 sm:flex-none"
                  >
                    {saving ? '저장 중...' : '저장'}
                  </SolidButton>
                  <SolidButton
                    onClick={handleGeneratePdf}
                    disabled={!canGeneratePdf || pdfLoading}
                    className="flex-1 sm:flex-none"
                  >
                    {pdfLoading ? 'PDF 생성 중...' : 'PDF 생성'}
                  </SolidButton>
                  <SolidButton
                    onClick={handleMintClick}
                    disabled={!hasPdf || mintLoading}
                    className="flex-1 sm:flex-none"
                  >
                    {mintLoading ? '영구 저장 중...' : '영구 저장'}
                  </SolidButton>
                </div>
              </div>

              {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
              {savedId && (
                <div className="text-green-700 text-sm mb-2">저장 완료 (ID: {savedId})</div>
              )}

              <div
                className="flex-1 min-h-0 overflow-hidden relative z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <MarkdownEditor value={markdown} onChange={setMarkdown} />
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* 마크다운 도움말 모달 */}
      {showHelpModal && (
        <div
          className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4"
          onClick={() => setShowHelpModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-gradient-to-br from-white via-background-500 to-background-600 rounded-3xl shadow-xl p-6 sm:p-8 font-bmjua relative max-h-[90vh] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <CloseButton
              onClick={() => setShowHelpModal(false)}
              className="absolute top-3 right-4"
            />
            <h2 className="text-xl sm:text-2xl font-bold text-text-500 mb-6 font-bmjua">
              마크다운 사용법
            </h2>
            <div className="space-y-6 text-sm">
              <div>
                <h3 className="text-lg font-bold text-text-500 mb-2">제목</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div>
                    <code className="text-blue-600"># 제목 1</code>
                  </div>
                  <div>
                    <code className="text-blue-600">## 제목 2</code>
                  </div>
                  <div>
                    <code className="text-blue-600">### 제목 3</code>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-text-500 mb-2">이미지</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div>
                    <code className="text-blue-600">![이미지 설명](이미지URL)</code>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-text-500 mb-2">텍스트 스타일</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div>
                    <code className="text-blue-600">**굵게**</code>
                  </div>
                  <div>
                    <code className="text-blue-600">*기울임*</code>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-text-500 mb-2">리스트</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div>
                    <code className="text-blue-600">- 항목 1</code>
                    <br />
                    <code className="text-blue-600">- 항목 2</code>
                  </div>
                  <div className="mt-2">
                    <code className="text-blue-600">1. 항목 1</code>
                    <br />
                    <code className="text-blue-600">2. 항목 2</code>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-text-500 mb-2">링크</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <code className="text-blue-600">[링크 텍스트](URL)</code>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-6 py-3 bg-gradient-to-br from-hover-600 to-point-600 text-white rounded-full hover:scale-105 transition-transform font-semibold shadow-lg"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 영구 저장 확인 모달 */}
      {showMintConfirm && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 sm:p-8 font-bmjua"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-text-500 mb-4">정말 영구 저장할까요?</h2>
            <p className="text-text-500 text-sm mb-2">
              영구 저장을 하면 이 여행 기록은 블록체인에 기록되어
              <br />
              삭제하거나 수정할 수 없습니다.
            </p>
            <p className="text-text-400 text-xs mb-6">
              네트워크 상황에 따라 처리에 시간이 다소 걸릴 수 있어요.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowMintConfirm(false)}
                className="px-4 py-2 rounded-full border border-gray-300 text-sm text-text-500 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={startMintNft}
                className="px-5 py-2 rounded-full bg-gradient-to-br from-hover-600 to-point-600 text-white text-sm font-semibold hover:scale-105 transition-transform"
              >
                영구 저장하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 영구 저장 진행 중 모달 */}
      {mintLoading && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 sm:p-8 font-bmjua flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-point-500 mb-4" />
            <h2 className="text-lg font-bold text-text-500 mb-2">영구 저장을 진행 중이에요</h2>
            <p className="text-text-500 text-sm text-center">
              네트워크 상황에 따라 수 분 정도 걸릴 수 있어요.
              <br />
              페이지를 닫지 말고 잠시만 기다려 주세요.
            </p>
          </div>
        </div>
      )}

      {/* 영구 저장 완료 모달 */}
      {showMintComplete && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 sm:p-8 font-bmjua"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-text-500 mb-4">영구 저장이 완료되었습니다.</h2>
            <p className="text-text-500 text-sm mb-6">
              마이페이지에서 NFT로 저장된 여행 기록을 확인하실 수 있어요.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowMintComplete(false)
                  navigate('/mypage')
                }}
                className="px-6 py-2 rounded-full bg-gradient-to-br from-hover-600 to-point-600 text-white text-sm font-semibold hover:scale-105 transition-transform"
              >
                마이페이지로 이동
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastDock
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </div>
  )
}

export default MemoryPage
