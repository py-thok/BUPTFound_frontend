<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Clock, Package } from 'lucide-vue-next'
import { isLoggedIn, currentUser, initializeAuth, getConversations, items, type ConversationSummary, type Item } from '@/stores/user'
import AppNavbar from '@/components/AppNavbar.vue'
import UserAvatar from '@/components/UserAvatar.vue'

const router = useRouter()

// 状态管理
const conversations = ref<ConversationSummary[]>([])
const isLoading = ref(false)
const errorMessage = ref('')

// 获取所有对话
const loadConversations = async () => {
  if (!currentUser.value) {
    console.error('用户未登录')
    return
  }
  
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    console.log('开始获取对话列表...')
    const result = await getConversations()
    
    if (result.success && result.data) {
      conversations.value = result.data
      console.log('对话列表加载成功:', conversations.value)
    } else {
      errorMessage.value = result.message
      conversations.value = []
      console.error('获取对话列表失败:', result.message)
    }
  } catch (error) {
    console.error('获取对话列表异常:', error)
    errorMessage.value = '获取对话列表失败，请稍后重试'
    conversations.value = []
  } finally {
    isLoading.value = false
  }
}

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
  router.push(`/message?userId=${conversation.otherUserId}&userName=${encodeURIComponent(conversation.otherUsername)}&itemId=${conversation.itemId}&itemName=${encodeURIComponent(conversation.itemName)}&conversationId=${conversation.id}`)
}

// 获取物品数据
const getItemData = (itemId: number): Item | null => {
  return items.value.find(item => item.id === itemId) || null
}

// 计算属性
const hasConversations = computed(() => conversations.value.length > 0)
const hasError = computed(() => !!errorMessage.value)

onMounted(async () => {
  initializeAuth()
  
  // 检查登录状态
  if (!isLoggedIn.value) {
    router.push('/login')
    return
  }
  
  // 加载对话列表
  await loadConversations()
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <!-- 导航栏 -->
    <AppNavbar 
      :page-title="'我的消息'"
      :current-page="'messages'"
      :show-back-button="true"
      :is-scroll-navbar="false"
      :show-navbar="true"
    />

    <!-- 主要内容 -->
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <div class="flex items-center justify-between">
            <CardTitle class="flex items-center gap-2">
              <MessageCircle :size="20" />
              私信列表
            </CardTitle>
            <Badge v-if="hasConversations" variant="secondary">
              {{ conversations.length }} 个对话
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <!-- 加载状态 -->
          <div v-if="isLoading" class="text-center py-12">
            <div class="text-gray-400 mb-4">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
            <p class="text-gray-500">正在加载消息列表...</p>
          </div>
          
          <!-- 错误状态 -->
          <div v-else-if="hasError" class="text-center py-12">
            <div class="text-red-400 mb-4">
              <MessageCircle :size="48" class="mx-auto" />
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
            <p class="text-gray-600 mb-4">{{ errorMessage }}</p>
            <button 
              @click="loadConversations"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              重新加载
            </button>
          </div>
          
          <!-- 空状态 -->
          <div v-else-if="!hasConversations" class="text-center py-12">
            <div class="text-gray-400 mb-4">
              <MessageCircle :size="48" class="mx-auto" />
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">还没有私信</h3>
            <p class="text-gray-500 mb-6">您还没有与其他用户的私信对话</p>
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
              class="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-gray-100 relative"
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
                    <h4 class="font-medium text-gray-900 truncate">
                      {{ conversation.anonymous ? '匿名用户' : conversation.otherUsername }}
                    </h4>
                    <Badge v-if="conversation.anonymous" variant="outline" class="text-xs">
                      匿名
                    </Badge>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-gray-500 flex items-center gap-1">
                      <Clock :size="12" />
                      {{ formatTime(conversation.lastMessageTime) }}
                    </span>
                  </div>
                </div>
                
                <!-- 物品信息 -->
                <div class="flex items-center gap-2 mb-2">
                  <Package :size="14" class="text-blue-600" />
                  <span class="text-sm text-blue-700 font-medium truncate">{{ conversation.itemName }}</span>
                  <Badge 
                    v-if="getItemData(conversation.itemId)"
                    :variant="getItemData(conversation.itemId)?.status === 'resolved' ? 'secondary' : (getItemData(conversation.itemId)?.type === 'found' ? 'default' : 'destructive')" 
                    class="text-xs"
                  >
                    {{ getItemData(conversation.itemId)?.status === 'resolved' ? '已找回' : (getItemData(conversation.itemId)?.type === 'found' ? '拾到' : '寻找') }}
                  </Badge>
                </div>
                
                <!-- 最后一条消息 -->
                <p class="text-sm text-gray-600 truncate">{{ conversation.lastMessageContent }}</p>
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
</style> 