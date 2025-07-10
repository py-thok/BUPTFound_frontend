<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Heart, Upload, MapPin, ArrowLeft } from 'lucide-vue-next'
import { isLoggedIn, initializeAuth } from '@/stores/user'
import { createItem, updateItem, getItemById, type CreateItemRequest } from '@/stores/items'
import { MAP_CONFIG, loadTMapAPI, type LocationData } from '@/config/map'
import AppNavbar from '@/components/AppNavbar.vue'

const router = useRouter()
const route = useRoute()

// 编辑模式相关状态
const isEditMode = ref(false)
const editItemId = ref<number | null>(null)
const isLoadingItem = ref(false)

// 表单数据
const form = ref({
  type: '' as 'found' | 'lost' | '',
  title: '',
  description: '',
  site: '', // 地点名称（如图书馆、食堂等）
  image: '', // 图片预览URL
  imageFile: null as File | null, // 实际上传的文件
  location: null as LocationData | null, // 精确位置的经纬度
  status: 'active' as 'active' | 'resolved' // 物品状态
})

// 状态管理
const isSubmitting = ref(false)

// 地图相关
const showLocationPicker = ref(false)
const mapContainer = ref<HTMLDivElement>()
const isMapLoading = ref(false)
const mapError = ref('')
let map: any = null
let marker: any = null

// 计算属性
const isFormValid = computed(() => {
  return form.value.type && 
         form.value.title.trim() && 
         form.value.description.trim() && 
         form.value.site.trim()
})

const pageTitle = computed(() => {
  if (isEditMode.value) {
    return '修改失物招领信息'
  }
  return '发布失物招领信息'
})

const submitButtonText = computed(() => {
  if (isSubmitting.value) {
    return isEditMode.value ? '修改中...' : '发布中...'
  }
  return isEditMode.value ? '保存修改' : '发布信息'
})

// 加载物品数据用于编辑
const loadItemForEdit = async (itemId: number) => {
  isLoadingItem.value = true
  try {
    console.log('加载物品数据用于编辑:', itemId)
    const result = await getItemById(itemId)
    
    if (result.success && result.data) {
      const item = result.data
      console.log('获取到的物品数据:', item)
      
      // 填充表单数据
      form.value = {
        type: item.type as 'found' | 'lost',
        title: item.title,
        description: item.description,
        site: item.site || '',
        image: item.image || '',
        imageFile: null, // 编辑时不需要重新上传文件，除非用户选择了新图片
        location: null, // 暂时不处理精确位置的编辑
        status: item.status || 'active' // 加载物品状态
      }
      
      // 如果有location数据，直接使用
      if (item.location && typeof item.location === 'object' && 'lat' in item.location && 'lng' in item.location) {
        form.value.location = {
          lat: item.location.lat,
          lng: item.location.lng
        }
        console.log('使用location数据:', form.value.location)
      }
      
      console.log('表单数据已填充:', form.value)
    } else {
      alert(`加载物品信息失败：${result.message}`)
      router.push('/')
    }
  } catch (error) {
    console.error('加载物品数据异常:', error)
    alert('加载物品信息失败，请稍后重试')
    router.push('/')
  } finally {
    isLoadingItem.value = false
  }
}

// 表单验证
const validateForm = () => {
  if (!form.value.type) {
    alert('请选择信息类型')
    return false
  }
  if (!form.value.title.trim()) {
    alert('请输入物品名称')
    return false
  }
  if (!form.value.description.trim()) {
    alert('请输入物品描述')
    return false
  }
  if (!form.value.site.trim()) {
    alert('请输入地点')
    return false
  }
  return true
}

// 选择信息类型
const selectType = (type: 'found' | 'lost') => {
  form.value.type = type
}

// 选择状态
const selectStatus = (status: 'active' | 'resolved') => {
  form.value.status = status
}

