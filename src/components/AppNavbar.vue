<template>
  <header 
    :class="[
      'bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 transition-all duration-300',
      isScrollNavbar && showNavbar ? 'translate-y-0 opacity-100' : 
      isScrollNavbar && !showNavbar ? '-translate-y-full opacity-0' : ''
    ]"
  >
    <div class="container mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <!-- 左侧区域 -->
        <div class="flex items-center gap-4">
          <!-- 返回按钮（仅在子页面显示） -->
          <Button 
            v-if="showBackButton" 
            @click="handleBack" 
            variant="ghost" 
            size="sm" 
            class="p-0"
          >
            <ArrowLeft :size="24" />
          </Button>
          
          <!-- 标题 -->
          <h1 v-if="pageTitle === 'BUPTFound'" :class="showBackButton ? 'text-xl font-bold text-gray-900' : 'text-2xl font-bold text-gray-900'">
            BUPT<span class="text-blue-600">Found</span>
          </h1>
          <h1 v-else :class="showBackButton ? 'text-xl font-bold text-gray-900' : 'text-2xl font-bold text-gray-900'">
            {{ pageTitle }}
          </h1>
        </div>
        
        <!-- 中间搜索栏 -->
        <div class="flex-1 max-w-md mx-8" v-if="showSearch && isLoggedIn">
          <div class="relative">
            <div class="absolute left-3 top-1/2 transform -translate-y-1/2">
              <Search :size="16" class="text-gray-400" />
            </div>
            <Input
              v-model="searchQuery"
              @keydown.enter="handleSearch"
              placeholder="搜索失物招领..."
              class="pl-10 pr-4 h-9 rounded-full border-gray-200 focus:border-blue-500 transition-all w-full"
            />
          </div>
        </div>
        
        <!-- 右侧导航按钮 -->
        <nav class="flex items-center gap-2">
          <!-- 未登录状态 -->
          <div v-if="!isLoggedIn" class="flex items-center gap-2">
            <!-- 物品列表按钮 -->
            <Button
              @click="goToHome"
              :variant="currentPage === 'home' ? 'default' : 'outline'"
              size="sm"
              :class="currentPage === 'home' ? 'cursor-default' : ''"
            >
              <List :size="18" class="mr-1" />
              物品列表
            </Button>
            
            <!-- 主题切换按钮 -->
            <Button
              @click="toggleTheme"
              variant="outline"
              size="sm"
            >
              <Sun v-if="isDarkMode" :size="18" class="mr-1" />
              <Moon v-else :size="18" class="mr-1" />
            </Button>
            <Button @click="handleUserAction" variant="outline" size="sm">
              <User :size="16" class="mr-1" />
              {{ userStatusText }}
            </Button>
          </div>
          
          <!-- 已登录状态 -->
          <div v-if="isLoggedIn" class="flex items-center gap-2">
            <!-- 物品列表按钮 -->
            <Button
              @click="goToHome"
              :variant="currentPage === 'home' ? 'default' : 'outline'"
              size="sm"
              :class="currentPage === 'home' ? 'cursor-default' : ''"
            >
              <List :size="18" class="mr-1" />
              物品列表
            </Button>
            
            <!-- 消息按钮 - 带未读消息数量 -->
            <div class="relative">
              <Button
                @click="handleMessages"
                :variant="currentPage === 'messages' ? 'default' : 'outline'"
                size="sm"
                :disabled="currentPage === 'messages'"
                :class="currentPage === 'messages' ? 'cursor-default' : ''"
              >
                <MessageCircle :size="18" class="mr-1" />
                消息列表
              </Button>
              <!-- 未读消息小红点 -->
              <Badge 
                v-if="unreadCount > 0"
                variant="destructive" 
                class="absolute -top-2 -right-2 px-2 py-1 text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full"
              >
                {{ unreadCount > 99 ? '99+' : unreadCount }}
              </Badge>
            </div>
            
            <!-- 发布信息按钮 -->
            <Button
              @click="handleAddItem"
              :variant="currentPage === 'add' ? 'default' : 'outline'"
              size="sm"
              :disabled="currentPage === 'add'"
              :class="currentPage === 'add' ? 'cursor-default' : ''"
            >
              <Plus :size="18" class="mr-1" />
              发布信息
            </Button>
            
            <!-- 主题切换按钮 -->
            <Button
              @click="toggleTheme"
              variant="outline"
              size="sm"
            >
              <Sun v-if="isDarkMode" :size="18" class="mr-1" />
              <Moon v-else :size="18" class="mr-1" />
            </Button>
            
            <!-- 用户头像 -->
            <Button @click.stop="handleUserClick()" variant="ghost" class="p-1 h-auto">
              <UserAvatar 
                :userId="currentUser?.id"
                :name="currentUser?.name"
                :avatar="currentUser?.avatar"
                size="sm"
                :clickable="false"
              />
            </Button>
            
            <!-- 退出按钮 -->
            <Button @click="handleLogout" variant="outline" size="sm">
              <LogOut :size="16" class="mr-1" />
              退出
            </Button>
          </div>
        </nav>
      </div>
    </div>
  </header>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Search, ArrowLeft, Sun, Moon, LogOut, User, List, MessageCircle, Plus } from 'lucide-vue-next'
