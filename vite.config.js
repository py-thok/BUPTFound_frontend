import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// API 基础地址
const API_BASE_URL = ''

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
      '/uploads': {
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
      },
      '/messages': {
        target: API_BASE_URL,
        changeOrigin: true,
        secure: false
      },
      '/messages/conversation': {
        target: API_BASE_URL,
        changeOrigin: true,
        secure: false 
      },
      '/messages/conversations': {
        target: API_BASE_URL,
        changeOrigin: true,
        secure: false
      },
      '/messages/conversation/': {
        target: API_BASE_URL,
        changeOrigin: true,
        secure: false
      },
      '/items': {
        target: API_BASE_URL,
        changeOrigin: true,
        secure: false
      }
    }
  }
})