// 处理图片上传 - 与头像上传逻辑一致
const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (file) {
    form.value.imageFile = file
    
    const reader = new FileReader()
    reader.onload = (e) => {
      form.value.image = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

// 触发文件选择
const triggerImageUpload = () => {
  const fileInput = document.getElementById('image-upload') as HTMLInputElement
  fileInput?.click()
}

// 提交表单
const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }
  
  if (!isLoggedIn.value) {
    alert('请先登录')
    router.push('/login')
    return
  }

  isSubmitting.value = true
  
  try {
    // 准备API请求数据
    const itemData: CreateItemRequest = {
      name: form.value.title,
      description: form.value.description,
      eventTime: new Date().toISOString(), // 使用当前时间
      location: form.value.location ? `${form.value.location.lat.toFixed(6)},${form.value.location.lng.toFixed(6)}` : '', // 精确到6位小数
      type: form.value.type.toUpperCase() as 'FOUND' | 'LOST',
      site: form.value.site,
      image: form.value.imageFile
    }
    
    // 只在编辑模式时添加status参数
    if (isEditMode.value) {
      itemData.status = form.value.status === 'resolved' ? 'RESOLVED' : 'ACTIVE'
    }
    
    console.log('准备提交数据:', itemData)
    
    let result
    if (isEditMode.value && editItemId.value) {
      // 更新模式
      result = await updateItem(editItemId.value, itemData)
      console.log('更新结果:', result)
    } else {
      // 创建模式
      result = await createItem(itemData)
      console.log('创建结果:', result)
    }
    
    if (result.success) {
      alert(isEditMode.value ? '修改成功！' : '发布成功！')
      
      // 重置表单
      form.value = {
        type: '',
        title: '',
        description: '',
        site: '',
        image: '',
        imageFile: null,
        location: null,
        status: 'active'
      }
      
      // 跳转到首页
      router.push('/')
    } else {
      alert(`${isEditMode.value ? '修改' : '发布'}失败: ${result.message}`)
    }
  } catch (error) {
    console.error(`${isEditMode.value ? '修改' : '发布'}异常:`, error)
    alert(`${isEditMode.value ? '修改' : '发布'}失败，请稍后重试`)
  } finally {
    isSubmitting.value = false
  }
}

// 初始化地图
const initLocationPicker = async () => {
  if (!mapContainer.value) return
  
  isMapLoading.value = true
  mapError.value = ''
  
  try {
    await loadTMapAPI()
    
    // 初始化地图 - 使用正确的TMap API
    map = new window.TMap.Map(mapContainer.value, {
      center: new window.TMap.LatLng(MAP_CONFIG.CENTER.lat, MAP_CONFIG.CENTER.lng),
      zoom: MAP_CONFIG.DEFAULT_ZOOM
    })
    
    // 添加点击事件
    map.on('click', (evt: any) => {
      const latLng = evt.latLng
      
      // 更新精确位置
      form.value.location = {
        lat: latLng.lat,
        lng: latLng.lng
      }
      
      // 移除之前的标记
      if (marker) {
        marker.setMap(null)
      }
      
      // 添加新标记
      marker = new window.TMap.MultiMarker({
        map: map,
        geometries: [{
          id: 'selected-location',
          position: latLng
        }]
      })
      
      console.log('选择的位置:', form.value.location)
    })
    
  } catch (error) {
    console.error('地图初始化失败:', error)
    mapError.value = '地图加载失败，请稍后重试'
  } finally {
    isMapLoading.value = false
  }
}

// 显示位置选择器
const showLocationSelector = async () => {
  showLocationPicker.value = true
  
  // 等待DOM更新
  await new Promise(resolve => setTimeout(resolve, 100))
  
  await initLocationPicker()
}

// 确认位置选择
const confirmLocation = () => {
  if (form.value.location) {
    showLocationPicker.value = false
    alert('位置选择成功！')
  } else {
    alert('请在地图上点击选择位置')
  }
}