import { useToast } from '@/components/ui/toast/use-toast'
import { isLoggedIn, currentUser, logout, getUnreadMessageCount } from '@/stores/user'
import UserAvatar from '@/components/UserAvatar.vue'

export default defineComponent({
  name: 'AppNavbar',
  components: {
    Button,
    Input,
    Avatar,
    AvatarFallback,
    AvatarImage,
    Badge,
    Search,
    ArrowLeft,
    Sun,
    Moon,
    LogOut,
    User,
    List,
    MessageCircle,
    Plus,
    UserAvatar
  },
  props: {
    pageTitle: {
      type: String,
      default: '失物招领'
    },
    currentPage: {
      type: String,
      default: 'home'
    },
    showBackButton: {
      type: Boolean,
      default: false
    },
    isScrollNavbar: {
      type: Boolean,
      default: false
    },
    showNavbar: {
      type: Boolean,
      default: true
    },
    showSearch: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const router = useRouter()
    const { toast } = useToast()
    const searchQuery = ref('')
    const isDarkMode = ref(false)
    const unreadCount = ref(0) // 未读消息数量
    const previousUnreadCount = ref(-1) // 上次的未读数量，用于检测变化，初始化为-1
    const lastToastTime = ref(0) // 上次显示Toast的时间戳，避免重复显示
    let pollingTimer: ReturnType<typeof setInterval> | null = null

    const searchPlaceholder = computed(() => {
      return props.currentPage === 'home' ? '搜索失物信息...' : '搜索...'
    })

    const userStatusText = computed(() => {
      if (isLoggedIn.value) {
        return currentUser.value?.username || '用户'
      }
      return '登录'
    })

    // 获取未读消息数量
    const fetchUnreadCount = async () => {
      if (!isLoggedIn.value) {
        unreadCount.value = 0
        return
      }

      try {
        const result = await getUnreadMessageCount()
        if (result.success && result.data) {
          const newCount = result.data.count
          
          // 检测是否有新消息（未读数量增加）
          // 只有当未读数量真正增加时才显示通知
          if (newCount > previousUnreadCount.value && previousUnreadCount.value >= 0) {
            console.log('检测到新消息:', { previous: previousUnreadCount.value, current: newCount })
            showNewMessageToast(newCount)
          }
          
          // 更新未读数量（气泡显示）
          unreadCount.value = newCount
          
          // 更新上次未读数量记录
          previousUnreadCount.value = newCount
        } else {
          console.warn('获取未读消息数量失败:', result.message)
        }
      } catch (error) {
        console.error('获取未读消息数量异常:', error)
      }
    }

    // 显示新消息Toast通知
    const showNewMessageToast = (count: number) => {
      const now = Date.now()
      // 防止在5秒内重复显示Toast
      if (now - lastToastTime.value < 5000) {
        console.log('Toast显示间隔过短，跳过此次通知')
        return
      }
      
      lastToastTime.value = now
      
      toast({
        title: '新消息提醒',
        description: `您有 ${count} 条未读消息`,
        duration: 5000,
      })
    }

    // 开始轮询未读消息数量
    const startPolling = () => {
      if (!isLoggedIn.value) return
      
      // 立即获取一次
      fetchUnreadCount()
      
      // 每30秒轮询一次
      pollingTimer = setInterval(() => {
        fetchUnreadCount()
      }, 30000)
    }

    // 停止轮询
    const stopPolling = () => {
      if (pollingTimer) {
        clearInterval(pollingTimer)
        pollingTimer = null
      }
    }

    const handleBack = () => {
      router.back()
    }

    const handleSearch = () => {
      // 检查用户是否已登录
      if (!isLoggedIn.value) {
        // 未登录时重定向到登录页面
        router.push('/login')
        return
      }
      
      // 已登录用户可以正常搜索
      if (searchQuery.value.trim()) {
        router.push({
          name: 'Search',
          query: { q: searchQuery.value.trim() }
        })
      }
    }

    const handleUserAction = () => {
      if (isLoggedIn.value) {
        router.push('/user')
      } else {
        router.push('/login')
      }
    }

    const handleLogout = () => {
      stopPolling() // 停止轮询
      unreadCount.value = 0 // 重置未读数量
      previousUnreadCount.value = -1 // 重置上次未读数量
      logout()
      toast({
        title: '成功',
        description: '已退出登录',
      })
      router.push('/')
    }

    const toggleTheme = () => {
      isDarkMode.value = !isDarkMode.value
      document.documentElement.classList.toggle('dark', isDarkMode.value)
    }

    const handleUserClick = async () => {
      console.log('=== handleUserClick 被调用 ===')
      console.log('当前登录状态:', isLoggedIn.value)
      console.log('当前用户信息:', currentUser.value)
      console.log('用户ID:', currentUser.value?.id)
      console.log('localStorage token:', localStorage.getItem('token'))
      console.log('localStorage user:', localStorage.getItem('user'))
      
      // 检查登录状态
      if (!isLoggedIn.value || !currentUser.value) {
        console.log('用户未登录，跳转到登录页')
        router.push('/login')
        return
      }
      
      // 检查用户ID
      if (!currentUser.value.id || currentUser.value.id === 0) {
        console.log('用户ID无效，尝试重新获取用户信息...')
        
        try {
          // 重新获取用户信息
          const { getUserProfile } = await import('@/stores/user')
          const profileResult = await getUserProfile()
          console.log('重新获取用户信息结果:', profileResult)
          
          if (profileResult.success && profileResult.data) {
            console.log('成功获取用户信息，更新本地状态')
            // 这里可能需要更新currentUser，但由于响应式限制，我们直接跳转
            router.push(`/user?id=${profileResult.data.id}`)
            return
          } else {
            console.log('获取用户信息失败，跳转到登录页')
            router.push('/login')
            return
          }
        } catch (error) {
          console.error('获取用户信息异常:', error)
          router.push('/login')
          return
        }
      }
      
      // 如果有有效的用户ID，直接跳转
      console.log('跳转到用户页面，ID:', currentUser.value.id)
      router.push(`/user?id=${currentUser.value.id}`)
    }

    const handleAddItem = () => {
      router.push('/add')
    }

    const handleMessages = () => {
      router.push('/messages')
    }

    const goToHome = () => {
      router.push('/')
    }

    // 监听登录状态变化
    watch(isLoggedIn, (newValue) => {
      if (newValue) {
        // 登录时重置计数器并开始轮询
        previousUnreadCount.value = -1 // 设为-1表示第一次获取，不触发通知
        startPolling()
      } else {
        // 登出时停止轮询并重置状态
        stopPolling()
        unreadCount.value = 0
        previousUnreadCount.value = -1
      }
    })

    // 组件挂载时开始轮询
    onMounted(() => {
      if (isLoggedIn.value) {
        previousUnreadCount.value = -1 // 设为-1表示第一次获取，不触发通知
        startPolling()
      }
    })

    // 组件卸载时停止轮询
    onUnmounted(() => {
      stopPolling()
    })

    return {
      searchQuery,
      isDarkMode,
      searchPlaceholder,
      userStatusText,
      unreadCount,
      handleBack,
      handleSearch,
      handleUserAction,
      handleLogout,
      toggleTheme,
      isLoggedIn,
      currentUser,
      handleUserClick,
      handleAddItem,
      handleMessages,
      goToHome
    }
  }
})
</script>

<style scoped>
/* 确保Badge在相对定位的容器中正确显示 */
.relative {
  position: relative;
}
</style> 