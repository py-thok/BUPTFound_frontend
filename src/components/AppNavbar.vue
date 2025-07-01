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
            @click="goBack" 
            variant="ghost" 
            size="sm" 
            class="p-0"
          >
            <ArrowLeft :size="24" />
          </Button>
          
          <!-- 标题 -->
          <h1 :class="showBackButton ? 'text-xl font-bold text-gray-900' : 'text-2xl font-bold text-gray-900'">
            {{ pageTitle }}
          </h1>
        </div>
        
        <!-- 中间搜索栏 -->
        <div class="flex-1 max-w-md mx-8" v-if="showSearch">
          <div class="relative">
            <div class="absolute left-3 top-1/2 transform -translate-y-1/2">
              <Search :size="16" class="text-gray-400" />
            </div>
            <Input
              v-model="searchKeyword"
              @keydown="handleKeyDown"
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
              <Sun v-if="isDark" :size="18" class="mr-1" />
              <Moon v-else :size="18" class="mr-1" />
            </Button>
            <Button @click="handleLogin" variant="outline" size="sm">
              <User :size="16" class="mr-1" />
              登录/注册
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
            
            <!-- 消息按钮 -->
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
              <Sun v-if="isDark" :size="18" class="mr-1" />
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

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Search, Plus, Sun, Moon, LogOut, User, List, MessageCircle } from 'lucide-vue-next'
import { isLoggedIn, currentUser, logout, initializeAuth, getUserProfile } from '@/stores/user'
import { useTheme } from '@/composables/useTheme'
import UserAvatar from '@/components/UserAvatar.vue'

interface Props {
  pageTitle?: string
  currentPage?: 'home' | 'add' | 'search' | 'user' | 'post' | 'message' | 'messages'
  showBackButton?: boolean
  isScrollNavbar?: boolean
  showNavbar?: boolean
  showSearch?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  pageTitle: 'BUPTFound',
  currentPage: 'home',
  showBackButton: false,
  isScrollNavbar: false,
  showNavbar: true,
  showSearch: true
})

const router = useRouter()
const { isDark, toggleTheme } = useTheme()
const searchKeyword = ref('')

// 导航功能
const handleSearch = () => {
  if (searchKeyword.value.trim()) {
    router.push(`/search?q=${encodeURIComponent(searchKeyword.value)}`)
  } else {
    router.push('/search')
  }
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    handleSearch()
  }
}

const handleLogin = () => {
  router.push('/login')
}

const handleUserClick = async (userId?: number) => {
  console.log('handleUserClick 被调用，userId:', userId, 'currentUser:', currentUser.value)
  
  // 如果没有指定用户ID且有当前用户信息，直接跳转
  if (!userId && currentUser.value?.id) {
    console.log('直接跳转到当前用户页面，ID:', currentUser.value.id)
    router.push(`/user?id=${currentUser.value.id}`)
    return
  }
  
  // 如果有指定用户ID，跳转到指定用户
  if (userId) {
    console.log('跳转到指定用户页面，ID:', userId)
    router.push(`/user?id=${userId}`)
    return
  }
  
  // 如果都没有，尝试通过 API 获取当前用户信息
  console.log('尝试通过 API 获取当前用户信息')
  try {
    if (isLoggedIn.value) {
      // 调用不带参数的 getUserProfile API，使用 token 获取当前用户信息
      const result = await getUserProfile()
      console.log('getUserProfile API 调用结果:', result)
      
      if (result.success && result.data) {
        console.log('获取用户信息成功:', result.data)
        // 更新当前用户信息
        currentUser.value = result.data
        localStorage.setItem('user', JSON.stringify(result.data))
        
        // 跳转到用户页面
        router.push(`/user?id=${result.data.id}`)
      } else {
        console.log('获取用户信息失败:', result.message)
        router.push('/login')
      }
    } else {
      console.log('用户未登录，跳转到登录页')
      router.push('/login')
    }
  } catch (error) {
    console.error('handleUserClick 异常:', error)
    router.push('/login')
  }
}

const handleAddItem = () => {
  router.push('/add')
}

const handleLogout = () => {
  logout()
  router.push('/')
}

const goToHome = () => {
  router.push('/')
}

const goBack = () => {
  router.back()
}

const handleMessages = () => {
  router.push('/messages')
}
</script> 