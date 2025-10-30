/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_GOOGLE_MAP_KEY: string
  readonly VITE_KAKAO_BACK_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
