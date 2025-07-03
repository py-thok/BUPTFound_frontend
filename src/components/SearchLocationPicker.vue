<template>
  <!-- 位置筛选器 -->
  <div class="flex items-center gap-2">
    <span class="text-sm font-medium"></span>
    <Popover v-model:open="isPopoverOpen" @update:open="handlePopoverToggle">
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          :class="modelValue ? 'bg-blue-50' : ''"
        >
          <MapPin class="h-4 w-4 mr-1" />
          {{ modelValue ? '已选定' : '位置筛选' }}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        class="w-[400px] p-0" 
        align="start"
        :side-offset="4"
      >
        <div class="space-y-0">
          
          <!-- 地图容器 - 填满上部分 -->
          <div 
            :id="mapContainerId" 
            ref="mapContainer"
            class="h-64 w-full border-b bg-gray-100 relative overflow-hidden"
            style="min-height: 256px;"
          >
            <!-- 地图加载状态遮罩 -->
            <div v-if="mapLoading" class="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
              <Loader2 class="h-8 w-8 animate-spin" />
              <span class="ml-2">地图加载中...</span>
            </div>
            
            <!-- 地图加载错误遮罩 -->
            <div v-else-if="mapError" class="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10 text-red-600">
              <span>{{ mapError }}</span>
            </div>
          </div>
          
          <!-- 底部操作区域 -->
          <div class="p-3">
            <div class="flex items-center justify-between">
              <!-- 左侧位置信息或提示 -->
              <div class="text-sm flex-1 mr-2">
                <div v-if="tempSelectedLocation" class="text-gray-600">
                  纬度: {{ tempSelectedLocation.lat.toFixed(6) }} 经度: {{ tempSelectedLocation.lng.toFixed(6) }}
                </div>
                <div v-else class="text-gray-500">
                  请在地图上点击选择位置
                </div>
              </div>
              
              <!-- 右侧操作按钮 -->
              <div class="flex gap-2">
                <Button variant="outline" size="sm" @click="clearLocationFilter">清除</Button>
                <Button size="sm" @click="confirmLocationSelection" :disabled="!tempSelectedLocation">确认</Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { MapPin, Loader2 } from 'lucide-vue-next'
import { MAP_CONFIG, loadTMapAPI, type LocationData } from '@/config/map'

interface Props {
  modelValue?: LocationData | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null
})

const emit = defineEmits<{
  'update:modelValue': [value: LocationData | null]
}>()

// 响应式状态
const isOpen = ref(false)
const isLoading = ref(false)
const error = ref(false)
const tempLocation = ref<LocationData | null>(null)

// 地图相关状态
const tempSelectedLocation = ref<LocationData | null>(null)
const mapContainerId = ref<string>(`search-map-${Date.now()}`)
const mapContainer = ref<HTMLElement | null>(null)
const mapLoading = ref(false)
const mapError = ref('')
const isPopoverOpen = ref(false)

// 地图实例
let map: any = null
let markerLayer: any = null

// 监听弹出框打开状态
watch(isOpen, (newValue) => {
  if (newValue) {
    initMap()
  }
})

// 方法
const confirmLocationSelection = () => {
  console.log('🗺️ 确认位置选择:', tempSelectedLocation.value)
  if (tempSelectedLocation.value) {
    emit('update:modelValue', tempSelectedLocation.value)
    // 手动关闭Popover
    isPopoverOpen.value = false
  }
}

const clearLocationFilter = () => {
  console.log('🗺️ 清除位置筛选')
  tempSelectedLocation.value = null
  emit('update:modelValue', null)
  // 关闭Popover
  isPopoverOpen.value = false
}

// 创建marker
const createMarker = (position: any) => {
  if (!map) return
  
  try {
    const TMap = window.TMap
    
    // 移除之前的marker
    removeMarker()
    
    markerLayer = new TMap.MultiMarker({
      id: 'search-marker-layer',
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
        "id": 'search-selected-marker',
        "styleId": 'marker',
        "position": position,
        "properties": {
          "title": "选择的位置"
        }
      }]
    })
    
    console.log('🗺️ Marker创建成功')
  } catch (e) {
    console.error('🗺️ 创建marker失败:', e)
  }
}

// 移除marker
const removeMarker = () => {
  if (markerLayer) {
    try {
      markerLayer.setMap(null)
      markerLayer = null
      console.log('🗺️ Marker移除成功')
    } catch (e) {
      console.error('🗺️ 移除marker失败:', e)
    }
  }
}

// 处理Popover开关
const handlePopoverToggle = (open: boolean) => {
  console.log('🗺️ Popover状态变化:', open ? '打开' : '关闭')
  isPopoverOpen.value = open
  if (open) {
    // 重置临时位置为当前选中的位置
    tempSelectedLocation.value = props.modelValue
    console.log('🗺️ 初始化临时位置:', tempSelectedLocation.value)
    // 延迟初始化地图，确保DOM已渲染和Popover完全展开
    nextTick(() => {
      setTimeout(() => {
        console.log('🗺️ 检查地图容器状态...')
        if (mapContainer.value) {
          console.log('🗺️ 地图容器已找到，开始初始化')
          initMap()
        } else {
          console.warn('🗺️ 地图容器仍未找到，再次延迟初始化')
          setTimeout(() => {
            initMap()
          }, 500)
        }
      }, 200)
    })
  } else {
    // 清理临时状态和地图
    console.log('🗺️ 清理临时状态')
    tempSelectedLocation.value = null
    mapLoading.value = false
    mapError.value = ''
    cleanupMap()
  }
}

