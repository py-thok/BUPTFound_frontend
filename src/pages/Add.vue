<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Heart, LocateIcon, Upload, X } from 'lucide-vue-next'
import { isLoggedIn, initializeAuth, items, currentUser } from '@/stores/user'
import AppNavbar from '@/components/AppNavbar.vue'
import MapPicker from '@/components/MapPicker.vue'
import type { LocationData } from '@/config/map'

const router = useRouter()

const form = ref({
  type: '' as 'found' | 'lost' | '',
  title: '',
  description: '',
  location: '',
  contact: '',
  image: ''
})

// 精确定位相关状态
const preciseLocation = ref<LocationData | null>(null)
const showMapPicker = ref(false)
const isLocationSelected = ref(false)

// 图片上传相关状态
const imageFile = ref<File | null>(null)
const imagePreview = ref<string>('')
const uploadError = ref('')

// 精确定位功能
const openLocationPicker = () => {
  showMapPicker.value = true
}

// 处理地图选点结果 - 只保存位置信息，不填入地点
const handleLocationSelect = (location: LocationData) => {
  preciseLocation.value = location
  isLocationSelected.value = true
}

// 图片上传处理
const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  // 重置错误信息
  uploadError.value = ''
  
  // 检查文件类型
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!validTypes.includes(file.type)) {
    uploadError.value = '请选择有效的图片格式（JPEG、PNG、GIF、WebP）'
    target.value = ''
    return
  }
  
  // 检查文件大小（限制为5MB）
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    uploadError.value = '图片大小不能超过5MB'
    target.value = ''
    return
  }
  
  imageFile.value = file
  
  // 创建预览
  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = e.target?.result as string
    form.value.image = imagePreview.value
  }
  reader.readAsDataURL(file)
}

// 移除图片
const removeImage = () => {
  imageFile.value = null
  imagePreview.value = ''
  form.value.image = ''
  uploadError.value = ''
  
  // 清空文件输入
  const fileInput = document.getElementById('image-upload') as HTMLInputElement
  if (fileInput) {
    fileInput.value = ''
  }
}

onMounted(() => {
  initializeAuth()
  if (!isLoggedIn.value) {
    router.push('/login')
  }
})

const selectType = (type: 'found' | 'lost') => {
  form.value.type = type
}

const handleSubmit = () => {
  if (!form.value.type || !form.value.title || !form.value.description || 
      !form.value.location || !form.value.contact) {
    alert('请填写完整信息')
    return
  }

  // 如果没有上传图片，使用默认图片
  const finalImage = form.value.image || 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&h=200&fit=crop'

  const newItem = {
    id: Date.now(),
    title: form.value.title,
    description: form.value.description,
    type: form.value.type,
    location: form.value.location,
    contact: form.value.contact,
    date: new Date().toISOString().split('T')[0],
    image: finalImage,
    userId: currentUser.value?.id,
    preciseLocation: preciseLocation.value
  }

  items.value.unshift(newItem)
  alert('发布成功！')
  router.push('/')
}

