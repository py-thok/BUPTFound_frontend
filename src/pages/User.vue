<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { User as UserIcon, Edit, X, Upload, MapPin, Calendar, Save, Phone, Trash2 } from 'lucide-vue-next'
import { isLoggedIn, currentUser, initializeAuth, getUserProfile, getPublicUserProfile, updateUserProfile, type User } from '@/stores/user'
import { items, getUserItems, deleteItem, type Item } from '@/stores/items'
import UserAvatar from '@/components/UserAvatar.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select/index'

const router = useRouter()
const route = useRoute()

// 状态管理
const targetUser = ref<User | null>(null)
const isCurrentUser = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const isEditing = ref(false)
const isSaving = ref(false)
const userItemsList = ref<any[]>([]) // 用户发布的物品列表

// 编辑表单数据
const editForm = ref({
  email: '',
  phoneNumber: '',
  studentId: '',
  gender: '',
  avatar: ''
})

// 计算属性
const userItems = computed(() => {
  // 如果是当前用户，使用API获取的数据
  if (isCurrentUser.value) {
    return userItemsList.value
  }
  // 如果是其他用户，使用现有逻辑
  if (!targetUser.value) return []
  return items.value.filter(item => item.userId === targetUser.value!.id)
})

const pageTitle = computed(() => {
  return isCurrentUser.value ? '个人中心' : `${targetUser.value?.name || '用户'} 的主页`
})

// 获取用户信息
const getUserInfo = async (userId?: number): Promise<User | null> => {
  try {
    isLoading.value = true
    errorMessage.value = ''
    
    if (userId) {
      // 如果指定了userId，判断是否为当前用户
      if (isLoggedIn.value && currentUser.value?.id === userId) {
        // 是当前用户，使用getUserProfile获取完整信息
        // console.log('获取当前用户的完整信息')
        const result = await getUserProfile()
        
        if (result.success && result.data) {
          // 更新本地状态
          currentUser.value = result.data
          localStorage.setItem('user', JSON.stringify(result.data))
          return result.data
        } else {
          errorMessage.value = result.message
          return null
        }
      } else {
        // 是其他用户，使用getPublicUserProfile获取公开信息
        // console.log('获取其他用户的公开信息，userId:', userId)
        const result = await getPublicUserProfile(userId)
        
        if (result.success && result.data) {
          return result.data
        } else {
          errorMessage.value = result.message
          return null
        }
      }
    } else {
      // 没有指定userId，如果已登录则获取当前用户信息
      if (!isLoggedIn.value) {
        errorMessage.value = '请先登录'
        return null
      }
      
      // console.log('获取当前用户信息（无userId参数）')
      const result = await getUserProfile()
      
      if (result.success && result.data) {
        // 更新本地状态
        currentUser.value = result.data
        localStorage.setItem('user', JSON.stringify(result.data))
        return result.data
      } else {
        errorMessage.value = result.message
        return null
      }
    }
  } catch (error) {
    console.error('getUserInfo 异常:', error)
    errorMessage.value = '获取用户信息失败'
    return null
  } finally {
    isLoading.value = false
  }
}

// 获取用户发布的物品列表
const loadUserItems = async () => {
  if (!isCurrentUser.value) return
  
  try {
    // console.log('开始获取用户发布的物品列表...')
    const result = await getUserItems()
    
    if (result.success && result.data) {
      // 将API数据转换为前端显示格式
      userItemsList.value = result.data.map((apiItem: any) => ({
        id: apiItem.id,
        title: apiItem.name,
        description: apiItem.description,
        type: apiItem.type.toLowerCase(),
        status: apiItem.status.toLowerCase(),
        location: apiItem.site, // 使用site字段
        contact: '', // 后端没有返回联系方式
        date: apiItem.eventTime ? apiItem.eventTime.split('T')[0] : '',
        image: apiItem.imageUrl ? `/uploads/${apiItem.imageUrl}` : '',
        userId: apiItem.userId,
        userName: apiItem.username,
        userAvatar: targetUser.value?.avatar || '',
        createdAt: apiItem.createdAt
      }))
      
      // console.log('用户物品列表加载成功:', userItemsList.value)
    } else {
      // console.error('获取用户物品列表失败:', result.message)
      userItemsList.value = []
    }
  } catch (error) {
    console.error('加载用户物品列表异常:', error)
    userItemsList.value = []
  }
}