// 取消位置选择
const cancelLocationPicker = () => {
  showLocationPicker.value = false
  form.value.location = null
  if (marker) {
    marker.setMap(null)
    marker = null
  }
}

const goBack = () => {
  router.push('/')
}

// 初始化
onMounted(async () => {
  console.log('Add页面加载，检查用户登录状态')
  
  // 初始化认证状态
  await initializeAuth()
  
  // 检查登录状态
  if (!isLoggedIn.value) {
    console.log('用户未登录，跳转到登录页')
    alert('请先登录')
    router.push('/login')
    return
  }
  
  // 检查是否为编辑模式
  const editId = route.query.edit as string
  if (editId) {
    const itemId = parseInt(editId)
    if (!isNaN(itemId)) {
      console.log('进入编辑模式，物品ID:', itemId)
      isEditMode.value = true
      editItemId.value = itemId
      
      // 加载物品数据
      await loadItemForEdit(itemId)
    } else {
      console.error('无效的编辑ID:', editId)
      alert('无效的编辑参数')
      router.push('/')
    }
  } else {
    console.log('进入新建模式')
    isEditMode.value = false
    editItemId.value = null
  }
  
  console.log('用户已登录，页面初始化完成')
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
    <!-- 导航栏 -->
    <AppNavbar 
      :page-title="pageTitle"
      :current-page="'add'"
      :show-back-button="true"
      :is-scroll-navbar="false"
      :show-navbar="true"
    />

    <!-- 主要内容 -->
    <main class="container mx-auto px-4 py-8">
      <div class="max-w-2xl mx-auto">
        <Card class="shadow-lg border-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
          <CardHeader class="text-center border-b border-gray-200 dark:border-gray-700">
            <CardTitle class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {{ isEditMode ? '修改失物招领信息' : '发布失物招领信息' }}
            </CardTitle>
            <p class="text-gray-600 dark:text-gray-300 mt-2">
              {{ isEditMode ? '更新物品信息，帮助更快找到失主' : '帮助物品找到它们的主人，让爱心传递下去' }}
            </p>
          </CardHeader>
          
          <CardContent class="p-8">
            <form @submit.prevent="handleSubmit" class="space-y-6">
              <!-- 信息类型选择 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  信息类型 *
                </label>
                <div class="grid grid-cols-2 gap-4">
                  <Button 
                    type="button"
                    @click="selectType('found')"
                    :variant="form.type === 'found' ? 'default' : 'outline'" 
                    class="h-20 flex-col"
                  >
                    <Search :size="24" class="mb-2 icon-bg-fill" />
                    <span>拾到物品</span>
                  </Button>
                  <Button 
                    type="button"
                    @click="selectType('lost')"
                    :variant="form.type === 'lost' ? 'default' : 'outline'" 
                    class="h-20 flex-col"
                  >
                    <Heart :size="24" class="mb-2 icon-bg-fill" />
                    <span>寻找物品</span>
                  </Button>
                </div>
              </div>
              
              <!-- 状态选择（仅编辑模式显示） -->
              <div v-if="isEditMode">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  状态 *
                </label>
                <div class="grid grid-cols-2 gap-4">
                  <Button 
                    type="button"
                    @click="selectStatus('active')"
                    :variant="form.status === 'active' ? 'default' : 'outline'" 
                    class="h-16 flex-col"
                  >
                    <Search :size="20" class="mb-1 icon-bg-fill" />
                    <span>进行中</span>
                  </Button>
                  <Button 
                    type="button"
                    @click="selectStatus('resolved')"
                    :variant="form.status === 'resolved' ? 'default' : 'outline'" 
                    class="h-16 flex-col"
                  >
                    <Heart :size="20" class="mb-1 icon-bg-fill" />
                    <span>已找回</span>
                  </Button>
                </div>
              </div>
              
              <!-- 物品名称和地点并排 -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- 物品名称 -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    物品名称 *
                  </label>
                  <Input 
                    v-model="form.title"
                    type="text" 
                    placeholder="例如：黑色钱包、iPhone 14..."
                    required
                  />
                </div>
                
                <!-- 地点信息 -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    地点 *
                  </label>
                  <div class="relative">
                    <Input 
                      v-model="form.site"
                      type="text" 
                      placeholder="例如：图书馆、宿舍区..."
                      required
                    />
                    <Button
                      type="button"
                      @click="showLocationSelector"
                      variant="ghost"
                      size="sm"
                      class="absolute right-2 top-1/2 transform -translate-y-1/2 p-1"
                      :class="form.location ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'"
                    >
                      <MapPin :size="16" class="mr-2 icon-bg-fill" />
                    </Button>
                  </div>
                  <p v-if="form.location" class="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    已选择精确位置 ({{ form.location.lat.toFixed(6) }}, {{ form.location.lng.toFixed(6) }})
                  </p>

                </div>
              </div>
              
              <!-- 详细描述 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  详细描述 *
                </label>
                <Textarea 
                  v-model="form.description"
                  placeholder="请详细描述物品的特征、颜色、大小等信息，这有助于物主识别..."
                  rows="4"
                  required
                />
              </div>
              
              <!-- 图片上传 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  图片上传
                </label>
                
                <!-- 图片预览 -->
                <div v-if="form.image" class="mb-4">
                  <img 
                    :src="form.image" 
                    alt="预览图片" 
                    class="w-32 h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                  />
                </div>
                
                <!-- 上传按钮 -->
                <div>
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    @change="handleImageUpload"
                    class="hidden"
                  />
                  <Button
                    type="button"
                    @click="triggerImageUpload"
                    variant="outline"
                    size="sm"
                  >
                    <Upload :size="20" class="mr-2 icon-bg-fill" />
                    {{ form.image ? '重新选择图片' : '选择图片' }}
                  </Button>
                </div>
              </div>
              
              <!-- 提交按钮 -->
              <div class="flex gap-4 pt-6">
                <Button type="button" @click="goBack" variant="outline" class="flex-1">
                  <ArrowLeft :size="24" class="mr-2 icon-bg-fill" />
                  取消
                </Button>
                <Button 
                  type="submit" 
                  class="flex-1" 
                  :disabled="!isFormValid || isSubmitting"
                >
                  {{ submitButtonText }}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>

    <!-- 地图选择器弹窗 -->
    <div v-if="showLocationPicker" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl h-96 flex flex-col">
        <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">选择精确位置</h3>
          <Button @click="cancelLocationPicker" variant="ghost" size="sm">
            ×
          </Button>
        </div>
        
        <div class="flex-1 relative">
          <div v-if="isMapLoading" class="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
            <div class="text-center">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p class="text-gray-600 dark:text-gray-300">正在加载地图...</p>
            </div>
          </div>
          
          <div v-if="mapError" class="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
            <div class="text-center">
              <p class="text-red-600 dark:text-red-400 mb-2">{{ mapError }}</p>
              <Button @click="initLocationPicker" variant="outline" size="sm">重试</Button>
            </div>
          </div>
          
          <div ref="mapContainer" class="w-full h-full"></div>
        </div>
        
        <div class="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <p class="text-sm text-gray-600 dark:text-gray-300 self-center">
            {{ form.location ? '已选择位置' : '请在地图上点击选择位置' }}
          </p>
          <div class="flex gap-2">
            <Button @click="cancelLocationPicker" variant="outline" size="sm">
              取消
            </Button>
            <Button @click="confirmLocation" :disabled="!form.location" size="sm">
              确认
            </Button>
          </div>
        </div>
      </div>
    </div>
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

/* Lucide图标填充色与父容器背景一致的样式 */
.icon-bg-fill {
  fill: var(--bg-color, currentColor);
}
</style>
