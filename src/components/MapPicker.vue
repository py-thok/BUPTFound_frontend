<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg w-11/12 h-5/6 max-w-4xl flex flex-col">
      <!-- 头部 -->
      <div class="flex items-center justify-between p-4 border-b">
        <h3 class="text-lg font-semibold text-gray-900">选择位置</h3>
        <button 
          @click="close"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X :size="24" />
        </button>
      </div>
      
      <!-- 地图容器 -->
      <div class="flex-1 relative map-wrapper">
        <div ref="mapContainer" class="w-full h-full map-container" :id="mapContainerId"></div>
        
        <!-- 加载状态 -->
        <div v-if="isLoading" class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p class="text-gray-600">正在加载地图...</p>
          </div>
        </div>
        
        <!-- 错误状态 -->
        <div v-if="error" class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div class="text-center text-red-600">
            <p class="mb-2">地图加载失败</p>
            <p class="text-sm">{{ error }}</p>
            <button 
              @click="initMap"
              class="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              重新加载
            </button>
          </div>
        </div>
      </div>
      
      <!-- 底部信息和操作 -->
      <div class="p-4 border-t bg-gray-50">
        <div v-if="selectedLocation" class="mb-3">
          <p class="text-sm text-gray-600 mb-1">已选择位置：</p>
          <p class="font-medium text-gray-900">
            纬度: {{ selectedLocation.lat.toFixed(6) }}, 经度: {{ selectedLocation.lng.toFixed(6) }}
          </p>
        </div>
        <div v-else class="mb-3">
          <p class="text-sm text-gray-500">请在地图上点击选择位置</p>
        </div>
        
        <div class="flex gap-3">
          <button 
            @click="close"
            class="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button 
            @click="confirm"
            :disabled="!selectedLocation"
            class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            确认选择
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue';
import { X } from 'lucide-vue-next';
import { MAP_CONFIG, loadTMapAPI, type LocationData } from '@/config/map';

interface Props {
  visible: boolean;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'select', location: LocationData): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const mapContainer = ref<HTMLDivElement>();
const isLoading = ref(false);
const error = ref('');
const selectedLocation = ref<LocationData | null>(null);
const mapContainerId = `map-container-${Date.now()}`; // 生成唯一ID
let map: any = null;
let markerLayer: any = null;

const isVisible = computed(() => props.visible);

// 监听弹窗显示状态
watch(isVisible, async (visible) => {
  if (visible) {
    await nextTick();
    await initMap();
  }
});

// 初始化地图
const initMap = async () => {
  if (!mapContainer.value) return;
  
  isLoading.value = true;
  error.value = '';
  selectedLocation.value = null;
  
  try {
    // 清理之前的地图实例
    if (map) {
      try {
        map.destroy();
      } catch (e) {
        console.warn('销毁地图时出错:', e);
      }
      map = null;
      markerLayer = null;
    }
    
    // 加载腾讯地图API
    const TMap = await loadTMapAPI();
    
    console.log('TMap API加载成功:', TMap);
    
    // 设置中心点坐标
    const center = new TMap.LatLng(MAP_CONFIG.CENTER.lat, MAP_CONFIG.CENTER.lng);
    console.log('地图中心点:', center);
    
    // 初始化地图
    map = new TMap.Map(mapContainer.value, {
      center: center,
      zoom: MAP_CONFIG.DEFAULT_ZOOM
    });
    
    console.log('地图实例创建成功:', map);
    
    // 监听点击事件添加marker
    map.on("click", (evt: any) => {
      console.log('地图点击事件触发:', evt);
      
      if (evt && evt.latLng) {
        console.log('点击位置 - 纬度:', evt.latLng.lat, '经度:', evt.latLng.lng);
        
        // 移除之前的marker（如果存在）
        removeMarker();
        
        // 创建新的marker
        createMarker(evt.latLng);
        
        // 保存选择的位置
        selectedLocation.value = {
          lat: evt.latLng.lat,
          lng: evt.latLng.lng
        };
        
        console.log('选择的位置已保存:', selectedLocation.value);
      } else {
        console.error('点击事件数据无效:', evt);
      }
    });
    
    isLoading.value = false;
    console.log('地图初始化完全成功');
    
  } catch (err) {
    console.error('地图初始化失败:', err);
    error.value = err instanceof Error ? err.message : '地图加载失败，请检查网络连接';
    isLoading.value = false;
  }
};

// 创建marker
const createMarker = (position: any) => {
  if (!map) return;
  
  try {
    const TMap = window.TMap;
    
    markerLayer = new TMap.MultiMarker({
      id: 'marker-layer',
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
        "id": 'selected-marker',
        "styleId": 'marker',
        "position": position,
        "properties": {
          "title": "选择的位置"
        }
      }]
    });
    
    console.log('Marker创建成功');
  } catch (e) {
    console.error('创建marker失败:', e);
  }
};

// 移除marker
const removeMarker = () => {
  if (markerLayer) {
    try {
      markerLayer.setMap(null);
      markerLayer = null;
      console.log('Marker移除成功');
    } catch (e) {
      console.error('移除marker失败:', e);
    }
  }
};

// 关闭弹窗
const close = () => {
  emit('update:visible', false);
  selectedLocation.value = null;
  
  // 清理marker
  removeMarker();
  
  // 清理地图
  if (map) {
    try {
      map.destroy();
    } catch (err) {
      console.warn('地图销毁时出错:', err);
    }
    map = null;
    markerLayer = null;
  }
};

// 确认选择
const confirm = () => {
  if (selectedLocation.value) {
    emit('select', selectedLocation.value);
    close();
  }
};
</script>

<style scoped>
/* 确保地图容器有正确的尺寸 */
.map-container {
  min-height: 500px;
  width: 100%;
  height: 100%;
  position: relative;
}

/* 地图容器包装器 */
.map-wrapper {
  min-height: 500px;
  height: 60vh;
}

/* 确保弹窗容器有足够高度 */
.fixed.inset-0 .bg-white {
  height: 85vh;
  max-height: 800px;
}
</style>
