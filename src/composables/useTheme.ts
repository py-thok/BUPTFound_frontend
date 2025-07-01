import { ref, onMounted, watch } from 'vue'

// 全局主题状态
const isDark = ref(false)

// 初始化主题
const initTheme = () => {
  const savedTheme = localStorage.getItem('theme')
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  
  if (savedTheme) {
    isDark.value = savedTheme === 'dark'
  } else {
    isDark.value = systemPrefersDark
  }
  
  updateTheme()
}

// 更新主题
const updateTheme = () => {
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

// 切换主题
const toggleTheme = () => {
  isDark.value = !isDark.value
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  updateTheme()
}

// 监听系统主题变化
const watchSystemTheme = () => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      isDark.value = e.matches
      updateTheme()
    }
  })
}

// 全局初始化（只执行一次）
let isInitialized = false
const globalInit = () => {
  if (!isInitialized) {
    initTheme()
    watchSystemTheme()
    // 监听主题变化
    watch(isDark, updateTheme)
    isInitialized = true
  }
}

export function useTheme() {
  onMounted(() => {
    globalInit()
  })

  return {
    isDark,
    toggleTheme
  }
} 