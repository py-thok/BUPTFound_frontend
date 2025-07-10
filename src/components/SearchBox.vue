<template>
  <div class="search-box-container relative">
    <!-- 主搜索框 -->
    <div :class="[
      'relative',
      size === 'large' ? 'max-w-2xl mx-auto' : 'max-w-4xl mx-auto'
    ]">
      <!-- 搜索图标/加载器 -->
      <div :class="[
        'absolute top-1/2 transform -translate-y-1/2 text-gray-400',
        size === 'large' ? 'left-4' : 'left-3'
      ]">
        <Loader2 v-if="searching" :size="size === 'large' ? 20 : 16" class="animate-spin" />
        <Search v-else :size="size === 'large' ? 20 : 16" />
      </div>
      
      <!-- 搜索输入框 -->
      <Input
        ref="searchInput"
        v-model="keyword"
        @input="handleInput"
        @keydown="handleKeyDown"
        @focus="handleFocus"
        @blur="handleBlur"
        :placeholder="placeholder"
        :class="[
          'transition-all duration-200 relative z-0',
          size === 'large' 
            ? 'pl-12 pr-20 h-14 text-lg rounded-xl border-2 border-gray-200 focus:border-blue-500' 
            : 'pl-10 pr-20 h-12 text-lg border-gray-200 focus:border-blue-500',
          'w-full',
          // 动态阴影：有筛选器时减少阴影，无筛选器时保持完整阴影
          shouldShowFilters 
            ? (size === 'large' ? 'shadow-md focus:shadow-lg' : 'shadow-sm hover:shadow-md')
            : (size === 'large' ? 'shadow-xl focus:shadow-2xl' : 'shadow-md hover:shadow-lg')
        ]"
      />
      
      <!-- 右侧按钮组 -->
      <div :class="[
        'absolute top-1/2 transform -translate-y-1/2 flex items-center gap-1',
        size === 'large' ? 'right-4' : 'right-2'
      ]">
        <!-- 清除按钮 -->
        <Button
          v-if="showClear"
          @click="clearSearch"
          variant="ghost"
          size="sm"
          class="h-8 w-8 p-0"
        >
          <X :size="16" class="icon-bg-fill" />
        </Button>
        
        <!-- 筛选按钮 - 只有在搜索框获得焦点或已经打开筛选器时才显示 -->
        <Button
          v-if="showFilters && (isFocused || filtersOpen)"
          @click="toggleFilters"
          variant="outline"
          size="sm"
          class="h-8 w-8 p-0 transition-all duration-200"
          :class="filtersOpen ? 'bg-blue-50 border-blue-300' : ''"
        >
          <Filter :size="16" class="icon-bg-fill" />
        </Button>
      </div>
    </div>
    
    <!-- 筛选器面板 - 紧贴搜索框下方 -->
    <div v-if="shouldShowFilters" :class="[
      'mt-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 space-y-4 transition-all duration-300',
      size === 'large' ? 'max-w-2xl mx-auto' : 'max-w-4xl mx-auto'
    ]">
      <div class="flex flex-wrap items-center gap-4">
        <!-- 分类筛选 -->
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium">类型:</span>
          <div class="flex gap-1">
            <Button 
              @click="updateCategory('all')"
              :variant="category === 'all' ? 'default' : 'outline'"
              size="sm"
              class="h-8 text-xs"
            >
              全部
            </Button>
            <Button 
              @click="updateCategory('found')"
              :variant="category === 'found' ? 'default' : 'outline'"
              size="sm"
              class="h-8 text-xs"
            >
              拾到
            </Button>
            <Button 
              @click="updateCategory('lost')"
              :variant="category === 'lost' ? 'default' : 'outline'"
              size="sm"
              class="h-8 text-xs"
            >
              寻找
            </Button>
          </div>
        </div>
        
        <!-- 时间筛选 -->
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium"></span>
          <Popover v-model:open="datePickerOpen">
            <PopoverTrigger as-child>
              <Button
                variant="outline"
                size="sm"
                class="h-8 text-xs justify-start font-normal"
                :class="dateRange ? 'bg-blue-50' : ''"
              >
                <CalendarIcon :size="14" class="mr-2 icon-bg-fill" />
                {{ dateRange ? '已选定' : '日期筛选' }}
              </Button>
            </PopoverTrigger>
            <PopoverContent class="w-auto p-0 z-[10000]">
              <RangeCalendar 
                v-model="dateRange" 
                initial-focus 
                :number-of-months="2" 
                class="w-full"
                @update:model-value="onDateRangeSelect"
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <!-- 位置筛选 -->
        <SearchLocationPicker v-model="selectedLocation" />
        
        <!-- 清除所有筛选 -->
        <Button 
          v-if="hasActiveFilters"
          @click="clearAllFilters"
          variant="outline"
          size="sm"
          class="h-8 text-xs"
        >
          <X :size="14" class="mr-1 icon-bg-fill" />
          清除筛选
        </Button>
      </div>
      
      
    </div>
    
    <!-- 搜索统计 -->
    <div 
      v-if="showStats && (keyword || category !== 'all' || dateRange)" 
      class="mt-4 flex items-center gap-4 text-sm text-gray-600"
    >
      <span>找到 {{ stats.total }} 条结果</span>
      <div class="flex gap-2">
        <Badge variant="secondary">拾到 {{ stats.found }}</Badge>
        <Badge variant="destructive">寻找 {{ stats.lost }}</Badge>
      </div>
      <div v-if="keyword" class="flex items-center gap-1">
        <Clock :size="14" class="icon-bg-fill" />
        <span>搜索用时: 0.3s</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RangeCalendar } from '@/components/ui/range-calendar'
