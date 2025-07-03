<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast/use-toast'
import { List, User, Plus, MapPin, Calendar, Phone, Sun, Moon, Eye, MessageSquare, Clock, ChevronLeft, ChevronRight, Sparkles } from 'lucide-vue-next'
import { isLoggedIn, currentUser, initializeAuth, logout, getConversations, type ConversationSummary } from '@/stores/user'
import { items, getAllItems, type Item, getUserSimilarItemSuggestions, type SimilarItemSuggestion, markSuggestionAsViewed } from '@/stores/items'
// import * as mockData from '@/data/mockData.json'
import { useTheme } from '@/composables/useTheme'
import AppNavbar from '@/components/AppNavbar.vue'
import SearchBox from '@/components/SearchBox.vue'
import UserAvatar from '@/components/UserAvatar.vue'

// 导入API_BASE_URL常量
const API_BASE_URL = ''

const router = useRouter()
const { toast } = useToast()
const showNavbar = ref(false)
const showScrollHint = ref(true)
const { isDark, toggleTheme } = useTheme()

// 相似物品推荐状态
const similarSuggestions = ref<SimilarItemSuggestion[]>([])
const unreadSuggestionsCount = ref(0)

// 分页相关状态
const currentPage = ref(1)
const itemsPerPage = 9
const totalItems = computed(() => items.value.length)
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage))

// 计算当前页的物品
const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return items.value.slice(start, end)
})

// 状态管理
const displayedItems = ref<Item[]>([])

// 分页处理函数
const handlePageChange = (page: number) => {
  currentPage.value = page
  
  // 滚动到结果区域
  const resultsSection = document.getElementById('results-section')
  if (resultsSection) {
    resultsSection.scrollIntoView({ behavior: 'smooth' })
  }
}

const goToFirstPage = () => handlePageChange(1)
const goToLastPage = () => handlePageChange(totalPages.value)
const goToPreviousPage = () => {
  if (currentPage.value > 1) {
    handlePageChange(currentPage.value - 1)
  }
}
const goToNextPage = () => {
  if (currentPage.value < totalPages.value) {
    handlePageChange(currentPage.value + 1)
  }
}

// 生成页码数组
const pageNumbers = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const delta = 2 // 当前页前后显示的页数
  
  const range = []
  const rangeWithDots = []
  
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
    range.push(i)
  }
  
  if (current - delta > 2) {
    rangeWithDots.push(1, '...')
  } else {
    rangeWithDots.push(1)
  }
  
  rangeWithDots.push(...range)
  
  if (current + delta < total - 1) {
    rangeWithDots.push('...', total)
  } else if (total > 1) {
    rangeWithDots.push(total)
  }
  
  return rangeWithDots
})

const loadData = async () => {
  // console.log('开始加载数据...')
  
  try {
    // 首先加载mockdata作为基础数据
    // const mockItems = (mockData as any).items || []
    // 初始化为空数组，准备接收API数据
    // items.value = [...mockItems] // 使用展开运算符复制mockdata
    items.value = []
    // console.log('初始加载mockdata:', mockItems.length, '条')
    
    // 然后获取API数据
    // console.log('开始获取API数据...')
    const result = await getAllItems()
    
    if (result.success) {
      // console.log('API数据获取成功，包含', result.data?.length || 0, '条数据')
      
      // 过滤掉与API数据重复的mockdata
      // const apiItemIds = new Set(items.value.map(item => item.id))
      // const filteredMockItems = mockItems.filter(mockItem => !apiItemIds.has(mockItem.id))
      
      // 将API数据（已在items.value中）和过滤后的mockdata合并
      // items.value = [...items.value, ...filteredMockItems]
      // console.log('API数据已更新到items.value')
      // console.log('合并后的数据: API数据 +', filteredMockItems.length, '条mockdata =', items.value.length, '条总数据')
    } else {
      // console.log('API获取失败，仅使用mockdata:', items.value.length, '条')
      // console.log('API获取失败，没有数据显示')
    }
  } catch (error) {
    // console.error('加载数据时出现异常:', error)
    // console.log('异常情况下仅使用mockdata:', items.value.length, '条')
    // console.log('异常情况下没有数据显示')
  }
}

