import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// API 基础地址
const API_BASE_URL = 'http://127.0.0.1:8080'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    proxy: {
      '/auth': {
        target: API_BASE_URL,
        changeOrigin: true,
        secure: false
      },
      '/upload': {
        target: API_BASE_URL,
        changeOrigin: true,
        secure: false
      },
      '/profile': {
        target: API_BASE_URL,
        changeOrigin: true,
        secure: false
      },
      '/api': {
        target: API_BASE_URL,
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: API_BASE_URL,
        changeOrigin: true,
        secure: false
      }
    }
  }
})