import { 
  Search, 
  X, 
  Filter,
  Loader2,
  Clock,
  CalendarIcon
} from 'lucide-vue-next'
import SearchLocationPicker from '@/components/SearchLocationPicker.vue'
import { type LocationData } from '@/config/map'

interface Props {
  placeholder?: string
  autoFocus?: boolean
  initialKeyword?: string
  initialCategory?: 'all' | 'found' | 'lost'
  initialDate?: string
  // 初始日期范围
  initialDateRange?: any
  // 初始位置
  initialLocation?: LocationData | null
  // 搜索结果统计
  stats?: {
    total: number
    found: number
    lost: number
  }
  showFilters?: boolean
  showStats?: boolean
  size?: 'normal' | 'large'
}

interface Emits {
  search: [keyword: string, category: string, dateFilter: string | any, location?: { lat: number, lng: number } | null]
  clear: []
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '搜索...',
  autoFocus: false,
  initialKeyword: '',
  initialCategory: 'all',
  initialDateRange: undefined,
  initialLocation: null,
  stats: () => ({ total: 0, found: 0, lost: 0 })
})

const emits = defineEmits<Emits>()
const router = useRouter()

// 响应式状态
const searchInput = ref<any>(null)
const keyword = ref(props.initialKeyword)
const category = ref<'all' | 'found' | 'lost'>(props.initialCategory)
const dateRange = ref<any>(props.initialDateRange)
const searching = ref(false)
const filtersOpen = ref(false)
const isFocused = ref(false)
const datePickerOpen = ref(false)

// 位置筛选状态
const selectedLocation = ref<LocationData | null>(props.initialLocation)

// 计算属性
const showClear = computed(() => !!keyword.value || category.value !== 'all' || !!dateRange.value || !!selectedLocation.value)
const hasActiveFilters = computed(() => category.value !== 'all' || !!dateRange.value || !!selectedLocation.value)
const shouldShowFilters = computed(() => {
  // 显示筛选器面板的条件：
  // 1. 启用了筛选功能
  // 2. 并且满足以下条件之一：
  //    - 筛选器已手动打开
  //    - 大尺寸模式下搜索框获得焦点且筛选器按钮被点击过
  return props.showFilters && filtersOpen.value
})

// 处理输入变化
const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  const value = target.value
  keyword.value = value
  
  if (value) {
    searching.value = true
    setTimeout(() => {
      searching.value = false
    }, 300)
  } else {
    searching.value = false
  }
  
  // 只有在普通尺寸（搜索页面）时才立即发出搜索事件
  // 大尺寸（主页面）需要等用户按回车键才搜索
  if (props.size === 'normal') {
    emitSearch()
  }
}

// 处理焦点事件
const handleFocus = () => {
  isFocused.value = true
}

const handleBlur = () => {
  // 延迟隐藏，以便用户可以点击筛选器按钮
  setTimeout(() => {
    // 只有在筛选器未打开时才隐藏焦点状态
    if (!filtersOpen.value) {
      isFocused.value = false
    }
  }, 200)
}