// 加载相似物品推荐
const loadSimilarSuggestions = async () => {
  if (!isLoggedIn.value) {
    console.log('用户未登录，跳过相似物品推荐检查')
    return
  }

  try {
    console.log('🔍 开始检查相似物品推荐...')
    const result = await getUserSimilarItemSuggestions()
    
    if (result.success && result.data) {
      similarSuggestions.value = result.data
      const unreadCount = result.data.filter(suggestion => !suggestion.viewed).length
      unreadSuggestionsCount.value = unreadCount
      
      console.log(`📊 获取到 ${result.data.length} 条推荐，其中 ${unreadCount} 条未读`)
      
      // 如果有未读推荐，显示Toast通知
      if (unreadCount > 0) {
        toast({
          title: "🎯 发现相似物品推荐",
          description: `为您找到 ${unreadCount} 个可能匹配的物品，快来看看吧！`,
          action: {
            label: "查看推荐",
            onClick: () => {
              showSuggestionsModal()
            }
          },
          duration: 8000,
        })
      }
    } else {
      console.log('📊 获取相似物品推荐失败:', result.message)
    }
  } catch (error) {
    console.error('获取相似物品推荐异常:', error)
  }
}

// 显示推荐详情弹窗（简单实现，跳转到推荐物品详情页）
const showSuggestionsModal = () => {
  const unreadSuggestions = similarSuggestions.value.filter(s => !s.viewed)
  if (unreadSuggestions.length > 0) {
    // 跳转到第一个未读推荐的物品详情页
    const firstSuggestion = unreadSuggestions[0]
    goToSuggestedPost(firstSuggestion)
  }
}

// 跳转到推荐的物品详情页并标记为已读
const goToSuggestedPost = async (suggestion: SimilarItemSuggestion) => {
  try {
    // 标记为已读（后台操作，不显示在前端）
    await markSuggestionAsViewed(suggestion.id)
    console.log(`✅ 已将推荐 ${suggestion.id} 标记为已读`)
    
    // 更新本地状态
    const index = similarSuggestions.value.findIndex(s => s.id === suggestion.id)
    if (index !== -1) {
      similarSuggestions.value[index].viewed = true
      unreadSuggestionsCount.value = similarSuggestions.value.filter(s => !s.viewed).length
    }
  } catch (error) {
    console.error('标记推荐已读失败:', error)
  }
  
  // 跳转到推荐的物品详情页
  router.push(`/post/${suggestion.suggestedItemId}`)
}

onMounted(async () => {
  initializeAuth()
  
  // console.log('=== 主页初始化 ===')
  
  await loadData()
  
  // 如果用户已登录，加载相似物品推荐
  if (isLoggedIn.value) {
    await loadSimilarSuggestions()
  }
  
  // 初始化显示数据
  displayedItems.value = paginatedItems.value
  // console.log('最终显示的物品数量:', displayedItems.value.length)
  // console.log('总物品数量:', items.value.length)
  
  // 监听滚动事件
  const handleScroll = () => {
    const scrollY = window.scrollY
    
    // 当滚动超过视窗高度的80%时显示导航栏
    showNavbar.value = scrollY > window.innerHeight * 0.8
    
    // 当开始滚动时隐藏滚动提示
    showScrollHint.value = scrollY < 50
  }
  
  window.addEventListener('scroll', handleScroll)
  
  // 组件卸载时移除监听器
  return () => {
    window.removeEventListener('scroll', handleScroll)
  }
})

// 监听分页变化，更新显示的物品
computed(() => {
  displayedItems.value = paginatedItems.value
})

const handleLogin = () => {
  router.push('/login')
}

const handleUserProfile = () => {
  router.push('/user')
}

const handleAddItem = () => {
  router.push('/add')
}

const handleLogout = () => {
  logout()
  router.push('/')
}

