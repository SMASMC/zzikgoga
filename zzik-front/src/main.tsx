import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

// PWA Service Worker 등록
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('새로운 버전이 있습니다. 업데이트하시겠습니까?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('오프라인 모드가 준비되었습니다.')
  },
})

createRoot(document.getElementById('root')!).render(<App />)
