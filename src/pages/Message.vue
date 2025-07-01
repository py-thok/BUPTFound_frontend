<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Send, ArrowLeft, Package } from 'lucide-vue-next'
import { isLoggedIn, currentUser, initializeAuth, sendMessage, getMessages, items, type MessageResponse, type Item } from '@/stores/user'
import AppNavbar from '@/components/AppNavbar.vue'

const route = useRoute()
const router = useRouter()

// 状态管理
const targetUserId = ref<number>(0)
const targetUserName = ref<string>('')
const targetUserAvatar = ref<string>('')
const itemId = ref<number>(0)
const itemName = ref<string>('')
const relatedItem = ref<Item | null>(null)
const conversationId = ref<number>(0)
const messages = ref<MessageResponse[]>([])
const newMessage = ref('')
const isLoading = ref(false)
const isSending = ref(false)
const messagesContainer = ref<HTMLDivElement>()

// 计算属性
const sortedMessages = computed(() => {
  return messages.value.sort((a, b) => new Date(a.sentTime).getTime() - new Date(b.sentTime).getTime())
})

// 发送消息
const sendNewMessage = async () => {
  if (!newMessage.value.trim() || !currentUser.value || isSending.value || !itemId.value) return
  
  isSending.value = true
  
  try {
    console.log('发送消息:', {
      receiverId: targetUserId.value,
      itemId: itemId.value,
      content: newMessage.value.trim(),
      anonymous: false
    })
    
    const result = await sendMessage({
      receiverId: targetUserId.value,
      itemId: itemId.value,
      content: newMessage.value.trim(),
      anonymous: false
    })
    
    if (result.success && result.data) {
      // 添加新消息到列表
      messages.value.push(result.data)
      
      // 如果是第一条消息，设置conversationId
      if (!conversationId.value && result.data.conversationId) {
        conversationId.value = result.data.conversationId
      }
      
      newMessage.value = ''
      
      // 滚动到底部
      await nextTick()
      scrollToBottom()
      
      console.log('消息发送成功:', result.data)
    } else {
      console.error('消息发送失败:', result.message)
      alert(`发送失败: ${result.message}`)
    }
    
  } catch (error) {
    console.error('发送消息异常:', error)
    alert('发送失败，请稍后重试')
  } finally {
    isSending.value = false
  }
}

// 获取消息列表
const loadMessages = async () => {
  if (!conversationId.value) return
  
  isLoading.value = true
  
  try {
    const result = await getMessages(conversationId.value)
    
    if (result.success && result.data) {
      messages.value = result.data
      console.log('消息列表加载成功:', result.data)
      
      // 滚动到底部
      await nextTick()
      scrollToBottom()
    } else {
      console.error('获取消息列表失败:', result.message)
    }
    
  } catch (error) {
    console.error('获取消息列表异常:', error)
  } finally {
    isLoading.value = false
  }
}

// 滚动到底部
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
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
  
  return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

// 处理回车发送
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendNewMessage()
  }
}

// 查看物品详情
const viewItemDetail = () => {
  if (itemId.value) {
    router.push(`/post/${itemId.value}`)
  }
}