// 处理键盘事件
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    handleSearch()
  } else if (e.key === 'Escape') {
    if (searchInput.value?.$el) {
      searchInput.value.$el.blur()
    }
    isFocused.value = false
  }
}

// 执行搜索
const handleSearch = () => {
  console.log('执行搜索:', {
    keyword: keyword.value,
    category: category.value,
    dateFilter: dateRange.value,
    location: selectedLocation.value
  })
  
  emits('search', keyword.value, category.value as 'all' | 'found' | 'lost', dateRange.value, selectedLocation.value)
}

// 发出搜索事件
const emitSearch = () => {
  emits('search', keyword.value, category.value as 'all' | 'found' | 'lost', dateRange.value, selectedLocation.value)
}

// 清除搜索
const clearSearch = () => {
  keyword.value = ''
  category.value = 'all'
  dateRange.value = undefined
  selectedLocation.value = null
  searching.value = false
  filtersOpen.value = false
  datePickerOpen.value = false
  if (searchInput.value?.$el) {
    searchInput.value.$el.focus()
  }
  emits('clear')
}

// 切换筛选器
const toggleFilters = () => {
  filtersOpen.value = !filtersOpen.value
  // 当筛选器关闭时，如果搜索框没有焦点，则隐藏筛选按钮
  if (!filtersOpen.value) {
    setTimeout(() => {
      const activeElement = document.activeElement
      if (activeElement !== searchInput.value?.$el) {
        isFocused.value = false
      }
    }, 100)
  }
}

// 更新分类
const updateCategory = (newCategory: 'all' | 'found' | 'lost') => {
  category.value = newCategory
  // 不立即搜索，等用户设置完所有条件后按回车
  if (props.size === 'normal') {
    // 只有在搜索页面（normal尺寸）才立即搜索
    emitSearch()
  }
}

// 清除所有筛选
const clearAllFilters = () => {
  category.value = 'all'
  dateRange.value = undefined
  selectedLocation.value = null
  // 不立即搜索，等用户设置完所有条件后按回车
  if (props.size === 'normal') {
    // 只有在搜索页面（normal尺寸）才立即搜索
    emitSearch()
  }
}

// 监听日期变化
watch(dateRange, () => {
  // 不立即搜索，等用户设置完所有条件后按回车
  if (props.size === 'normal') {
    // 只有在搜索页面（normal尺寸）才立即搜索
    emitSearch()
  }
}, { deep: true })

// 监听初始关键词变化
watch(() => props.initialKeyword, (newKeyword) => {
  if (newKeyword && newKeyword !== keyword.value) {
    keyword.value = newKeyword
  }
}, { immediate: true })

// 监听初始分类变化
watch(() => props.initialCategory, (newCategory) => {
  if (newCategory && newCategory !== category.value) {
    category.value = newCategory
  }
}, { immediate: true })

// 监听初始日期范围变化
watch(() => props.initialDateRange, (newDateRange) => {
  if (newDateRange !== dateRange.value) {
    dateRange.value = newDateRange
  }
}, { immediate: true, deep: true })

// 监听初始位置变化
watch(() => props.initialLocation, (newLocation) => {
  if (newLocation !== selectedLocation.value) {
    selectedLocation.value = newLocation
  }
}, { immediate: true, deep: true })

// 自动聚焦
if (props.autoFocus) {
  nextTick(() => {
    if (searchInput.value?.$el) {
      searchInput.value.$el.focus()
    }
  })
}

// 暴露方法
defineExpose({
  focus: () => {
    if (searchInput.value?.$el) {
      searchInput.value.$el.focus()
    }
  },
  clear: clearSearch,
  setKeyword: (value: string) => {
    keyword.value = value
    emitSearch()
  }
})

// 处理日期范围选择
const onDateRangeSelect = (value: any) => {
  // 如果选择了完整的日期范围（start和end都有），则关闭popover
  if (value && value.start && value.end) {
    datePickerOpen.value = false
  }
  
  // 不立即搜索，等用户设置完所有条件后按回车
  if (props.size === 'normal') {
    // 只有在搜索页面（normal尺寸）才立即搜索
    emitSearch()
  }
}
</script>

<script lang="ts">
export default {
  name: 'SearchBox'
}
</script>

<style scoped>
.search-box-container {
  width: 100%;
}

/* Lucide图标填充色与父容器背景一致的样式 */
.icon-bg-fill {
  fill: var(--bg-color, currentColor);
}
</style> 