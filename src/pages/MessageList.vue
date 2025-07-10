<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Clock, Package, RefreshCw } from 'lucide-vue-next'
import { isLoggedIn, currentUser, initializeAuth, getConversations, type ConversationSummary } from '@/stores/user'
import { items, type Item } from '@/stores/items'
import AppNavbar from '@/components/AppNavbar.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { Button } from '@/components/ui/button'

const router = useRouter()

// 状态管理
const conversations = ref<ConversationSummary[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const isPolling = ref(false) // 轮询状态
const lastUpdateTime = ref<Date>(new Date()) // 最后更新时间
const unreadCount = ref(0) // 未读消息总数
let pollingTimer: ReturnType<typeof setInterval> | null = null

// 获取所有对话
const loadConversations = async (showLoading = true) => {
  if (!currentUser.value) {
    console.error('用户未登录')
    return
  }
  
  if (showLoading) {
    isLoading.value = true
  }
  errorMessage.value = ''
  
  try {
    console.log('开始获取对话列表...')
    const result = await getConversations()
    
    if (result.success && result.data) {
      const newConversations = result.data
      
      // 检查是否有新的未读消息
      const newUnreadCount = newConversations.filter(conv => conv.hasUnread).length
      const oldUnreadCount = conversations.value.filter(conv => conv.hasUnread).length
      
      // 如果有新的未读消息，显示通知
      if (!showLoading && newUnreadCount > oldUnreadCount) {
        console.log('检测到新消息！', {
          新未读数: newUnreadCount,
          旧未读数: oldUnreadCount
        })
        
        // 这里可以添加消息通知
        showNewMessageNotification(newUnreadCount - oldUnreadCount)
      }
      
      conversations.value = newConversations
      unreadCount.value = newUnreadCount
      lastUpdateTime.value = new Date()
      
      console.log('对话列表加载成功:', conversations.value)
      // console.log('未读消息数:', unreadCount.value)
    } else {
      errorMessage.value = result.message
      conversations.value = []
      console.error('获取对话列表失败:', result.message)
    }
  } catch (error) {
    console.error('获取对话列表异常:', error)
    if (showLoading) {
      errorMessage.value = '获取对话列表失败，请稍后重试'
      conversations.value = []
    }
  } finally {
    if (showLoading) {
      isLoading.value = false
    }
  }
}

// 显示新消息通知
const showNewMessageNotification = (newMessageCount: number) => {
  console.log(`🔔 您有 ${newMessageCount} 条新消息！`)
  
  // 可以在这里添加更多通知方式：
  // 1. 浏览器通知
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('新消息提醒', {
      body: `您有 ${newMessageCount} 条新消息`,
      icon: '/favicon.ico'
    })
  }
  
  // 2. 可以添加音效提示（可选）
  // playNotificationSound()
  
  // 3. 可以添加页面标题闪烁（可选）
  // blinkPageTitle()
}

// 请求浏览器通知权限
const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    const permission = await Notification.requestPermission()
    console.log('通知权限状态:', permission)
  }
}

// 开始轮询
const startPolling = () => {
  if (pollingTimer) return // 防止重复启动
  
  console.log('开始消息轮询...')
  isPolling.value = true
  
  // 每30秒检查一次新消息
  pollingTimer = setInterval(() => {
    if (isLoggedIn.value && currentUser.value) {
      console.log('执行定时消息检查...')
      loadConversations(false) // 静默刷新，不显示加载状态
    } else {
      console.log('用户未登录，停止轮询')
      stopPolling()
    }
  }, 10000) // 30秒间隔
}

// 停止轮询
const stopPolling = () => {
  if (pollingTimer) {
    console.log('停止消息轮询')
    clearInterval(pollingTimer)
    pollingTimer = null
    isPolling.value = false
  }
}

// 手动刷新
const refreshConversations = async () => {
  console.log('手动刷新对话列表')
  await loadConversations(true)
}

