<template>
  <!-- Popover 模式 (用于搜索筛选) -->
  <Popover v-if="mode === 'popover'" v-model:open="isPopoverOpen" @update:open="handlePopoverToggle">
    <PopoverTrigger asChild>
      <Button 
        variant="outline" 
        size="sm" 
        :class="modelValue ? 'bg-blue-50' : ''"
      >
        <MapPin :size="16" class="mr-2 icon-bg-fill" />
        {{ modelValue ? triggerSelectedText : triggerText }}
      </Button>
    </PopoverTrigger>
    <PopoverContent 
      :class="popoverContentClass"
      align="start"
      :side-offset="4"
    >
      <div class="space-y-0">
        <!-- 地图容器 -->
        <div 
          :id="mapContainerId" 
          ref="mapContainer"
          :class="mapContainerClass"
        >
          <MapLoadingOverlay v-if="mapLoading" :error="mapError" @retry="initMap" />
        </div>
        
        <!-- 底部操作区域 -->
        <div class="p-3">
          <div class="flex items-center justify-between">
            <div class="text-sm flex-1 mr-2">
              <div v-if="tempSelectedLocation" class="text-gray-600 dark:text-gray-300">
                {{ showCoordinates ? `纬度: ${tempSelectedLocation.lat.toFixed(6)} 经度: ${tempSelectedLocation.lng.toFixed(6)}` : '已选择位置' }}
              </div>
              <div v-else class="text-gray-500 dark:text-gray-400">
                {{ placeholder }}
              </div>
            </div>
            
            <div class="flex gap-2">
              <Button variant="outline" size="sm" @click="clearSelection">清除</Button>
              <Button size="sm" @click="confirmSelection" :disabled="!tempSelectedLocation">确认</Button>
            </div>
          </div>
        </div>
      </div>
    </PopoverContent>
  </Popover>

  <!-- Modal 模式 (用于发布页面) -->
  <div v-else-if="mode === 'modal'" v-show="isModalOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div :class="modalContentClass">
      <!-- 头部 -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ title || '选择位置' }}</h3>
        <Button @click="closeModal" variant="ghost" size="sm">
          <X :size="20" class="icon-bg-fill" />
        </Button>
      </div>
      
      <!-- 地图容器 -->
      <div class="flex-1 relative">
        <div 
          :id="mapContainerId" 
          ref="mapContainer"
          class="w-full h-full"
        >
          <MapLoadingOverlay v-if="mapLoading" :error="mapError" @retry="initMap" />
        </div>
      </div>
      
      <!-- 底部操作 -->
      <div class="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div v-if="tempSelectedLocation" class="mb-3">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">已选择位置：</p>
          <p class="font-medium text-gray-900 dark:text-gray-100">
            纬度: {{ tempSelectedLocation.lat.toFixed(6) }}, 经度: {{ tempSelectedLocation.lng.toFixed(6) }}
          </p>
        </div>
        <div v-else class="mb-3">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ placeholder }}</p>
        </div>
        
        <div class="flex gap-3">
          <Button @click="closeModal" variant="outline" class="flex-1">取消</Button>
          <Button @click="confirmSelection" :disabled="!tempSelectedLocation" class="flex-1">确认选择</Button>
        </div>
      </div>
    </div>
  </div>

  <!-- Inline 模式 (用于详情展示) -->
  <div v-else-if="mode === 'inline'" :class="inlineContainerClass">
    <div class="flex items-center justify-between mb-3" v-if="showHeader">
      <div class="flex items-center gap-2">
        <Map :size="18" class="icon-bg-fill" />
        <h4 class="font-medium text-gray-900 dark:text-gray-100">{{ title || '精确位置' }}</h4>
      </div>
      <Button @click="toggleInlineMap" variant="ghost" size="sm" class="p-1" v-if="collapsible">
        <X v-if="isInlineExpanded" :size="16" class="icon-bg-fill" />
        <Map v-else :size="16" class="icon-bg-fill" />
      </Button>
    </div>
    
    <div 
      v-show="isInlineExpanded"
      :id="mapContainerId" 
      ref="mapContainer"
      :class="inlineMapClass"
    >
      <MapLoadingOverlay v-if="mapLoading" :error="mapError" @retry="initMap" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { MapPin, X, Map } from 'lucide-vue-next'
import { MAP_CONFIG, loadTMapAPI, type LocationData } from '@/config/map'
import MapLoadingOverlay from '@/components/MapLoadingOverlay.vue'

export interface UnifiedMapPickerProps {
  // 组件模式
  mode: 'popover' | 'modal' | 'inline'
  
  // 双向绑定的位置数据
  modelValue?: LocationData | null
  
