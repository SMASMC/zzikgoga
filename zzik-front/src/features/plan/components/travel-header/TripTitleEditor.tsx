import type * as Y from 'yjs'
import YTextEditor from '../YTextEditor'
import { MAX_TITLE_LENGTH } from '../../utils/ytext'

/**
 * TripTitleEditor Component
 *
 * Displays the trip title editor with Y.Text collaborative editing support.
 * Falls back to a regular input if Y.Text is not available yet.
 */

interface TripTitleEditorProps {
  titleYText: Y.Text | null
  titleDraft: string
  onTitleChange: (value: string) => void
}

const TripTitleEditor = ({ titleYText, titleDraft, onTitleChange }: TripTitleEditorProps) => {
  return (
    <div className="min-w-0 flex-1 max-w-full md:max-w-[32rem]">
      {titleYText ? (
        <YTextEditor
          ytext={titleYText}
          placeholder="여행 제목을 입력해주세요"
          maxLength={MAX_TITLE_LENGTH}
          singleLine={true}
          variant="input"
        />
      ) : (
        <input
          type="text"
          value={titleDraft}
          onChange={(event) => onTitleChange(event.target.value)}
          maxLength={MAX_TITLE_LENGTH}
          placeholder="여행 제목을 입력해주세요"
          disabled={!titleYText}
          className="w-full rounded-full border-2 border-slate-300 bg-white px-5 py-2.5 text-lg font-semibold text-slate-900 shadow-sm transition-all placeholder:text-slate-400 hover:border-blue-300 hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-wait disabled:opacity-70"
        />
      )}
    </div>
  )
}

export default TripTitleEditor