onMounted(async () => {
  initializeAuth()
  
  const userId = route.query.id ? parseInt(route.query.id as string) : null
  // console.log('=== User页面初始化 ===')
  // console.log('URL中的userId:', userId)
  // console.log('当前登录状态:', isLoggedIn.value)
  // console.log('当前用户信息:', currentUser.value)
  
  if (userId) {
    // 查看指定用户的信息
    targetUser.value = await getUserInfo(userId)
    
    if (!targetUser.value) {
      // 不再自动跳转到主页，而是显示错误信息让用户选择
      // 用户可以通过错误页面的"返回首页"按钮选择是否离开
      return
    }
    
    // 判断是否为当前用户
    isCurrentUser.value = isLoggedIn.value && currentUser.value?.id === userId
    
    // console.log('目标用户信息:', targetUser.value)
    // console.log('是否为当前用户:', isCurrentUser.value)
    // console.log('判断逻辑:', {
    //   isLoggedIn: isLoggedIn.value,
    //   currentUserId: currentUser.value?.id,
    //   targetUserId: userId,
    //   result: isLoggedIn.value && currentUser.value?.id === userId
    // })
    
    // 暴露到全局window对象供调试使用
    ;(window as any).userPageDebug = {
      isCurrentUser: isCurrentUser.value,
      targetUser: targetUser.value,
      currentUser: currentUser.value,
      isLoggedIn: isLoggedIn.value,
      userId
    }
    
    // console.log('已将调试信息暴露到 window.userPageDebug')
    
    // 如果是当前用户，加载用户发布的物品
    if (isCurrentUser.value) {
      // console.log('当前用户，开始加载用户发布的物品')
      await loadUserItems()
    } else {
      // console.log('其他用户，不加载个人物品列表')
    }
  } else {
    // 没有指定用户ID，如果已登录则跳转到当前用户页面
    if (!isLoggedIn.value) {
      // console.log('未登录且无用户ID，跳转到登录页')
      router.push('/login')
      return
    }
    
    // console.log('无用户ID但已登录，重定向到当前用户页面')
    // 重定向到当前用户的页面，使用统一的 /user?id= 格式
    router.push(`/user?id=${currentUser.value?.id}`)
  }
})

const handleItemClick = (item: Item) => {
  router.push(`/post/${item.id}`)
}

// 开始编辑
const startEdit = () => {
  if (!targetUser.value) return
  
  isEditing.value = true
  editForm.value = {
    email: targetUser.value.email || '',
    phoneNumber: targetUser.value.phoneNumber || '',
    studentId: targetUser.value.studentId || '',
    gender: targetUser.value.gender || '',
    avatar: targetUser.value.avatar || ''
  }
}

// 取消编辑
const cancelEdit = () => {
  isEditing.value = false
  editForm.value = {
    email: '',
    phoneNumber: '',
    studentId: '',
    gender: '',
    avatar: ''
  }
}

// 保存资料
const saveProfile = async () => {
  if (!targetUser.value) return
  
  isSaving.value = true
  try {
    // console.log('准备更新用户资料:', editForm.value)
    
    const updatedUser = await updateUserProfile(editForm.value)
    // console.log('更新用户资料成功:', updatedUser)
    
    // 更新targetUser（界面显示的用户信息）
    targetUser.value = {
      ...targetUser.value,
      email: updatedUser.email || targetUser.value.email,
      phoneNumber: updatedUser.phoneNumber || targetUser.value.phoneNumber,
      studentId: updatedUser.studentId || targetUser.value.studentId,
      gender: updatedUser.gender || targetUser.value.gender,
      avatar: updatedUser.avatar || targetUser.value.avatar,
      // 确保保留原有的基本信息
      id: targetUser.value.id,
      username: targetUser.value.username,
      name: targetUser.value.name
    }
    
    // 如果是当前用户，同时更新currentUser
    if (isCurrentUser.value && currentUser.value) {
      Object.assign(currentUser.value, targetUser.value)
      localStorage.setItem('user', JSON.stringify(currentUser.value))
    }
    
    isEditing.value = false
    alert('保存成功！')
    
    // console.log('界面用户信息已更新:', targetUser.value)
    
  } catch (error) {
    console.error('保存失败:', error)
    const errorMessage = error instanceof Error ? error.message : '请稍后重试'
    alert(`保存失败: ${errorMessage}`)
  } finally {
    isSaving.value = false
  }
}

