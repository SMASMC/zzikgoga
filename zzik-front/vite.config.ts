import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
        manifest: {
          name: 'Zzikgoga App',
          short_name: 'Zzikgoga',
          description: 'Zzikgoga Progressive Web Application',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24, // 24 hours
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@features': path.resolve(__dirname, './src/features'),
        '@shared': path.resolve(__dirname, './src/shared'),
        '@pages': path.resolve(__dirname, './src/pages'),
        '@routes': path.resolve(__dirname, './src/routes'),
        '@assets': path.resolve(__dirname, './src/assets'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'zustand-vendor': ['zustand'],
          },
        },
      },
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api/naver-direction': {
          target: 'https://naveropenapi.apigw.gov-ntruss.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) =>
            path.replace(/^\/api\/naver-direction/, '/map-direction-15/v1/driving'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (env.VITE_NAVER_MAP_CLIENT_ID && env.VITE_NAVER_MAP_CLIENT_SECRET) {
                proxyReq.setHeader('X-NCP-APIGW-API-KEY-ID', env.VITE_NAVER_MAP_CLIENT_ID)
                proxyReq.setHeader('X-NCP-APIGW-API-KEY', env.VITE_NAVER_MAP_CLIENT_SECRET)
              } else {
                console.error('[Proxy] API 키가 없습니다!')
              }
            })
          },
        },
        '/api/naver-transit': {
          target: 'https://naveropenapi.apigw.gov-ntruss.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/naver-transit/, '/map-direction-15/v1/transit'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (env.VITE_NAVER_MAP_CLIENT_ID && env.VITE_NAVER_MAP_CLIENT_SECRET) {
                proxyReq.setHeader('X-NCP-APIGW-API-KEY-ID', env.VITE_NAVER_MAP_CLIENT_ID)
                proxyReq.setHeader('X-NCP-APIGW-API-KEY', env.VITE_NAVER_MAP_CLIENT_SECRET)
              } else {
                console.error('[Proxy] API 키가 없습니다!')
              }
            })
          },
        },
      },
    },
  }
})