const goBack = () => {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <!-- 导航栏 -->
    <AppNavbar 
      :page-title="'发布失物招领'"
      :current-page="'add'"
      :show-back-button="true"
      :is-scroll-navbar="false"
      :show-navbar="true"
    />

    <main class="container mx-auto px-4 py-8">
      <div class="max-w-2xl mx-auto">
        <div class="text-center mb-8">
          <h2 class="text-3xl font-bold text-gray-900 mb-4">发布失物招领</h2>
          <p class="text-gray-600">帮助物品找到它们的主人，让爱心传递下去</p>
        </div>
        
        <div class="bg-white rounded-lg shadow-sm p-8">
          <form @submit.prevent="handleSubmit" class="space-y-6">
            <!-- 信息类型选择 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-4">
                信息类型 *
              </label>
              <div class="grid grid-cols-2 gap-4">
                <Button 
                  type="button"
                  @click="selectType('found')"
                  :variant="form.type === 'found' ? 'default' : 'outline'" 
                  class="h-20 flex-col"
                >
                  <Search :size="24" class="mb-2" />
                  <span>拾到物品</span>
                </Button>
                <Button 
                  type="button"
                  @click="selectType('lost')"
                  :variant="form.type === 'lost' ? 'default' : 'outline'" 
                  class="h-20 flex-col"
                >
                  <Heart :size="24" class="mb-2" />
                  <span>寻找物品</span>
                </Button>
              </div>
            </div>
            
            <!-- 物品名称 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                物品名称 *
              </label>
              <Input 
                v-model="form.title"
                type="text" 
                placeholder="例如：黑色钱包、iPhone 14..."
                required
              />
            </div>
            
            <!-- 详细描述 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                详细描述 *
              </label>
              <textarea 
                v-model="form.description"
                rows="4"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请详细描述物品的特征、颜色、大小等信息..."
                required
              ></textarea>
            </div>
            
            <!-- 图片上传 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                物品图片
              </label>
              
              <!-- 图片预览区域 -->
              <div v-if="imagePreview" class="mb-4">
                <div class="relative inline-block">
                  <img 
                    :src="imagePreview" 
                    alt="预览图片" 
                    class="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                  />
                  <Button
                    type="button"
                    @click="removeImage"
                    variant="destructive"
                    size="sm"
                    class="absolute -top-2 -right-2 rounded-full w-6 h-6 p-0"
                  >
                    <X :size="14" />
                  </Button>
                </div>
              </div>
              
              <!-- 上传按钮 -->
              <div v-if="!imagePreview" class="relative border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <Upload :size="48" class="mx-auto text-gray-400 mb-4" />
                <p class="text-sm text-gray-600 mb-4">点击选择图片或拖拽到此处</p>
                <p class="text-xs text-gray-500 mb-4">支持 JPEG、PNG、GIF、WebP 格式，最大 5MB</p>
                <Button type="button" variant="outline" size="sm">
                  <Upload :size="16" class="mr-2" />
                  选择图片
                </Button>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  @change="handleImageUpload"
                  class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              </div>
              
              <!-- 错误信息 -->
              <p v-if="uploadError" class="text-red-600 text-sm mt-2">
                {{ uploadError }}
              </p>
              
              <!-- 重新上传按钮 -->
              <div v-if="imagePreview" class="mt-4">
                <Button type="button" variant="outline" size="sm" class="relative overflow-hidden">
                  <Upload :size="16" class="mr-2" />
                  重新选择
                  <input
                    type="file"
                    accept="image/*"
                    @change="handleImageUpload"
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                </Button>
              </div>
            </div>
            
            <!-- 地点和联系方式 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  地点 *
                </label>
                <div class="relative">
                  <Input 
                    v-model="form.location"
                    type="text" 
                    placeholder="图书馆、食堂..."
                    required
                  />
                  <!-- 精确定位按钮 -->
                  <Button
                    type="button"
                    @click="openLocationPicker"
                    variant="ghost"
                    size="sm"
                    class="absolute right-2 top-1/2 transform -translate-y-1/2 p-1"
                    :class="isLocationSelected ? 'text-blue-600' : 'text-gray-600'"
                  >
                    <LocateIcon :size="16" />
                  </Button>
                </div>
                <p v-if="isLocationSelected" class="text-xs text-blue-600 mt-1">
                   已选择精确位置
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  联系方式 *
                </label>
                <Input 
                  v-model="form.contact"
                  type="tel" 
                  placeholder="手机号码"
                  required
                />
              </div>
            </div>
            
            <!-- 提交按钮 -->
            <div class="flex gap-4">
              <Button type="button" @click="goBack" variant="outline" class="flex-1">
                取消
              </Button>
              <Button type="submit" class="flex-1">
                 发布信息
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>

    <!-- 地图选点组件 -->
    <MapPicker
      v-model:visible="showMapPicker"
      @select="handleLocationSelect"
    />
  </div>
</template>

<style scoped>
/* 上传区域的相对定位 */
.relative input[type="file"] {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 10;
}

/* 确保上传区域不影响其他元素 */
.relative {
  position: relative;
  overflow: hidden;
}
</style>
