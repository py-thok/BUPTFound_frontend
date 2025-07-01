<script setup lang="ts">
import { onMounted, ref, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { List, User, Plus, MapPin, Calendar, Phone, Search, Sun, Moon, Eye, MessageSquare, Clock } from 'lucide-vue-next'
import { isLoggedIn, currentUser, items, initializeAuth, logout, type Item } from '@/stores/user'
import { useTheme } from '@/composables/useTheme'
import AppNavbar from '@/components/AppNavbar.vue'
import SearchBox from '@/components/SearchBox.vue'
import UserAvatar from '@/components/UserAvatar.vue'

const router = useRouter()
const searchKeyword = ref('')
const showNavbar = ref(false)
const showScrollHint = ref(true)
const { isDark, toggleTheme } = useTheme()

// 状态管理
const displayedItems = ref<Item[]>([])

onMounted(() => {
  initializeAuth()
  displayedItems.value = items.value
  
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

const handleSearch = (params: { keyword: string; category: 'all' | 'found' | 'lost'; dateFilter?: string; dateRange?: any }) => {
  if (params.keyword) {
    router.push(`/search?q=${encodeURIComponent(params.keyword)}`)
  } else {
    router.push('/search')
  }
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    handleSearch({ keyword: searchKeyword.value, category: 'all', dateRange: null })
  }
}

const scrollToResults = () => {
  const resultsSection = document.getElementById('results-section')
  if (resultsSection) {
    resultsSection.scrollIntoView({ behavior: 'smooth' })
  }
}

// 查看详情
const viewDetail = (item: Item) => {
  router.push(`/post/${item.id}`)
}

// 跳转到用户页面
const goToUserPage = (userId: number | undefined) => {
  if (!userId) return
  
  // 统一使用 /user?id= 格式
  router.push(`/user?id=${userId}`)
}

// 处理私信
const sendMessage = (item: any) => {
  if (!isLoggedIn.value) {
    router.push('/login')
    return
  }
  
  router.push(`/message?userId=${item.userId}&userName=${item.userName}&userAvatar=${encodeURIComponent(item.userAvatar || '')}&itemId=${item.id}&itemName=${encodeURIComponent(item.title)}`)
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

    <!-- 失物招领列表区域 -->
    <section id="results-section" class="min-h-screen py-16">
      <div class="container mx-auto px-4">
        <div class="text-center mb-12">
          <h2 class="text-4xl font-bold text-gray-900 mb-4">失物招领列表</h2>
          <p class="text-xl text-gray-600">帮助物品找到它们的主人</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card 
            v-for="item in items" 
            :key="item.id"
            @click="viewDetail(item)"
            class="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer"
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
                      {{ item.location }}
                    </div>
                  </div>
                </div>
              </div>

              <Button class="w-full mt-4" size="sm" @click.stop="sendMessage(item)">
                <MessageSquare :size="14" class="mr-2" />
                私信
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>

    <!-- 页脚 -->
    <footer class="bg-white/80 backdrop-blur-md border-t border-gray-200 py-8">
      <div class="container mx-auto px-4 text-center text-gray-600">
        <p>© 2024 失物招领平台 - 让每一件物品都能回家 ❤️</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* 确保滚动平滑 */
html {
  scroll-behavior: smooth;
}

/* 文本截断样式 */
.line-clamp-1 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-height: 1.4;
}

/* 自定义滚动提示动画 */
.animate-bounce {
  animation: bounce 2s infinite;
}

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