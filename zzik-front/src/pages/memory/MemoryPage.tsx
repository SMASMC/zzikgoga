import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { HelpCircle } from 'lucide-react'
import Input from '@/components/atoms/Input'
import SolidButton from '@/components/atoms/SolidButton'
import CloseButton from '@/components/atoms/CloseButton'
import MarkdownEditor from '@/features/memory/components/MarkdownEditor'
import MemoryPhotoGallery from '@/features/memory/components/MemoryPhotoGallery'
import { CreateMemoryRequest, MemoryBlock } from '@/features/memory/types/memory'
import { MemoryService } from '@/features/memory/services/memoryService'

const MemoryPage = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const safeTripId = useMemo(() => tripId ?? '', [tripId])

  const [title, setTitle] = useState('')
  const [markdown, setMarkdown] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<number | null>(null)
  const [showHelpModal, setShowHelpModal] = useState(false)

  const canSave = title.trim().length > 0 && markdown.trim().length > 0 && !!safeTripId

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

  // 최초 진입 시 기존 기록 조회
  useEffect(() => {
    if (!safeTripId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await MemoryService.getMemory(safeTripId)
        if (cancelled || !res) return
        setTitle(res.title ?? '')
        const blocks = res.content?.blocks
        if (Array.isArray(blocks) && blocks.length > 0) {
          setMarkdown(blocksToMarkdown(blocks))
        } else {
          setMarkdown('')
        }
      } catch {
        // 기록이 없거나 에러인 경우: 빈 에디터 유지
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleGeneratePdf = async () => {
    if (!safeTripId) return
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to generate pdf')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div>
      <main className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 mt-6 sm:mt-8 md:mt-10 pb-10">
        {/* 반응형 레이아웃: 모바일에서는 세로, 데스크톱에서는 가로 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 사진 갤러리 - 1/3 너비 (모바일에서는 전체 너비) */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-lg overflow-hidden flex flex-col h-full min-h-[400px] lg:min-h-[calc(100vh-200px)]">
              <h2 className="text-xl font-bold text-text-500 mb-6 font-bmjua mt-6 mx-6">
                사진 목록
              </h2>
              {safeTripId && <MemoryPhotoGallery tripId={safeTripId} />}
            </div>
          </aside>

          {/* 에디터 영역 - 2/3 너비 (모바일에서는 전체 너비) */}
          <section className="lg:col-span-2 flex flex-col min-h-0">
            <div className="bg-white rounded-3xl shadow-lg p-6 flex flex-col h-full min-h-[400px] lg:min-h-[calc(100vh-200px)] relative">
              <div className="flex items-center gap-2 mb-6">
                <h2 className="text-xl font-bold text-text-500 font-bmjua">기록하기</h2>
                <button
                  onClick={() => setShowHelpModal(true)}
                  className="text-blue-500 hover:text-blue-600 transition-colors"
                  aria-label="마크다운 사용법 도움말"
                >
                  <HelpCircle size={20} />
                </button>
              </div>
              {/* 헤더 영역 */}
              <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 shrink-0 relative z-10">
                <div className="flex-1 relative z-10">
                  <Input
                    placeholder="제목을 입력하세요"
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
                    disabled={!safeTripId || pdfLoading}
                    className="flex-1 sm:flex-none"
                  >
                    {pdfLoading ? 'PDF 생성 중...' : 'PDF 생성'}
                  </SolidButton>
                </div>
              </div>

              {/* 메시지 영역 */}
              {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
              {savedId && (
                <div className="text-green-700 text-sm mb-2">저장 완료 (ID: {savedId})</div>
              )}

              {/* 에디터 영역 */}
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
            {/* 닫기 버튼 */}
            <CloseButton
              onClick={() => setShowHelpModal(false)}
              className="absolute top-3 right-4"
            />

            {/* 제목 */}
            <h2 className="text-xl sm:text-2xl font-bold text-text-500 mb-6 font-bmjua">
              마크다운 사용법
            </h2>

            {/* 내용 */}
            <div className="space-y-6 text-sm">
              {/* 제목 */}
              <div>
                <h3 className="text-lg font-bold text-text-500 mb-2">제목</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div>
                    <code className="text-blue-600"># 제목 1</code>
                    <div className="text-gray-600 mt-1">→ 가장 큰 제목</div>
                  </div>
                  <div>
                    <code className="text-blue-600">## 제목 2</code>
                    <div className="text-gray-600 mt-1">→ 중간 제목</div>
                  </div>
                  <div>
                    <code className="text-blue-600">### 제목 3</code>
                    <div className="text-gray-600 mt-1">→ 작은 제목</div>
                  </div>
                </div>
              </div>

              {/* 이미지 */}
              <div>
                <h3 className="text-lg font-bold text-text-500 mb-2">이미지</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div>
                    <code className="text-blue-600">![이미지 설명](이미지URL)</code>
                    <div className="text-gray-600 mt-1">→ 이미지 삽입</div>
                  </div>
                  <div className="text-gray-600 text-xs mt-2">
                    💡 팁: 왼쪽 사진 갤러리에서 사진을 드래그하여 에디터에 넣을 수 있습니다!
                  </div>
                </div>
              </div>

              {/* 텍스트 스타일 */}
              <div>
                <h3 className="text-lg font-bold text-text-500 mb-2">텍스트 스타일</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div>
                    <code className="text-blue-600">**굵게**</code>
                    <div className="text-gray-600 mt-1">
                      → <strong>굵게</strong>
                    </div>
                  </div>
                  <div>
                    <code className="text-blue-600">*기울임*</code>
                    <div className="text-gray-600 mt-1">
                      → <em>기울임</em>
                    </div>
                  </div>
                </div>
              </div>

              {/* 리스트 */}
              <div>
                <h3 className="text-lg font-bold text-text-500 mb-2">리스트</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div>
                    <code className="text-blue-600">- 항목 1</code>
                    <br />
                    <code className="text-blue-600">- 항목 2</code>
                    <div className="text-gray-600 mt-1">→ 순서 없는 리스트</div>
                  </div>
                  <div className="mt-2">
                    <code className="text-blue-600">1. 항목 1</code>
                    <br />
                    <code className="text-blue-600">2. 항목 2</code>
                    <div className="text-gray-600 mt-1">→ 순서 있는 리스트</div>
                  </div>
                </div>
              </div>

              {/* 링크 */}
              <div>
                <h3 className="text-lg font-bold text-text-500 mb-2">링크</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <code className="text-blue-600">[링크 텍스트](URL)</code>
                  <div className="text-gray-600 mt-1">→ 클릭 가능한 링크</div>
                </div>
              </div>
            </div>

            {/* 닫기 버튼 */}
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
    </div>
  )
}

export default MemoryPage