  // 组件状态控制
  open?: boolean  // 用于 modal 和 popover 模式
  
  // 显示配置
  title?: string
  placeholder?: string
  triggerText?: string
  triggerSelectedText?: string
  showCoordinates?: boolean
  showHeader?: boolean
  collapsible?: boolean
  
  // 样式配置
  size?: 'sm' | 'md' | 'lg' | 'xl'
  height?: string
  width?: string
  
  // 功能配置
  readonly?: boolean
  multiSelect?: boolean
  
  // 地图配置
  zoom?: number
  center?: LocationData
}

const props = withDefaults(defineProps<UnifiedMapPickerProps>(), {
  mode: 'popover',
  modelValue: null,
  open: false,
  title: '',
  placeholder: '请在地图上点击选择位置',
  triggerText: '位置筛选',
  triggerSelectedText: '已选定',
  showCoordinates: true,
  showHeader: true,
  collapsible: true,
  size: 'md',
  height: '',
  width: '',
  readonly: false,
  multiSelect: false,
  zoom: MAP_CONFIG.DEFAULT_ZOOM
})

const emit = defineEmits<{
  'update:modelValue': [value: LocationData | null]
  'update:open': [value: boolean]
  'select': [location: LocationData]
  'clear': []
  'close': []
}>()

// 地图相关状态
const mapContainer = ref<HTMLElement | null>(null)
const mapContainerId = ref<string>(`unified-map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
const mapLoading = ref(false)
const mapError = ref('')
const tempSelectedLocation = ref<LocationData | null>(null)

// 组件状态
const isPopoverOpen = ref(false)
const isModalOpen = ref(false)
const isInlineExpanded = ref(true)

// 地图实例
let map: any = null
let markerLayer: any = null

// 计算属性 - 样式类
const popoverContentClass = computed(() => {
  const sizeClasses = {
    sm: 'w-[300px]',
    md: 'w-[400px]',
    lg: 'w-[500px]',
    xl: 'w-[600px]'
  }
  return `${sizeClasses[props.size]} p-0`
})

const mapContainerClass = computed(() => {
  const sizeClasses = {
    sm: 'h-48',
    md: 'h-64',
    lg: 'h-80',
    xl: 'h-96'
  }
  const height = props.height || sizeClasses[props.size]
  return `${height} w-full border-b bg-gray-100 dark:bg-gray-700 relative overflow-hidden`
})

const modalContentClass = computed(() => {
  const sizeClasses = {
    sm: 'w-11/12 h-4/6 max-w-2xl',
    md: 'w-11/12 h-5/6 max-w-4xl',
    lg: 'w-11/12 h-5/6 max-w-6xl',
    xl: 'w-11/12 h-5/6 max-w-7xl'
  }
  return `bg-white dark:bg-gray-800 rounded-lg ${sizeClasses[props.size]} flex flex-col shadow-xl`
})

const inlineContainerClass = computed(() => {
  return 'space-y-3'
})

const inlineMapClass = computed(() => {
  const sizeClasses = {
    sm: 'h-64',
    md: 'h-80',
    lg: 'h-96',
    xl: 'h-[32rem]'
  }
  const height = props.height || sizeClasses[props.size]
  return `${height} w-full rounded-lg border border-gray-200 dark:border-gray-600 relative overflow-hidden`
})

// 监听器
watch(() => props.open, (newValue) => {
  if (props.mode === 'modal') {
    isModalOpen.value = newValue
    if (newValue) {
      openModal()
    }
  } else if (props.mode === 'popover') {
    isPopoverOpen.value = newValue
  }
})

watch(isModalOpen, (newValue) => {
  emit('update:open', newValue)
})

watch(isPopoverOpen, (newValue) => {
  emit('update:open', newValue)
})

// 地图初始化
const initMap = async () => {
  if (!mapContainer.value) {
    console.error('地图容器未找到')
    mapError.value = '地图容器未找到，请重试'
    return
  }

  // 检查容器尺寸
  if (mapContainer.value.offsetWidth === 0 || mapContainer.value.offsetHeight === 0) {
    console.warn('地图容器尺寸为0，等待容器渲染完成...')
    setTimeout(() => {
      initMap()
    }, 200)
    return
  }

  mapLoading.value = true
  mapError.value = ''

  try {
    // 清理之前的地图实例
    cleanupMap()

    // 加载腾讯地图API
    const TMap = await loadTMapAPI()

    // 设置地图中心点
    const center = props.center || MAP_CONFIG.CENTER
    const mapCenter = new TMap.LatLng(center.lat, center.lng)

    // 设置容器ID
    if (!mapContainer.value.id) {
      mapContainer.value.id = mapContainerId.value
    }

    // 初始化地图
    map = new TMap.Map(mapContainer.value, {
      center: mapCenter,
      zoom: props.zoom || MAP_CONFIG.DEFAULT_ZOOM
    })

    // 如果不是只读模式，添加点击事件
    if (!props.readonly) {
      map.on("click", handleMapClick)
    }

    // 如果有初始位置，显示标记
    if (props.modelValue) {
      createMarker(new TMap.LatLng(props.modelValue.lat, props.modelValue.lng))
      tempSelectedLocation.value = props.modelValue
    }

    mapLoading.value = false
    console.log('地图初始化成功')

  } catch (err) {
    console.error('地图初始化失败:', err)
    mapError.value = err instanceof Error ? err.message : '地图加载失败，请检查网络连接'
    mapLoading.value = false
  }
}

// 处理地图点击事件
const handleMapClick = (evt: any) => {
  if (props.readonly) return
  
  if (evt && evt.latLng) {
    const location: LocationData = {
      lat: evt.latLng.lat,
      lng: evt.latLng.lng
    }
    
    tempSelectedLocation.value = location
    createMarker(evt.latLng)
    
    // 如果是inline模式，直接确认选择
    if (props.mode === 'inline') {
      confirmSelection()
    }
  }
}

// 创建标记
const createMarker = (position: any) => {
  if (!map) return
  
  try {
    const TMap = window.TMap
    
    // 移除之前的标记
    removeMarker()
    
    markerLayer = new TMap.MultiMarker({
      id: `marker-layer-${mapContainerId.value}`,
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
        "id": `selected-marker-${mapContainerId.value}`,
        "styleId": 'marker',
        "position": position,
        "properties": {
          "title": "选择的位置"
        }
      }]
    })
    
    console.log('标记创建成功')
  } catch (e) {
    console.error('创建标记失败:', e)
  }
}

// 移除标记
const removeMarker = () => {
  if (markerLayer) {
    try {
      markerLayer.setMap(null)
      markerLayer = null
      console.log('标记移除成功')
    } catch (e) {
      console.error('移除标记失败:', e)
    }
  }
}

// 清理地图
const cleanupMap = () => {
  removeMarker()
  if (map) {
    try {
      map.destroy()
      console.log('地图实例销毁成功')
    } catch (e) {
      console.warn('销毁地图时出错:', e)
    }
    map = null
  }
}

// 事件处理
const handlePopoverToggle = (open: boolean) => {
  isPopoverOpen.value = open
  if (open) {
    tempSelectedLocation.value = props.modelValue
    nextTick(() => {
      setTimeout(() => {
        initMap()
      }, 100)
    })
  } else {
    cleanupMap()
  }
}

const openModal = () => {
  isModalOpen.value = true
  tempSelectedLocation.value = props.modelValue
  nextTick(() => {
    setTimeout(() => {
      initMap()
    }, 100)
  })
}

const closeModal = () => {
  isModalOpen.value = false
  cleanupMap()
  emit('close')
}

const toggleInlineMap = () => {
  isInlineExpanded.value = !isInlineExpanded.value
  if (isInlineExpanded.value) {
    nextTick(() => {
      setTimeout(() => {
        initMap()
      }, 100)
    })
  } else {
    cleanupMap()
  }
}

const confirmSelection = () => {
  if (tempSelectedLocation.value) {
    emit('update:modelValue', tempSelectedLocation.value)
    emit('select', tempSelectedLocation.value)
    
    if (props.mode === 'popover') {
      isPopoverOpen.value = false
    } else if (props.mode === 'modal') {
      closeModal()
    }
  }
}

const clearSelection = () => {
  tempSelectedLocation.value = null
  removeMarker()
  emit('update:modelValue', null)
  emit('clear')
  
  if (props.mode === 'popover') {
    isPopoverOpen.value = false
  }
}

// 公开方法
const showModal = () => {
  if (props.mode === 'modal') {
    openModal()
  }
}

const hideModal = () => {
  if (props.mode === 'modal') {
    closeModal()
  }
}

const refreshMap = () => {
  initMap()
}

// 生命周期
onMounted(() => {
  if (props.mode === 'inline' && isInlineExpanded.value) {
    nextTick(() => {
      setTimeout(() => {
        initMap()
      }, 100)
    })
  }
})

onBeforeUnmount(() => {
  cleanupMap()
})

// 暴露方法给父组件
defineExpose({
  showModal,
  hideModal,
  refreshMap,
  clearSelection
})
</script>

<style scoped>
/* 确保地图容器有正确的尺寸 */
.map-container {
  min-height: 200px;
  background: #f3f4f6;
}

/* 地图容器包装器 */
.map-wrapper {
  position: relative;
  overflow: hidden;
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .map-container {
    background: #374151;
  }
}
</style> 