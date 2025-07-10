import { ref, onMounted, onBeforeUnmount, readonly, computed } from 'vue'

const MOBILE_BREAKPOINT = 768

/**
 * Vue Composable for detecting mobile devices
 * 检测移动设备的Vue组合式函数
 */
export function useIsMobile() {
  const isMobile = ref<boolean | undefined>(undefined)

  let mediaQueryList: MediaQueryList | null = null

  const updateIsMobile = () => {
    isMobile.value = window.innerWidth < MOBILE_BREAKPOINT
  }

  const handleChange = () => {
    updateIsMobile()
  }

  onMounted(() => {
    // 创建媒体查询
    mediaQueryList = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // 添加监听器
    mediaQueryList.addEventListener('change', handleChange)
    
    // 设置初始值
    updateIsMobile()
  })

  onBeforeUnmount(() => {
    // 清理监听器
    if (mediaQueryList) {
      mediaQueryList.removeEventListener('change', handleChange)
    }
  })

  return {
    isMobile: readonly(isMobile),
    // 提供计算属性形式的值，确保总是返回boolean
    isMobileDevice: computed(() => !!isMobile.value)
  }
}

/**
 * 扩展版本：支持自定义断点
 * Extended version with custom breakpoint support
 */
export function useResponsive(breakpoint: number = MOBILE_BREAKPOINT) {
  const isSmall = ref<boolean | undefined>(undefined)
  let mediaQueryList: MediaQueryList | null = null

  const updateIsSmall = () => {
    isSmall.value = window.innerWidth < breakpoint
  }

  const handleChange = () => {
    updateIsSmall()
  }

  onMounted(() => {
    mediaQueryList = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    mediaQueryList.addEventListener('change', handleChange)
    updateIsSmall()
  })

  onBeforeUnmount(() => {
    if (mediaQueryList) {
      mediaQueryList.removeEventListener('change', handleChange)
    }
  })

  return {
    isSmall: readonly(isSmall),
    isSmallDevice: computed(() => !!isSmall.value)
  }
}

/**
 * 多断点响应式Hook
 * Multi-breakpoint responsive hook
 */
export function useBreakpoints() {
  const windowWidth = ref(0)
  
  // 定义断点
  const breakpoints = {
    sm: 640,   // 小屏幕
    md: 768,   // 平板
    lg: 1024,  // 桌面
    xl: 1280,  // 大桌面
    '2xl': 1536 // 超大桌面
  }

  const updateWidth = () => {
    windowWidth.value = window.innerWidth
  }

  let resizeListener: (() => void) | null = null

  onMounted(() => {
    updateWidth()
    resizeListener = updateWidth
    window.addEventListener('resize', resizeListener)
  })

  onBeforeUnmount(() => {
    if (resizeListener) {
      window.removeEventListener('resize', resizeListener)
    }
  })

  return {
    windowWidth: readonly(windowWidth),
    
    // 各种断点的计算属性
    isMobile: computed(() => windowWidth.value < breakpoints.md),
    isTablet: computed(() => windowWidth.value >= breakpoints.md && windowWidth.value < breakpoints.lg),
    isDesktop: computed(() => windowWidth.value >= breakpoints.lg),
    
    // 具体断点检测
    isSmaller: (size: keyof typeof breakpoints) => computed(() => windowWidth.value < breakpoints[size]),
    isLarger: (size: keyof typeof breakpoints) => computed(() => windowWidth.value >= breakpoints[size]),
    
    // 断点范围检测
    isBetween: (min: keyof typeof breakpoints, max: keyof typeof breakpoints) => 
      computed(() => windowWidth.value >= breakpoints[min] && windowWidth.value < breakpoints[max]),
    
    breakpoints
  }
} 