/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_GOOGLE_MAP_KEY: string
  readonly VITE_KAKAO_BACK_URL: string
  readonly VITE_KAKAO_REST_API_KEY: string
  readonly VITE_KAKAO_REDIRECT_URI: string
  readonly VITE_CRDT_URL: string
  // NAVER_MAP_CLIENT_ID, NAVER_MAP_CLIENT_SECRET은 CRDT 서버에서 처리
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