// 清理地图
const cleanupMap = () => {
  console.log('🗺️ 开始清理地图')
  
  // 清理marker
  removeMarker()
  
  // 清理地图实例
  if (map) {
    try {
      map.destroy()
      console.log('🗺️ 地图实例销毁成功')
    } catch (e) {
      console.warn('🗺️ 销毁地图时出错:', e)
    }
    map = null
  }
}

// 初始化地图
const initMap = async () => {
  console.log('🗺️ 开始初始化地图...')
  
  if (!mapContainer.value) {
    console.error('🗺️ 地图容器未找到，容器ref:', mapContainer.value)
    mapError.value = '地图容器未找到，请重试'
    return
  }
  
  console.log('🗺️ 地图容器信息:', {
    element: mapContainer.value,
    id: mapContainer.value.id,
    offsetWidth: mapContainer.value.offsetWidth,
    offsetHeight: mapContainer.value.offsetHeight,
    parentElement: mapContainer.value.parentElement
  })
  
  // 确保容器有尺寸
  if (mapContainer.value.offsetWidth === 0 || mapContainer.value.offsetHeight === 0) {
    console.warn('🗺️ 地图容器尺寸为0，等待容器渲染完成...')
    mapError.value = '正在准备地图容器...'
    setTimeout(() => {
      initMap()
    }, 300)
    return
  }
  
  mapLoading.value = true
  mapError.value = ''
  
  try {
    // 清理之前的地图实例
    cleanupMap()
    
    console.log('🗺️ 开始加载腾讯地图API...')
    // 加载腾讯地图API
    const TMap = await loadTMapAPI()
    console.log('🗺️ 腾讯地图API加载成功:', TMap)
    
    // 设置中心点坐标
    const center = new TMap.LatLng(MAP_CONFIG.CENTER.lat, MAP_CONFIG.CENTER.lng)
    console.log('🗺️ 地图中心点:', center)
    
    // 确保容器有ID - 修复空值检查
    if (mapContainer.value && !mapContainer.value.id) {
      mapContainer.value.id = mapContainerId.value
      console.log('🗺️ 设置容器ID:', mapContainerId.value)
    }
    
    // 再次检查容器是否存在（防止异步过程中容器被销毁）
    if (!mapContainer.value) {
      console.error('🗺️ 地图容器在初始化过程中丢失')
      mapError.value = '地图容器初始化失败'
      return
    }
    
    // 初始化地图
    console.log('🗺️ 正在创建地图实例...')
    map = new TMap.Map(mapContainer.value, {
      center: center,
      zoom: MAP_CONFIG.DEFAULT_ZOOM,
      viewMode: '2D'
    })
    
    console.log('🗺️ 地图实例创建成功:', map)
    
    // 等待地图完全加载
    map.on('tilesloaded', () => {
      console.log('🗺️ 地图瓦片加载完成')
      mapLoading.value = false
    })
    
    // 如果有初始位置，添加标记
    if (tempSelectedLocation.value) {
      const initialPosition = new TMap.LatLng(tempSelectedLocation.value.lat, tempSelectedLocation.value.lng)
      createMarker(initialPosition)
      map.setCenter(initialPosition)
    }
    
    // 监听点击事件添加marker
    map.on("click", (evt: any) => {
      console.log('🗺️ 地图点击事件触发:', evt)
      
      if (evt && evt.latLng) {
        console.log('🗺️ 点击位置 - 纬度:', evt.latLng.lat, '经度:', evt.latLng.lng)
        
        // 创建新的marker
        createMarker(evt.latLng)
        
        // 保存选择的位置
        const lat = evt.latLng.lat
        const lng = evt.latLng.lng
        tempSelectedLocation.value = {
          lat,
          lng,
          address: `位置 (${lat.toFixed(4)}, ${lng.toFixed(4)})`
        }
        
        console.log('🗺️ 选择的位置已保存:', tempSelectedLocation.value)
      } else {
        console.error('🗺️ 点击事件数据无效:', evt)
      }
    })
    
    // 设置一个超时来确保地图加载完成
    setTimeout(() => {
      if (mapLoading.value) {
        mapLoading.value = false
        console.log('🗺️ 地图初始化超时完成')
      }
    }, 3000)
    
    console.log('🗺️ 地图初始化完全成功')
    
  } catch (error) {
    console.error('🗺️ 地图初始化失败:', error)
    mapError.value = error instanceof Error ? error.message : '地图加载失败，请检查网络连接'
    mapLoading.value = false
  }
}
</script>

<script lang="ts">
export default {
  name: 'SearchLocationPicker'
}
</script> 