// 格式化最后更新时间
const formatLastUpdateTime = computed(() => {
  const now = new Date()
  const diff = now.getTime() - lastUpdateTime.value.getTime()
  
  if (diff < 60000) return '刚刚更新'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前更新`
  
  return lastUpdateTime.value.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  }) + ' 更新'
})

// 格式化时间
const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 86400000 * 7) return `${Math.floor(diff / 86400000)}天前`
  
  return date.toLocaleDateString('zh-CN')
}

// 进入对话
const enterConversation = (conversation: ConversationSummary) => {
  router.push({
    path: '/message',
    query: {
      conversationId: conversation.id,
      userId: conversation.otherUserId,
      userName: conversation.otherUsername,
      userAvatar: '', // 让Message页面自动获取对方头像
      itemId: conversation.itemId,
      itemName: conversation.itemName
    }
  })
}

// 获取物品数据
const getItemData = (itemId: number): Item | null => {
  return items.value.find(item => item.id === itemId) || null
}

// 计算属性
const hasConversations = computed(() => conversations.value.length > 0)
const hasError = computed(() => !!errorMessage.value)
const hasUnreadMessages = computed(() => unreadCount.value > 0)

onMounted(async () => {
  initializeAuth()
  
  // 检查登录状态
  if (!isLoggedIn.value) {
    router.push('/login')
    return
  }
  
  // 请求通知权限
  await requestNotificationPermission()
  
  // 加载对话列表
  await loadConversations()
  
  // 开始轮询
  startPolling()
})

// 组件卸载时停止轮询
onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
    <!-- 导航栏 -->
    <AppNavbar 
      :page-title="'消息列表'"
      :current-page="'mymessages'"
      :show-back-button="true"
      :is-scroll-navbar="false"
      :show-navbar="true"
    />

    <div class="container mx-auto px-4 py-8">
      <Card class="max-w-4xl mx-auto">
        <CardHeader class="card-header-bg">
          <div class="flex items-center justify-between">
            <CardTitle class="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <MessageCircle :size="24" class="icon-bg-fill" />
              私信对话
              <!-- 轮询状态指示器 -->
              <div v-if="isPolling" class="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span></span>
              </div>
            </CardTitle>
            <div class="flex items-center gap-3">
              <!-- 未读消息统计 -->
              <Badge v-if="hasUnreadMessages" variant="destructive" class="text-xs">
                {{ unreadCount }} 条未读
              </Badge>
              <!-- 对话总数 -->
              <Badge v-if="hasConversations" variant="secondary">
                {{ conversations.length }} 个对话
              </Badge>
              <!-- 手动刷新按钮 -->
              <Button 
                @click="refreshConversations"
                variant="ghost" 
                size="sm"
                :disabled="isLoading"
                class="p-2"
              >
                <RefreshCw :class="{ 'animate-spin': isLoading }" class="h-4 w-4 icon-bg-fill" />
              </Button>
            </div>
          </div>
          <!-- 更新状态信息 -->
          <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
            <span>{{ formatLastUpdateTime }}</span>
            <span v-if="isPolling"></span>
          </div>
        </CardHeader>
        <CardContent>
          <!-- 加载状态 -->
          <div v-if="isLoading" class="text-center py-12">
            <div class="text-gray-400 mb-4">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
            <p class="text-gray-500 dark:text-gray-400">正在加载消息列表...</p>
          </div>
          
          <!-- 错误状态 -->
          <div v-else-if="hasError" class="text-center py-12 error-state-bg">
            <div class="text-red-400 mb-4">
              <MessageCircle :size="48" class="mx-auto icon-bg-fill" />
            </div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">加载失败</h3>
            <p class="text-gray-600 dark:text-gray-300 mb-4">{{ errorMessage }}</p>
            <button 
              @click="() => loadConversations()"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              重新加载
            </button>
          </div>
          
          <!-- 空状态 -->
          <div v-else-if="!hasConversations" class="text-center py-12 empty-state-bg">
            <div class="text-gray-400 mb-4">
              <MessageCircle :size="48" class="mx-auto icon-bg-fill" />
            </div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">还没有私信</h3>
            <p class="text-gray-500 dark:text-gray-400 mb-6">您还没有与其他用户的私信对话</p>
            <button 
              @click="router.push('/')"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              去首页看看
            </button>
          </div>
          
          <!-- 对话列表 -->
          <div v-else class="space-y-3">
            <div 
              v-for="conversation in conversations" 
              :key="conversation.id"
              @click="enterConversation(conversation)"
              class="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors border border-gray-100 dark:border-gray-700 relative"
            >
              <!-- 用户头像 -->
              <div class="relative">
                <UserAvatar 
                  :userId="conversation.otherUserId"
                  :name="conversation.otherUsername"
                  :avatar="getItemData(conversation.itemId)?.userAvatar"
                  size="base"
                />
                <!-- 匿名标识 -->
                <div v-if="conversation.anonymous" class="absolute -top-1 -right-1 w-4 h-4 bg-gray-500 rounded-full flex items-center justify-center">
                  <span class="text-xs text-white">?</span>
                </div>
              </div>
              
              <!-- 对话信息 -->
              <div class="flex-1 min-w-0">
                <!-- 用户名和时间 -->
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <h4 class="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {{ conversation.anonymous ? '匿名用户' : conversation.otherUsername }}
                    </h4>
                    <Badge v-if="conversation.anonymous" variant="outline" class="text-xs">
                      匿名
                    </Badge>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Clock :size="12" class="icon-bg-fill" />
                      {{ formatTime(conversation.lastMessageTime) }}
                    </span>
                  </div>
                </div>
                
                <!-- 物品信息 -->
                <div class="flex items-center gap-2 mb-2">
                  <Package :size="14" class="text-blue-600 dark:text-blue-400 icon-bg-fill" />
                  <span class="text-sm text-blue-700 dark:text-blue-300 font-medium truncate">{{ conversation.itemName }}</span>
                  <Badge 
                    v-if="getItemData(conversation.itemId)"
                    :variant="getItemData(conversation.itemId)?.status === 'resolved' ? 'secondary' : (getItemData(conversation.itemId)?.type === 'found' ? 'default' : 'destructive')" 
                    class="text-xs"
                  >
                    {{ getItemData(conversation.itemId)?.status === 'resolved' ? '已找回' : (getItemData(conversation.itemId)?.type === 'found' ? '拾到' : '寻找') }}
                  </Badge>
                </div>
                
                <!-- 最后一条消息 -->
                <p class="text-sm text-gray-600 dark:text-gray-300 truncate">{{ conversation.lastMessageContent }}</p>
              </div>
              
              <!-- 未读标识 -->
              <div v-if="conversation.hasUnread" class="absolute top-2 right-2">
                <div class="w-3 h-3 bg-red-500 rounded-full"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<style scoped>
/* 确保长文本能够正确截断 */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Lucide图标填充色与父容器背景一致的样式 */
.icon-bg-fill {
  /* 让图标填充色继承父容器的背景色 */
  fill: var(--bg-color, currentColor);
}

/* 为不同的容器设置背景色变量 */
.card-header-bg {
  --bg-color: rgb(255 255 255); /* 白色背景 */
}

.dark .card-header-bg {
  --bg-color: rgb(31 41 55); /* 暗色模式背景 */
}

.error-state-bg {
  --bg-color: rgb(254 242 242); /* 红色背景的浅色版本 */
}

.dark .error-state-bg {
  --bg-color: rgb(127 29 29); /* 暗色模式红色背景 */
}

.empty-state-bg {
  --bg-color: rgb(249 250 251); /* 灰色背景 */
}

.dark .empty-state-bg {
  --bg-color: rgb(55 65 81); /* 暗色模式灰色背景 */
}

/* 另一种方法：直接使用背景色作为填充色 */
.fill-parent-bg svg {
  fill: rgb(var(--parent-bg-rgb, 255 255 255));
}
</style> 