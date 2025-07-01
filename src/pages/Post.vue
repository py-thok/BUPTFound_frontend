<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { 
  MapPin, 
  Calendar, 
  Phone, 
  User as UserIcon,
  Clock,
  Send,
  Heart,
  MessageCircle,
  Map,
  X,
  MessageSquare
} from 'lucide-vue-next'
import { items, isLoggedIn, currentUser, initializeAuth, type Item } from '@/stores/user'
import AppNavbar from '@/components/AppNavbar.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { MAP_CONFIG, loadTMapAPI, type LocationData } from '@/config/map'

const route = useRoute()
const router = useRouter()

// 状态管理
const post = ref<Item | null>(null)

// 地图相关状态
const showMap = ref(false)
const mapContainer = ref<HTMLDivElement>()
const isMapLoading = ref(false)
const mapError = ref('')
let map: any = null
let marker: any = null

// 处理用户头像点击
const handleUserClick = () => {
  if (!post.value?.userId) return
  
  // 统一使用 /user?id= 格式
  router.push(`/user?id=${post.value.userId}`)
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

// 私信发布者
const sendMessage = () => {
  if (!post.value || !post.value.userId) return
  
  router.push(`/message?userId=${post.value.userId}&userName=${post.value.userName}&userAvatar=${encodeURIComponent(post.value.userAvatar || '')}&itemId=${post.value.id}&itemName=${encodeURIComponent(post.value.title)}`)
}

// 获取帖子数据
const getPost = (): Item | null => {
  const postId = parseInt(route.params.id as string)
  return items.value.find(item => item.id === postId) || null
}

// 计算属性
const postExists = computed(() => !!post.value)

// 显示地图
const showLocationMap = async () => {
  if (!post.value?.preciseLocation) {
    mapError.value = '该帖子没有精确位置信息'
    return
  }
  
  // 切换地图显示状态
  if (showMap.value) {
    // 如果地图已显示，则收回
    closeMap()
    return
  }
  
  showMap.value = true
  
  // 等待DOM更新
  await new Promise(resolve => setTimeout(resolve, 100))
  
  await initLocationMap()
}

// 初始化地图
const initLocationMap = async () => {
  if (!mapContainer.value || !post.value?.preciseLocation) return
  
  isMapLoading.value = true
  mapError.value = ''
  
  try {
    // 清理之前的地图实例
    if (map) {
      try {
        map.destroy()
      } catch (e) {
        console.warn('销毁地图时出错:', e)
      }
      map = null
      marker = null
    }
    
    // 加载腾讯地图API
    const TMap = await loadTMapAPI()
    
    const location = post.value.preciseLocation
    const center = new TMap.LatLng(location.lat, location.lng)
    
    // 初始化地图
    map = new TMap.Map(mapContainer.value, {
      center: center,
      zoom: 16 // 更高的缩放级别以显示详细位置
    })
    
    // 添加标记
    marker = new TMap.MultiMarker({
      id: 'location-marker',
      map: map,
      styles: {
        "marker": new TMap.MarkerStyle({
          "width": 25,
          "height": 35,
          "anchor": { x: 16, y: 32 },
          "src": 'https://mapapi.qq.com/web/lbs/javascriptGL/demo/img/markerDefault.png'
        })
      },
      geometries: [{
        "id": "location",
        "styleId": "marker",
        "position": center,
        "properties": {
          "title": post.value.title
        }
      }]
    })
    
    isMapLoading.value = false
    console.log('位置地图初始化成功')
    
  } catch (err) {
    console.error('位置地图初始化失败:', err)
    mapError.value = err instanceof Error ? err.message : '地图加载失败'
    isMapLoading.value = false
  }
}

// 关闭地图
const closeMap = () => {
  showMap.value = false
  if (map) {
    try {
      map.destroy()
    } catch (e) {
      console.warn('销毁地图时出错:', e)
    }
    map = null
    marker = null
  }
}

onMounted(() => {
  initializeAuth()
  post.value = getPost()
  
  if (!post.value) {
    router.push('/404')
    return
  }
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <!-- 导航栏 -->
    <AppNavbar 
      :page-title="'失物详情'"
      :current-page="'post'"
      :show-back-button="true"
      :is-scroll-navbar="false"
      :show-navbar="true"
    />

    <!-- 主要内容 -->
    <div class="container mx-auto px-4 py-8 max-w-4xl" v-if="postExists">
      <!-- 帖子详情卡片 -->
      <Card class="mb-8">
        <!-- 帖子内容 -->
        <CardContent class="pt-6">
          <!-- 标题和物品类型 -->
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-bold text-gray-900 flex-1">{{ post?.title }}</h2>
            <Badge :variant="post?.status === 'resolved' ? 'secondary' : (post?.type === 'found' ? 'default' : 'destructive')" class="text-sm ml-4">
              {{ post?.status === 'resolved' ? '已找回' : (post?.type === 'found' ? '拾到物品' : '寻找物品') }}
            </Badge>
          </div>
          
          <!-- 物品图片 -->
          <div class="mb-6">
            <img 
              :src="post?.image" 
              :alt="post?.title"
              class="w-full h-64 md:h-80 object-cover rounded-lg shadow-md"
            >
          </div>
          
          <!-- 用户信息和操作按钮 -->
          <div class="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div class="flex items-center gap-3">
              <UserAvatar 
                :userId="post?.userId"
                :name="post?.userName"
                :avatar="post?.userAvatar"
                size="sm"
              />
              
              <div class="flex flex-col">
                <div class="font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors" @click="handleUserClick()">{{ post?.userName || '匿名用户' }}</div>
                <div class="flex items-center gap-2 text-sm text-gray-500">
                  <Clock :size="14" />
                  <span>{{ formatTime(post?.createdAt || post?.date || '') }}</span>
                </div>
              </div>
            </div>
            <!-- 操作按钮 -->
            <div class="flex gap-3">
              <Button @click="sendMessage">
                <MessageSquare :size="16" class="mr-2" />
                私信
              </Button>
            </div>
          </div>
          
          <!-- 详细描述 -->
          <div class="mb-6">
            <h3 class="font-semibold text-gray-900 mb-2">详细描述</h3>
            <p class="text-gray-700 leading-relaxed whitespace-pre-wrap">{{ post?.description }}</p>
          </div>
          
          <!-- 详细信息 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div class="space-y-3">
              <div class="flex items-center gap-3 text-gray-600">
                <MapPin :size="18" class="text-gray-400" />
                <span class="font-medium">位置:</span>
                <span>{{ post?.location }}</span>
                <!-- 查看精确位置按钮 -->
                <Button 
                  v-if="post?.preciseLocation"
                  @click="showLocationMap"
                  :variant="showMap ? 'default' : 'outline'" 
                  size="sm"
                  class="ml-2 h-7 px-2"
                >
                  <Map :size="14" class="mr-1" />
                  {{ showMap ? '收起位置' : '查看精确位置' }}
                </Button>
              </div>
            </div>
            <div class="space-y-3">
              <div class="flex items-center gap-3 text-gray-600">
                <Phone :size="18" class="text-gray-400" />
                <span class="font-medium">联系方式:</span>
                <span>{{ post?.contact }}</span>
              </div>
            </div>
          </div>
          
          <!-- 精确位置地图 -->
          <div v-if="showMap" class="mb-6 border-t pt-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold text-gray-900 flex items-center gap-2">
                <Map :size="18" />
                精确位置
              </h3>
              <Button @click="closeMap" variant="ghost" size="sm" class="p-1">
                <X :size="16" />
              </Button>
            </div>
            
            <!-- 位置信息 -->
            <div v-if="post?.preciseLocation" class="mb-4 text-sm text-gray-600">
              <p>纬度: {{ post.preciseLocation.lat.toFixed(6) }}, 经度: {{ post.preciseLocation.lng.toFixed(6) }}</p>
            </div>
            
            <!-- 地图容器 -->
            <div class="relative">
              <div ref="mapContainer" class="w-full h-80 rounded-lg border border-gray-200"></div>
              
              <!-- 加载状态 -->
              <div v-if="isMapLoading" class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
                <div class="text-center">
                  <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p class="text-gray-600">正在加载地图...</p>
                </div>
              </div>
              
              <!-- 错误状态 -->
              <div v-if="mapError" class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
                <div class="text-center text-red-600">
                  <p class="mb-2">地图加载失败</p>
                  <p class="text-sm">{{ mapError }}</p>
                  <Button 
                    @click="initLocationMap"
                    variant="outline"
                    size="sm"
                    class="mt-2"
                  >
                    重新加载
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- 404状态 -->
    <div v-else class="container mx-auto px-4 py-16 text-center">
      <div class="max-w-md mx-auto">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">帖子不存在</h2>
        <p class="text-gray-600 mb-6">抱歉，您访问的帖子可能已被删除或不存在。</p>
        <Button @click="router.push('/')" variant="outline">
          返回首页
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 确保长文本能够正确换行 */
.whitespace-pre-wrap {
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style> 