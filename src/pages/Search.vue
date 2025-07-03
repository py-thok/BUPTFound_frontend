<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { 
  Search as SearchIcon, 
  Calendar as CalendarIcon,
  MapPin, 
  Loader2,
  Eye
} from 'lucide-vue-next'
import { searchItems, type Item } from '@/stores/items'
import AppNavbar from '@/components/AppNavbar.vue'
import SearchBox from '@/components/SearchBox.vue'
import UserAvatar from '@/components/UserAvatar.vue'

const route = useRoute()
const router = useRouter()

// 搜索状态
const searchInput = ref<HTMLInputElement>()
const keyword = ref('')
const searching = ref(false)
const showClear = ref(false)
const inputFixed = ref(false)
const category = ref<'all' | 'found' | 'lost'>('all')
const dateFilter = ref('')
const showFilters = ref(false)
const showedTip = ref(false)

// 搜索结果
const searchResults = ref<Item[]>([])
const isLoading = ref(false)
const errorMessage = ref('')

// 简单的中文分词函数
const chineseSegment = (text: string): string[] => {
  const segments: string[] = []
  let current = ''
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (/[\u4e00-\u9fa5]/.test(char)) {
      // 中文字符
      if (current && !/[\u4e00-\u9fa5]/.test(current[current.length - 1])) {
        segments.push(current.trim())
        current = char
      } else {
        current += char
      }
    } else if (/[a-zA-Z0-9]/.test(char)) {
      // 英文数字
      current += char
    } else if (/\s/.test(char)) {
      // 空格
      if (current.trim()) {
        segments.push(current.trim())
        current = ''
      }
    } else {
      // 其他字符
      if (current.trim()) {
        segments.push(current.trim())
        current = ''
      }
    }
  }
  
  if (current.trim()) {
    segments.push(current.trim())
  }
  
  return segments.filter(s => s.length > 0)
}

// 高亮关键词函数
const highlightKeywords = (text: string): string => {
  if (!keyword.value.trim()) return text
  
  const keywords = chineseSegment(keyword.value.trim())
  let result = text
  
  keywords.forEach(word => {
    if (word.length > 0) {
      const regex = new RegExp(`(${word})`, 'gi')
      result = result.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>')
    }
  })
  
  return result
}

// 过滤后的物品列表（API搜索结果已经包含了所有过滤条件）
const filteredItems = computed(() => {
  // API搜索已经处理了所有筛选条件，直接返回搜索结果
  return searchResults.value
})

// 搜索统计
const searchStats = computed(() => {
  const total = filteredItems.value.length
  const found = filteredItems.value.filter(item => item.type === 'found').length
  const lost = filteredItems.value.filter(item => item.type === 'lost').length
  
  return { total, found, lost }
})

