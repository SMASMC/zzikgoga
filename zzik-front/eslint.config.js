import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

// 주석 검사를 위한 간단한 사용자 정의 ESLint 규칙 (항상 한글 포함을 강제)
const koreanCommentsPlugin = {
  rules: {
    'korean-only': {
      meta: {
        type: 'problem',
        docs: { description: '모든 주석은 한글을 포함해야 합니다.' },
        schema: [],
        messages: {
          nonKorean: '주석은 한글로 작성해주세요. (이모지 사용 가능, 인코딩은 UTF-8 권장)'
        }
      },
      create(context) {
        const source = context.getSourceCode()
        // 한글(자모+완성형) 포함 여부 판별 정규식
        const hasHangul = (text) => /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/.test(text)
        return {
          Program() {
            const comments = source.getAllComments()
            for (const c of comments) {
              const text = (c.value || '').trim()
              if (!text) continue
              // 영문 알파벳이 포함되거나, 의미 있는 텍스트로 보이면 한글 포함을 요구
              const hasLatin = /[A-Za-z]/.test(text)
              const looksTextual = /[\p{L}\p{N}]/u.test(text)
              if ((hasLatin || looksTextual) && !hasHangul(text)) {
                context.report({ loc: c.loc, messageId: 'nonKorean' })
              }
            }
          }
        }
      }
    }
  }
}

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      // 사용자 정의 플러그인 등록 (한글 주석 강제)
      'korean-comments': koreanCommentsPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // 모든 주석에 한글 포함을 강제합니다.
      'korean-comments/korean-only': 'error',
    },
  }
)
