<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { UserX, Mail, Phone, User as UserIcon, Edit, Check, X, Upload, MapPin, Calendar, Save } from 'lucide-vue-next'
import { isLoggedIn, currentUser, items, initializeAuth, getUserProfile, updateUserProfile, type Item, type User } from '@/stores/user'
import * as mockData from '@/data/mockData.json'
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
  if (!targetUser.value) return []
  return items.value.filter(item => item.userId === targetUser.value!.id)
})

const pageTitle = computed(() => {
  return isCurrentUser.value ? '个人中心' : `${targetUser.value?.name || '用户'} 的主页`
})

// 获取用户信息
const getUserInfo = async (userId?: number): Promise<User | null> => {
  // 如果是当前登录用户，直接返回当前用户信息
  if (userId && isLoggedIn.value && currentUser.value?.id === userId) {
    return currentUser.value
  }
  
  try {
    isLoading.value = true
    errorMessage.value = ''
    
    // 调用新的getUserProfile函数（支持可选userId）
    const result = await getUserProfile(userId)
    
    if (result.success && result.data) {
      // 如果是通过token获取的当前用户信息，更新本地状态
      if (!userId && isLoggedIn.value) {
        currentUser.value = result.data
        localStorage.setItem('user', JSON.stringify(result.data))
      }
      
      return result.data
    } else {
      errorMessage.value = result.message
      return null
    }
  } catch (error) {
    console.error('getUserInfo 异常:', error)
    errorMessage.value = '获取用户信息失败'
    return null
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  initializeAuth()
  
  const userId = route.query.id ? parseInt(route.query.id as string) : null
  
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
  } else {
    // 没有指定用户ID，如果已登录则跳转到当前用户页面
    if (!isLoggedIn.value) {
      router.push('/login')
      return
    }
    
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
    console.log('准备更新用户资料:', editForm.value)
    
    const updatedUser = await updateUserProfile(editForm.value)
    console.log('更新用户资料成功:', updatedUser)
    
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
    
    console.log('界面用户信息已更新:', targetUser.value)
    
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
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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
        <h3 class="text-lg font-medium text-gray-900 mb-2">正在加载用户信息...</h3>
        <p class="text-gray-600">请稍候</p>
      </div>
      
      <!-- 错误状态 -->
      <div v-else-if="errorMessage" class="max-w-4xl mx-auto text-center py-12">
        <div class="text-red-400 mb-4 text-4xl">❌</div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">获取用户信息失败</h3>
        <p class="text-gray-600 mb-4">{{ errorMessage }}</p>
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
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  邮箱
                </label>
                <Input v-model="targetUser.email" readonly  />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  电话号码
                </label>
                <Input v-model="targetUser.phoneNumber" readonly  />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  学号
                </label>
                <Input v-model="targetUser.studentId" readonly />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
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
                  <label class="block text-sm font-medium text-gray-700 mb-2">
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
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    邮箱
                  </label>
                  <Input 
                    v-model="editForm.email" 
                    type="email" 
                    placeholder="请输入邮箱地址" 
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    电话号码
                  </label>
                  <Input 
                    v-model="editForm.phoneNumber" 
                    placeholder="请输入电话号码" 
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    学号
                  </label>
                  <Input 
                    v-model="editForm.studentId" 
                    placeholder="请输入学号" 
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
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
              <h3 class="text-lg font-medium text-gray-900 mb-2">
                {{ isCurrentUser ? '还没有发布任何信息' : '该用户还没有发布任何信息' }}
              </h3>
              <p v-if="isCurrentUser" class="text-gray-600 mb-4">快去发布您的第一条失物招领信息吧！</p>
              <Button v-if="isCurrentUser" @click="router.push('/add')" size="sm">
                发布信息
              </Button>
            </div>
            
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card 
                v-for="item in userItems" 
                :key="item.id" 
                class="border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors cursor-pointer"
                @click="handleItemClick(item)"
              >
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
                      <p class="text-sm text-gray-600 line-clamp-2 mb-3">{{ item.description }}</p>
                      <div class="space-y-1 text-xs text-gray-500">
                        <div class="flex items-center gap-1">
                          <MapPin :size="12" />
                          {{ item.location }}
                        </div>
                        <div class="flex items-center gap-1">
                          <Calendar :size="12" />
                          {{ item.date }}
                        </div>
                        <div class="flex items-center gap-1">
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