onMounted(() => {
  initializeAuth()
  
  // 检查登录状态
  if (!isLoggedIn.value) {
    router.push('/login')
    return
  }
  
  // 获取路由参数
  targetUserId.value = parseInt(route.query.userId as string) || 0
  targetUserName.value = (route.query.userName as string) || '未知用户'
  targetUserAvatar.value = (route.query.userAvatar as string) || ''
  itemId.value = parseInt(route.query.itemId as string) || 0
  itemName.value = (route.query.itemName as string) || ''
  conversationId.value = parseInt(route.query.conversationId as string) || 0
  
  // 验证必要参数
  if (!targetUserId.value || !itemId.value) {
    console.error('缺少必要的路由参数', {
      targetUserId: targetUserId.value,
      itemId: itemId.value
    })
    alert('缺少必要的参数，请重新访问')
    router.push('/')
    return
  }
  
  // 查找相关物品信息
  relatedItem.value = items.value.find(item => item.id === itemId.value) || null
  if (relatedItem.value && !itemName.value) {
    itemName.value = relatedItem.value.title
  }
  
  // 如果有conversationId，加载历史消息
  if (conversationId.value) {
    loadMessages()
  }
  
  console.log('消息页面初始化完成', {
    targetUserId: targetUserId.value,
    targetUserName: targetUserName.value,
    itemId: itemId.value,
    itemName: itemName.value,
    conversationId: conversationId.value,
    relatedItem: relatedItem.value
  })
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <!-- 导航栏 -->
    <AppNavbar 
      :page-title="`与 ${targetUserName} 的对话`"
      :current-page="'message'"
      :show-back-button="true"
      :is-scroll-navbar="false"
      :show-navbar="true"
    />

    <!-- 主要内容 -->
    <div class="container mx-auto px-4 py-6 max-w-4xl">
      <Card class="h-[calc(100vh-200px)] flex flex-col">
        <!-- 聊天对象和物品信息 -->
        <CardHeader class="border-b border-gray-200 py-4 space-y-4">
          <!-- 用户信息 -->
          <div class="flex items-center gap-3">
            <Avatar>
              <AvatarImage 
                v-if="targetUserAvatar" 
                :src="targetUserAvatar" 
                :alt="targetUserName" 
              />
              <AvatarFallback>{{ targetUserName.charAt(0) }}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle class="text-lg">{{ targetUserName }}</CardTitle>
              <p class="text-sm text-gray-500">在线</p>
            </div>
          </div>
          
          <!-- 相关物品信息 -->
          <div 
            v-if="relatedItem"
            @click="viewItemDetail"
            class="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
          >
            <div class="flex-shrink-0">
              <img 
                :src="relatedItem.image" 
                :alt="relatedItem.title"
                class="w-12 h-12 object-cover rounded-lg"
              >
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <Package :size="16" class="text-blue-600" />
                <h4 class="font-medium text-gray-900 truncate">{{ relatedItem.title }}</h4>
                <Badge :variant="relatedItem.status === 'resolved' ? 'secondary' : (relatedItem.type === 'found' ? 'default' : 'destructive')" class="text-xs">
                  {{ relatedItem.status === 'resolved' ? '已找回' : (relatedItem.type === 'found' ? '拾到' : '寻找') }}
                </Badge>
              </div>
              <p class="text-sm text-gray-600 truncate">{{ relatedItem.description }}</p>
            </div>
          </div>
          
          <!-- 没有物品信息时的提示 -->
          <div v-else-if="itemName" class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <Package :size="24" class="text-gray-400" />
            <div>
              <h4 class="font-medium text-gray-900">{{ itemName }}</h4>
              <p class="text-sm text-gray-500">关于此物品的对话</p>
            </div>
          </div>
        </CardHeader>

        <!-- 消息列表 -->
        <CardContent class="flex-1 p-0 overflow-hidden">
          <div 
            ref="messagesContainer"
            class="h-full overflow-y-auto p-6 space-y-4"
          >
            <!-- 加载状态 -->
            <div v-if="isLoading" class="text-center py-12">
              <div class="text-gray-400 mb-4">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
              <p class="text-gray-500">正在加载消息...</p>
            </div>
            
            <!-- 空状态 -->
            <div v-else-if="messages.length === 0" class="text-center py-12">
              <div class="text-gray-400 mb-4">
                <Send :size="48" class="mx-auto" />
              </div>
              <p class="text-gray-500">还没有消息，开始对话吧！</p>
              <p class="text-sm text-gray-400 mt-2">关于物品：{{ itemName }}</p>
            </div>
            
            <!-- 消息列表 -->
            <div 
              v-for="message in sortedMessages" 
              :key="message.id"
              :class="[
                'flex gap-3',
                message.senderId === currentUser?.id ? 'justify-end' : 'justify-start'
              ]"
            >
              <!-- 对方头像（左侧） -->
              <Avatar 
                v-if="message.senderId !== currentUser?.id"
                size="sm"
              >
                <AvatarImage 
                  v-if="targetUserAvatar" 
                  :src="targetUserAvatar" 
                  :alt="targetUserName" 
                />
                <AvatarFallback>{{ targetUserName.charAt(0) }}</AvatarFallback>
              </Avatar>

              <!-- 消息内容 -->
              <div 
                :class="[
                  'max-w-xs md:max-w-md px-4 py-2 rounded-lg',
                  message.senderId === currentUser?.id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-900'
                ]"
              >
                <p class="text-sm">{{ message.content }}</p>
                <p 
                  :class="[
                    'text-xs mt-1',
                    message.senderId === currentUser?.id 
                      ? 'text-blue-100' 
                      : 'text-gray-500'
                  ]"
                >
                  {{ formatTime(message.sentTime) }}
                </p>
              </div>

              <!-- 我的头像（右侧） -->
              <Avatar 
                v-if="message.senderId === currentUser?.id"
                size="sm"
              >
                <AvatarImage 
                  v-if="currentUser?.avatar" 
                  :src="currentUser.avatar" 
                  :alt="currentUser.name" 
                />
                <AvatarFallback>{{ currentUser?.name?.charAt(0) || 'U' }}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </CardContent>
        
        <!-- 输入区域 -->
        <div class="border-t border-gray-200 p-4">
          <div class="flex gap-3">
            <Input
              v-model="newMessage"
              @keydown="handleKeyDown"
              :placeholder="`关于 ${itemName} 说点什么...`"
              class="flex-1"
              :disabled="isSending"
            />
            <Button 
              @click="sendNewMessage"
              :disabled="!newMessage.trim() || isSending"
            >
              <Send :size="16" class="mr-2" />
              {{ isSending ? '发送中...' : '发送' }}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<style scoped>
/* 确保消息容器能够正确滚动 */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

/* 确保长文本能够正确截断 */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style> 