const handleSearch = (keyword: string, category: string, dateFilter: string | any, location?: { lat: number, lng: number } | null) => {
  console.log('🏠 主页SearchBox搜索参数:', {
    keyword,
    category,
    dateFilter,
    location
  })
  
  // 构建查询参数
  const params = new URLSearchParams()
  
  if (keyword && keyword.trim()) {
    params.set('q', keyword.trim())
  }
  
  if (category && category !== 'all') {
    params.set('c', category)
  }
  
  // 处理日期参数
  if (dateFilter) {
    if (typeof dateFilter === 'string') {
      params.set('date', dateFilter)
    } else if (typeof dateFilter === 'object' && dateFilter.start && dateFilter.end) {
      // 处理复杂的日期对象结构
      let startDate = ''
      let endDate = ''
      
      if (dateFilter.start.year && dateFilter.start.month && dateFilter.start.day) {
        startDate = `${dateFilter.start.year}-${String(dateFilter.start.month).padStart(2, '0')}-${String(dateFilter.start.day).padStart(2, '0')}`
      }
      
      if (dateFilter.end.year && dateFilter.end.month && dateFilter.end.day) {
        endDate = `${dateFilter.end.year}-${String(dateFilter.end.month).padStart(2, '0')}-${String(dateFilter.end.day).padStart(2, '0')}`
      }
      
      if (startDate && endDate) {
        params.set('startDate', startDate)
        params.set('endDate', endDate)
      }
    }
  }
  
  // 处理位置参数
  if (location) {
    params.set('location', `${location.lat},${location.lng}`)
  }
  
  const queryString = params.toString()
  const searchUrl = queryString ? `/search?${queryString}` : '/search'
  
  console.log('🏠 主页跳转到搜索页面:', searchUrl)
  router.push(searchUrl)
}

const scrollToResults = () => {
  const resultsSection = document.getElementById('results-section')
  if (resultsSection) {
    resultsSection.scrollIntoView({ behavior: 'smooth' })
  }
}

// 查看详情
const viewDetail = async (item: Item) => {
  // 检查是否有与此物品相关的未读推荐，如果有则标记为已读
  const relatedSuggestions = similarSuggestions.value.filter(
    suggestion => suggestion.suggestedItemId === item.id && !suggestion.viewed
  )
  
  // 异步标记相关推荐为已读（后台操作，不影响用户体验）
  if (relatedSuggestions.length > 0) {
    console.log(`🔍 发现 ${relatedSuggestions.length} 个与物品 ${item.id} 相关的未读推荐，开始标记为已读`)
    
    relatedSuggestions.forEach(async (suggestion) => {
      try {
        await markSuggestionAsViewed(suggestion.id)
        console.log(`✅ 已将推荐 ${suggestion.id} 标记为已读`)
        
        // 更新本地状态
        const index = similarSuggestions.value.findIndex(s => s.id === suggestion.id)
        if (index !== -1) {
          similarSuggestions.value[index].viewed = true
        }
      } catch (error) {
        console.error(`标记推荐 ${suggestion.id} 已读失败:`, error)
      }
    })
    
    // 更新未读计数
    unreadSuggestionsCount.value = similarSuggestions.value.filter(s => !s.viewed).length
  }
  
  // 跳转到物品详情页
  router.push(`/post/${item.id}`)
}

// 跳转到用户页面
const goToUserPage = (userId: number | undefined) => {
  if (!userId) {
    // console.log('userId 为空，无法跳转')
    return
  }
  
  // console.log('跳转到用户页面，userId:', userId)
  // console.log('当前登录用户ID:', currentUser.value?.id)
  
  // 统一使用 /user?id= 格式
  router.push(`/user?id=${userId}`)
}

// 处理私信
const sendMessage = async (item: any) => {
  if (!isLoggedIn.value) {
    router.push('/login')
    return
  }
  
  try {
    // console.log('开始私信处理，检查已有对话...', {
    //   targetUserId: userId,
    //   currentUserId: currentUser.value?.id
    // })
    
    // 首先获取用户的所有对话列表
    const conversationsResult = await getConversations()
    
    if (conversationsResult.success && conversationsResult.data) {
      // 查找是否已存在与该用户和物品的对话
      const existingConversation = conversationsResult.data.find(
        (conversation: ConversationSummary) => 
          conversation.otherUserId === item.userId && 
          conversation.itemId === item.id
      )
      
      if (existingConversation) {
        // console.log('找到已存在的对话，直接跳转:', existingConversation)
        
        // 跳转到已有对话
        router.push({
          path: '/message',
          query: {
            conversationId: existingConversation.id,
            userId: existingConversation.otherUserId,
            userName: existingConversation.otherUsername,
            itemId: existingConversation.itemId,
            itemName: existingConversation.itemName
          }
        })
        return
      } else {
        // console.log('未找到已存在的对话，创建新对话')
      }
    } else {
      // console.log('获取对话列表失败，继续创建新对话:', conversationsResult.message)
    }
  } catch (error) {
    console.error('检查已有对话时异常:', error)
  }
  
  // 如果没有找到已存在的对话，或者检查失败，则创建新对话
  // console.log('跳转到新建消息页面')
  router.push(`/message?userId=${item.userId}&userName=${item.userName}&itemId=${item.id}&itemName=${encodeURIComponent(item.title)}`)
}

