/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_GOOGLE_MAP_KEY: string
  readonly VITE_KAKAO_BACK_URL: string
  readonly VITE_KAKAO_REST_API_KEY: string
  readonly VITE_KAKAO_REDIRECT_URI: string
  readonly VITE_CRDT_URL: string
  readonly VITE_NAVER_MAP_CLIENT_ID?: string
  readonly VITE_NAVER_MAP_CLIENT_SECRET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