// 头像上传处理
const handleAvatarUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      editForm.value.avatar = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

// 触发文件选择
const triggerFileUpload = () => {
  const fileInput = document.getElementById('avatar-upload') as HTMLInputElement
  fileInput?.click()
}

// 删除物品
const handleDeleteItem = async (event: Event, itemId: number, itemTitle: string) => {
  // 防止事件冒泡
  event?.stopPropagation()
  
  // 确认删除
  if (!confirm(`确定要删除"${itemTitle}"吗？此操作不可撤销。`)) {
    return
  }
  
  try {
    // console.log('开始删除物品:', itemId)
    const result = await deleteItem(itemId)
    
    if (result.success) {
      // 删除成功，从用户物品列表中移除
      const index = userItemsList.value.findIndex(item => item.id === itemId)
      if (index !== -1) {
        userItemsList.value.splice(index, 1)
        // console.log('已从用户物品列表中移除:', itemId)
      }
      
      alert('删除成功！')
    } else {
      alert(`删除失败：${result.message}`)
    }
  } catch (error) {
    console.error('删除物品异常:', error)
    alert('删除失败，请稍后重试')
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
    <!-- 统一导航栏 -->
    <AppNavbar 
      :page-title="pageTitle"
      current-page="user"
      :show-back-button="true"
      :show-search="false"
    />

    <!-- 主要内容 -->
    <main class="container mx-auto px-4 py-8">
      <!-- 加载状态 -->
      <div v-if="isLoading" class="max-w-4xl mx-auto text-center py-12">
        <div class="text-gray-400 mb-4 text-4xl">⏳</div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">正在加载用户信息...</h3>
        <p class="text-gray-600 dark:text-gray-300">请稍候</p>
      </div>
      
      <!-- 错误状态 -->
      <div v-else-if="errorMessage" class="max-w-4xl mx-auto text-center py-12">
        <div class="text-red-400 mb-4 text-4xl">❌</div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">获取用户信息失败</h3>
        <p class="text-gray-600 dark:text-gray-300 mb-4">{{ errorMessage }}</p>
        <Button @click="router.push('/')" variant="outline">
          返回首页
        </Button>
      </div>
      
      <!-- 用户信息 -->
      <div v-else-if="targetUser" class="max-w-4xl mx-auto space-y-6">
        <!-- 用户信息卡片 -->
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <UserAvatar 
                  :userId="targetUser?.id"
                  :name="targetUser?.name"
                  :avatar="isEditing ? editForm.avatar : targetUser?.avatar"
                  size="base"
                  :clickable="false"
                />
                <div>
                  <CardTitle class="text-2xl">{{ targetUser.name }}</CardTitle>
                  <CardDescription class="flex items-center gap-1">
                    <UserIcon :size="16" />
                    @{{ targetUser.username }}
                  </CardDescription>
                </div>
              </div>
              
              <!-- 编辑按钮 - 只有当前用户可见 -->
              <div v-if="isCurrentUser" class="flex gap-2">
                <Button 
                  v-if="!isEditing"
                  @click="startEdit"
                  variant="outline"
                  size="sm"
                >
                  <Edit :size="16" class="mr-1" />
                  编辑资料
                </Button>
                
                <template v-else>
                  <Button 
                    @click="saveProfile"
                    :disabled="isSaving"
                    size="sm"
                  >
                    <Save :size="16" class="mr-1" />
                    {{ isSaving ? '保存中...' : '保存' }}
                  </Button>
                  <Button 
                    @click="cancelEdit"
                    variant="outline"
                    size="sm"
                    :disabled="isSaving"
                  >
                    <X :size="16" class="mr-1" />
                    取消
                  </Button>
                </template>
              </div>
            </div>
          </CardHeader>
          
          <CardContent v-if="isCurrentUser">
            <!-- 非编辑模式 - 显示用户信息 -->
            <div v-if="!isEditing" class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  邮箱
                </label>
                <Input v-model="targetUser.email" readonly  />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  电话号码
                </label>
                <Input v-model="targetUser.phoneNumber" readonly  />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  学号
                </label>
                <Input v-model="targetUser.studentId" readonly />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  性别
                </label>
                <div v-if="!isEditing" >
                  <Input v-model="targetUser.gender" readonly />
                </div>
              </div>
            </div>
            
            <!-- 编辑模式 - 表单 -->
            <div v-else class="space-y-6">
              <!-- 头像上传 -->
              <div class="text-center">
                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    头像
                  </label>
                  <div class="flex flex-col items-center gap-3">
                    <UserAvatar 
                      :userId="targetUser?.id"
                      :name="targetUser?.name"
                      :avatar="editForm.avatar"
                      size="lg"
                      :clickable="false"
                    />
                    <div>
                      <input
                        type="file"
                        id="avatar-upload"
                        accept="image/*"
                        @change="handleAvatarUpload"
                        class="hidden"
                      />
                      <Button
                        @click="triggerFileUpload"
                        variant="outline"
                        size="sm"
                      >
                        <Upload :size="16" class="mr-1" />
                        上传头像
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 基本信息表单 -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    邮箱
                  </label>
                  <Input 
                    v-model="editForm.email" 
                    type="email" 
                    placeholder="请输入邮箱地址" 
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    电话号码
                  </label>
                  <Input 
                    v-model="editForm.phoneNumber" 
                    placeholder="请输入电话号码" 
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    学号
                  </label>
                  <Input 
                    v-model="editForm.studentId" 
                    placeholder="请输入学号" 
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    性别
                  </label>
                  <Select v-model="editForm.gender">
                    <SelectTrigger>
                      <SelectValue placeholder="请选择性别" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="男">男</SelectItem>
                      <SelectItem value="女">女</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- 用户发布的帖子 -->
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center justify-between">
              {{ isCurrentUser ? '我的发布' : `${targetUser.name} 的发布` }}
              <Badge variant="secondary">{{ userItems.length }} 条</Badge>
            </CardTitle>
            <CardDescription>
              {{ isCurrentUser ? '这里显示您发布的所有失物招领信息' : `查看 ${targetUser.name} 发布的失物招领信息` }}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div v-if="userItems.length === 0" class="text-center py-12">
              <div class="text-gray-400 mb-4">
                📝
              </div>
              <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {{ isCurrentUser ? '还没有发布任何信息' : '该用户还没有发布任何信息' }}
              </h3>
              <p v-if="isCurrentUser" class="text-gray-600 dark:text-gray-300 mb-4">快去发布您的第一条失物招领信息吧！</p>
              <Button v-if="isCurrentUser" @click="router.push('/add')" size="sm">
                发布信息
              </Button>
            </div>
            
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card 
                v-for="item in userItems" 
                :key="item.id" 
                class="border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-colors cursor-pointer relative"
                @click="handleItemClick(item)"
              >
                <!-- 删除按钮 - 仅当前用户可见 -->
                <Button
                  v-if="isCurrentUser"
                  @click="handleDeleteItem($event, item.id, item.title)"
                  variant="destructive"
                  size="sm"
                  class="absolute top-2 right-2 z-10 p-1 w-8 h-8"
                >
                  <Trash2 :size="14" />
                </Button>
                
                <CardContent class="p-4">
                  <div class="flex items-start gap-3">
                    <img 
                      :src="item.image" 
                      :alt="item.title"
                      class="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    >
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-2">
                        <h4 class="font-medium truncate">{{ item.title }}</h4>
                        <Badge :variant="item.status === 'resolved' ? 'secondary' : (item.type === 'found' ? 'secondary' : 'destructive')" class="text-xs">
                          {{ item.status === 'resolved' ? '已找回' : (item.type === 'found' ? '拾到' : '寻找') }}
                        </Badge>
                      </div>
                      <p class="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">{{ item.description }}</p>
                      <div class="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                        <div class="flex items-center gap-1">
                          <MapPin :size="12" />
                          {{ item.location }}
                        </div>
                        <div class="flex items-center gap-1">
                          <Calendar :size="12" />
                          {{ item.date }}
                        </div>
                        <div v-if="item.contact" class="flex items-center gap-1">
                          <Phone :size="12" />
                          {{ item.contact }}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  </div>
</template> 