// API搜索函数
const performSearch = async (searchParams: {
  keyword?: string
  category?: 'all' | 'found' | 'lost'
  startDate?: string
  endDate?: string
  location?: { lat: number; lng: number }
}) => {
  console.log('🔍 执行API搜索:', searchParams)
  
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    // 构建API搜索参数
    const apiParams: {
      keyword?: string
      type?: 'FOUND' | 'LOST'
      startDate?: string
      endDate?: string
      location?: string
    } = {}
    
    if (searchParams.keyword && searchParams.keyword.trim()) {
      apiParams.keyword = searchParams.keyword.trim()
    }
    
    if (searchParams.category && searchParams.category !== 'all') {
      apiParams.type = searchParams.category.toUpperCase() as 'FOUND' | 'LOST'
    }
    
    if (searchParams.startDate && searchParams.endDate) {
      // 处理日期格式：将 YYYY-MM-DD 转换为完整的时间戳格式
      // 起始时间：开始日期的 00:00:00
      const startDateTime = `${searchParams.startDate}T00:00:00`
      apiParams.startDate = startDateTime
      
      // 结束时间：结束日期的 23:59:59
      const endDateTime = `${searchParams.endDate}T23:59:59`
      apiParams.endDate = endDateTime
    }
    
    // 添加位置参数 - 转换为字符串格式
    if (searchParams.location) {
      apiParams.location = `${searchParams.location.lat}, ${searchParams.location.lng}`
      console.log('📍 搜索包含位置参数:', apiParams.location)
    }
    
    // 构建查询参数字符串
    const queryParams = new URLSearchParams()
    Object.entries(apiParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.set(key, value.toString())
      }
    })
    
    const fullApiUrl = `/items/search${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    
    console.log('🌐 完整的API请求URL:', fullApiUrl)
    console.log('📋 API搜索参数详情:', apiParams)
    
    const result = await searchItems(apiParams)
    console.log('📊 搜索API结果:', result)
    
    if (result.success && result.data) {
      // 直接使用API返回的data，不进行重复转换
      searchResults.value = result.data
      console.log('搜索结果:', result.data)
    } else {
      searchResults.value = []
      errorMessage.value = result.message || '搜索失败'
      
      // 检查是否为401错误，如果是则重定向到登录页
      if (result.message && (result.message.includes('Missing token') || result.message.includes('401'))) {
        console.log('检测到401错误，重定向到登录页面')
        // 使用更可靠的重定向方式
        setTimeout(() => {
          router.replace('/login').catch(() => {
            // 如果路由跳转失败，使用原生跳转
            window.location.href = '/login'
          })
        }, 100)
        return
      }
    }
  } catch (error) {
    console.error('搜索异常:', error)
    searchResults.value = []
    errorMessage.value = '网络错误，请稍后重试'
  } finally {
    isLoading.value = false
  }
}

// 处理搜索
const handleSearch = (searchKeyword: string, searchCategory: string, searchDate: string | any, location?: { lat: number, lng: number } | null) => {
  console.log('🔍 SearchBox传入的原始搜索参数:', {
    keyword: searchKeyword,
    category: searchCategory, 
    date: searchDate,
    location: location
  })
  
  keyword.value = searchKeyword
  category.value = searchCategory as 'all' | 'found' | 'lost'
  
  // 正确处理日期参数
  let startDate = ''
  let endDate = ''
  
  if (searchDate) {
    if (typeof searchDate === 'string') {
      // 如果是字符串，直接使用
      startDate = searchDate
      endDate = searchDate
      dateFilter.value = searchDate
    } else if (typeof searchDate === 'object' && searchDate.start && searchDate.end) {
      // 如果是日期范围对象，提取start和end
      console.log('📅 处理日期范围对象:', searchDate)
      
      // 处理复杂的日期对象结构
      if (searchDate.start.year && searchDate.start.month && searchDate.start.day) {
        startDate = `${searchDate.start.year}-${String(searchDate.start.month).padStart(2, '0')}-${String(searchDate.start.day).padStart(2, '0')}`
      } else if (searchDate.start.toString) {
        startDate = searchDate.start.toString().split('T')[0]
      }
      
      if (searchDate.end.year && searchDate.end.month && searchDate.end.day) {
        endDate = `${searchDate.end.year}-${String(searchDate.end.month).padStart(2, '0')}-${String(searchDate.end.day).padStart(2, '0')}`
      } else if (searchDate.end.toString) {
        endDate = searchDate.end.toString().split('T')[0]
      }
      
      dateFilter.value = `${startDate} 至 ${endDate}`
      console.log('📅 解析后的日期:', { startDate, endDate })
    } else if (typeof searchDate === 'object' && searchDate.start) {
      // 如果只有start日期
      if (searchDate.start.year && searchDate.start.month && searchDate.start.day) {
        startDate = `${searchDate.start.year}-${String(searchDate.start.month).padStart(2, '0')}-${String(searchDate.start.day).padStart(2, '0')}`
      } else if (searchDate.start.toString) {
        startDate = searchDate.start.toString().split('T')[0]
      }
      endDate = startDate
      dateFilter.value = startDate
    }
  }
  
  // 如果有位置信息，将其包含在搜索中
  if (location) {
    console.log('📍 包含位置信息进行搜索:', location)
  }
  
  console.log('🚀 准备调用API，处理后的参数:', {
    keyword: searchKeyword,
    category: searchCategory,
    startDate: startDate,
    endDate: endDate,
    location: location
  })
  
  // 构建正确的参数格式调用performSearch
  performSearch({
    keyword: searchKeyword,
    category: searchCategory as 'all' | 'found' | 'lost',
    startDate: startDate,
    endDate: endDate,
    location: location || undefined
  })
}

// 清除搜索
const handleClear = () => {
  searchResults.value = []
  keyword.value = ''
  category.value = 'all'
  dateFilter.value = ''
  errorMessage.value = ''
  router.replace({ query: {} })
}

// 切换分类（重新搜索）
const switchCategory = async (newCategory: 'all' | 'found' | 'lost') => {
  category.value = newCategory
  
  // 重新执行搜索
  await performSearch({
    keyword: keyword.value,
    category: newCategory,
    startDate: dateFilter.value,
    endDate: dateFilter.value
  })
  
  const params = new URLSearchParams()
  if (keyword.value) params.set('q', keyword.value)
  if (newCategory !== 'all') params.set('c', newCategory)
  if (dateFilter.value) params.set('date', dateFilter.value)
  router.replace({ query: Object.fromEntries(params) })
}

// 跳转到帖子详情
const goToPost = (itemId: number) => {
  router.push(`/post/${itemId}`)
}

// 跳转到用户页面
const goToUserPage = (userId?: number) => {
  if (userId) {
    // console.log('跳转到用户页面:', userId)
    router.push(`/user?id=${userId}`)
  }
}

// 键盘快捷键处理
const handleKeyDown = (e: KeyboardEvent) => {
  if (document.activeElement !== document.body) return
  
  if (e.key === '/') {
    e.preventDefault()
    searchInput.value?.focus()
  } else if (e.key === 'Escape') {
    searchInput.value?.blur()
  } else {
    // 提示用户可以使用快捷键
    if (showedTip.value) return
    if (e.key.length !== 1 || e.altKey || e.ctrlKey || e.metaKey) return
    
    // console.log("按 / 键可快速跳转到搜索框")
    showedTip.value = true
  }
}

// 滚动处理
const handleScroll = () => {
  if (searchInput.value) {
    const rect = searchInput.value.getBoundingClientRect()
    inputFixed.value = rect.top <= 16
  }
}

// 处理初始化的路由参数搜索
const initializeFromRoute = async () => {
  console.log('从路由参数初始化搜索...')
  // 构建搜索参数
  await performSearch({
    keyword: keyword.value,
    category: category.value,
    startDate: dateFilter.value,
    endDate: dateFilter.value
  })
}

// 初始化
onMounted(async () => {
  // 从URL参数恢复搜索状态
  const query = route.query
  console.log('🔗 从URL参数初始化搜索:', query)
  
  if (query.q) {
    keyword.value = query.q as string
  }
  if (query.c && ['found', 'lost'].includes(query.c as string)) {
    category.value = query.c as 'found' | 'lost'
  }
  if (query.date) {
    dateFilter.value = query.date as string
  }

  // 构建搜索参数
  let startDate = ''
  let endDate = ''
  let location: { lat: number; lng: number } | undefined = undefined
  
  // 处理新的URL参数格式
  if (query.startDate && query.endDate) {
    startDate = query.startDate as string
    endDate = query.endDate as string
    dateFilter.value = `${startDate} 至 ${endDate}`
  } else if (query.date) {
    startDate = query.date as string
    endDate = query.date as string
  }
  
  // 处理位置参数
  if (query.location) {
    const locationStr = query.location as string
    const [lat, lng] = locationStr.split(',').map(s => parseFloat(s.trim()))
    if (!isNaN(lat) && !isNaN(lng)) {
      location = { lat, lng }
      console.log('📍 从URL解析位置参数:', location)
    }
  }

  // 如果有搜索参数，执行搜索
  if (keyword.value || category.value !== 'all' || startDate || location) {
    console.log('🚀 URL参数触发初始搜索:', {
      keyword: keyword.value,
      category: category.value,
      startDate,
      endDate,
      location
    })
    
    await performSearch({
      keyword: keyword.value,
      category: category.value,
      startDate: startDate,
      endDate: endDate,
      location: location
    })
  }

  // 绑定事件
  document.addEventListener('keydown', handleKeyDown)
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
    <!-- 导航栏 -->
    <AppNavbar 
      :page-title="'搜索失物招领'"
      :current-page="'search'"
      :show-back-button="true"
      :is-scroll-navbar="false"
      :show-navbar="true"
      :show-search="false"
    />

    <div class="container mx-auto px-4 py-8 space-y-6">
      <!-- 搜索框区域 -->
      <SearchBox 
        :initial-keyword="keyword"
        :initial-category="category"
        :initial-date="dateFilter"
        :stats="searchStats"
        :show-filters="true"
        :show-stats="true"
        :auto-focus="true"
        placeholder="搜索失物招领信息... (按 / 键快速搜索)"
        @search="handleSearch"
        @clear="handleClear"
      />
      
      <!-- 为固定搜索框预留空间 -->
      <div v-if="inputFixed" class="h-20"></div>
      
      <!-- 加载状态 -->
      <div v-if="isLoading" class="text-center py-12">
        <div class="text-gray-400 mb-4">
          <Loader2 :size="48" class="mx-auto animate-spin" />
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">正在搜索...</h3>
        <p class="text-gray-600 dark:text-gray-300">
          请稍候
        </p>
      </div>
      
      <!-- 错误状态 -->
      <div v-else-if="errorMessage" class="text-center py-12">
        <div class="text-gray-400 mb-4">
          <SearchIcon :size="48" class="mx-auto" />
        </div>
        <h3 class="text-lg font-medium text-red-600 dark:text-red-400 mb-2">搜索出错</h3>
        <p class="text-gray-600 dark:text-gray-300 mb-4">
          {{ errorMessage }}
        </p>
        <Button @click="handleClear" variant="outline">
          清除搜索条件
        </Button>
      </div>
      
      <!-- 搜索结果 -->
      <div v-else class="max-w-6xl mx-auto">
        <div v-if="filteredItems.length === 0 && (keyword || category !== 'all' || dateFilter)" class="text-center py-12">
          <div class="text-gray-400 mb-4">
            <SearchIcon :size="48" class="mx-auto" />
          </div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">未找到相关物品</h3>
          <p class="text-gray-600 dark:text-gray-300 mb-4">
            尝试使用其他关键词或调整筛选条件
          </p>
          <Button @click="handleClear" variant="outline">
            清除搜索条件
          </Button>
        </div>
        
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card 
            v-for="item in filteredItems" 
            :key="item.id"
            @click="goToPost(item.id)"
            class="overflow-hidden hover:shadow-lg dark:hover:shadow-gray-700/20 transition-all duration-300 hover:scale-105 cursor-pointer dark:bg-gray-800 dark:border-gray-700"
          >
            <div class="relative">
              <img 
                :src="item.image" 
                :alt="item.title"
                class="w-full h-48 object-cover"
              >
              <Badge 
                :variant="item.status === 'resolved' ? 'secondary' : (item.type === 'found' ? 'default' : 'destructive')"
                class="absolute top-3 right-3"
              >
                {{ item.status === 'resolved' ? '已找回' : (item.type === 'found' ? '拾到' : '寻找') }}
              </Badge>
            </div>
            
            <CardHeader class="pb-3">
              <div class="text-lg font-semibold dark:text-gray-100" v-html="highlightKeywords(item.title)"></div>
              <div class="text-sm text-muted-foreground dark:text-gray-400 line-clamp-1" v-html="highlightKeywords(item.description)"></div>
            </CardHeader>
            
            <CardContent class="space-y-3">
              <!-- 用户信息 -->
              <div class="flex items-center gap-2 mb-3">
                <UserAvatar 
                  :userId="item.userId"
                  :name="item.userName"
                  :avatar="item.userAvatar"
                  size="sm"
                  @click.stop="goToUserPage(item.userId)"
                />
                <div class="flex-1">
                  <div class="font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 transition-colors" @click.stop="goToUserPage(item.userId)">
                    {{ item.userName || '匿名用户' }}
                  </div>
                </div>
              </div>
              
              <div class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <div class="flex items-center gap-2">
                  <MapPin :size="14" class="text-gray-400 dark:text-gray-500" />
                  <span v-html="highlightKeywords(item.site)"></span>
                </div>
                <div class="flex items-center gap-2">
                  <CalendarIcon :size="14" class="text-gray-400 dark:text-gray-500" />
                  <span>{{ item.date }}</span>
                </div>
              </div>
              
              <Button class="w-full mt-4" size="sm" @click.stop="goToPost(item.id)">
                <Eye :size="14" class="mr-2" />
                查看详情
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 确保长文本正确截断 */
.line-clamp-1 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-height: 1.4;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 自定义滚动提示动画 */
.animate-bounce {
  animation: bounce 2s infinite;
}

/* 滚动提示动画 */
@keyframes bounce {
  0%, 20%, 53%, 80%, 100% {
    transform: translate3d(-50%, 0, 0);
  }
  40%, 43% {
    transform: translate3d(-50%, -10px, 0);
  }
  70% {
    transform: translate3d(-50%, -5px, 0);
  }
  90% {
    transform: translate3d(-50%, -2px, 0);
  }
}
</style> 