// 格式化时间
const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  
  return date.toLocaleDateString('zh-CN')
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <!-- 导航栏 - 仅在滚动时显示 -->
    <AppNavbar 
      :page-title="'BUPTFound'"
      :current-page="'home'"
      :show-back-button="false"
      :is-scroll-navbar="true"
      :show-navbar="showNavbar"
    />

    <!-- 顶部搜索区域 - 类似Google/百度 -->
    <section class="h-screen flex flex-col items-center justify-center px-4 relative">
      <!-- 浮动主题切换按钮 - 固定在视窗右上角 -->
      <div 
        :class="[
          'fixed top-8 right-8 z-50 transition-all duration-300',
          showNavbar ? 'opacity-0 pointer-events-none' : 'opacity-100'
        ]"
      >
        <Button
          @click="toggleTheme"
          variant="outline"
          size="sm"
          class="shadow-lg backdrop-blur-sm"
        >
          <Sun v-if="isDark" :size="18" class="mr-1" />
          <Moon v-else :size="18" class="mr-1" />
        </Button>
      </div>
      
      <div class="text-center max-w-4xl mx-auto w-full">
        <!-- Logo/标题 -->
        <h1 class="text-6xl font-bold text-gray-900 mb-4">
          BUPT<span class="text-blue-600">Found</span>
        </h1>
        <p class="text-xl text-gray-600 mb-12">
          北京邮电大学失物招领平台
        </p>
        
        <!-- 搜索框 -->
        <SearchBox 
          size="large"
          placeholder="搜索失物招领信息..."
          :show-filters="true"
          class="mb-8"
          @search="handleSearch"
        />
        
        <!-- 未读推荐提示（可选显示） -->
        <div v-if="isLoggedIn && unreadSuggestionsCount > 0" class="mb-6">
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-sm">
            <Sparkles :size="16" />
            <span>为您找到 {{ unreadSuggestionsCount }} 个您寻找的相似物品</span>
            <Button @click="showSuggestionsModal" variant="ghost" size="sm" class="text-blue-600 hover:text-blue-800">
              查看
            </Button>
          </div>
        </div>
        
        <!-- 主要按钮 -->
        <div class="flex gap-4 justify-center mb-12">
          <!-- 未登录状态 -->
          <template v-if="!isLoggedIn">
            <Button 
              @click="handleLogin"
              variant="outline"
              size="lg"
              class="px-8 py-3 rounded-full"
            >
              <User :size="18" class="mr-2" />
              登录注册
            </Button>
          </template>
          
          <!-- 已登录状态 -->
          <template v-if="isLoggedIn">
            <Button 
              @click="handleAddItem"
              variant="outline"
              size="lg"
              class="px-8 py-3 rounded-full"
            >
              <Plus :size="18" class="mr-2" />
              发布信息
            </Button>
          </template>
          
          <Button 
            @click="scrollToResults"
            variant="default"
            size="lg"
            class="px-8 py-3 rounded-full"
          >
            <List :size="18" class="mr-2" />
            浏览全部
          </Button>
        </div>
      </div>
      
      <!-- 向下滚动提示 - 固定在视窗底部 -->
      <div 
        :class="[
          'fixed bottom-8 left-1/2 transform -translate-x-1/2 text-gray-500 animate-bounce z-40 transition-all duration-300',
          showScrollHint ? 'opacity-100' : 'opacity-0 pointer-events-none'
        ]"
      >
        
        <div class="w-6 h-10 border-2 border-gray-300 dark:border-gray-600 rounded-full mx-auto">
          <div class="w-1 h-3 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mt-2"></div>
        </div>
      </div>
    </section>

    <!-- 最新信息展示区域 -->
    <section id="results-section" class="py-16 px-4">
      <div class="container mx-auto max-w-6xl">
        <!-- 标题和统计 -->
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-gray-900 mb-4">最新失物招领信息</h2>
          
          <p class="text-gray-600 mt-4">
            共 {{ totalItems }} 条信息，第 {{ currentPage }} / {{ totalPages }} 页
          </p>
        </div>

        <!-- 物品卡片列表 -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card 
            v-for="item in paginatedItems" 
            :key="item.id" 
            class="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer"
            @click="viewDetail(item)"
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
              <CardTitle class="text-lg">{{ item.title }}</CardTitle>
              <CardDescription class="text-sm line-clamp-1">
                {{ item.description }}
              </CardDescription>
            </CardHeader>
            
            <CardContent class="space-y-3">
              <!-- 用户信息 -->
              <div class="flex items-center gap-2 mb-3">
                <UserAvatar 
                  :userId="item.userId"
                  :name="item.userName"
                  :avatar="item.userAvatar"
                  size="sm"
                />
                <div class="flex-1">
                  <div class="font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors" @click.stop="goToUserPage(item.userId)">
                    {{ item.userName || '匿名用户' }}
                  </div>
                  <div class="flex items-center gap-4 text-sm text-gray-500">
                    <div class="flex items-center gap-1">
                      <Calendar :size="14" />
                      {{ formatTime(item.createdAt || item.date) }}
                    </div>
                    <div class="flex items-center gap-1">
                      <MapPin :size="14" />
                      {{ item.site }}
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                class="w-full mt-4" 
                size="sm" 
                @click.stop="sendMessage(item)"
                :disabled="currentUser?.id === item.userId"
              >
                <MessageSquare :size="14" class="mr-2" />
                {{ currentUser?.id === item.userId ? '私信' : '私信' }}
              </Button>
            </CardContent>
          </Card>
        </div>

        <!-- 自定义分页组件 -->
        <div v-if="totalPages > 1" class="flex justify-center">
          <div class="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <!-- 首页按钮 -->
            <Button
              @click="goToFirstPage"
              :disabled="currentPage === 1"
              variant="outline"
              size="sm"
              class="px-3 py-2"
            >
              <ChevronLeft :size="16" />
              <ChevronLeft :size="16" class="-ml-1" />
            </Button>
            
            <!-- 上一页按钮 -->
            <Button
              @click="goToPreviousPage"
              :disabled="currentPage === 1"
              variant="outline"
              size="sm"
              class="px-3 py-2"
            >
              <ChevronLeft :size="16" class="mr-1" />
              上一页
            </Button>
            
            <!-- 页码按钮 -->
            <template v-for="page in pageNumbers" :key="page">
              <Button
                v-if="typeof page === 'number'"
                @click="handlePageChange(page)"
                :variant="page === currentPage ? 'default' : 'outline'"
                size="sm"
                class="px-3 py-2 min-w-[40px]"
              >
                {{ page }}
              </Button>
              <span v-else class="px-2 text-gray-500 dark:text-gray-400">{{ page }}</span>
            </template>
            
            <!-- 下一页按钮 -->
            <Button
              @click="goToNextPage"
              :disabled="currentPage === totalPages"
              variant="outline"
              size="sm"
              class="px-3 py-2"
            >
              下一页
              <ChevronRight :size="16" class="ml-1" />
            </Button>
            
            <!-- 末页按钮 -->
            <Button
              @click="goToLastPage"
              :disabled="currentPage === totalPages"
              variant="outline"
              size="sm"
              class="px-3 py-2"
            >
              <ChevronRight :size="16" class="-mr-1" />
              <ChevronRight :size="16" />
            </Button>
          </div>
        </div>
        
        <!-- 分页信息 -->
        <div class="text-center mt-6 text-sm text-gray-600 dark:text-gray-400">
          显示第 {{ (currentPage - 1) * itemsPerPage + 1 }} - {{ Math.min(currentPage * itemsPerPage, totalItems) }} 条，共 {{ totalItems }} 条记录
        </div>
      </div>
    </section>
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