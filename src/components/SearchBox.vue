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
          <X :size="16" />
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
          <Filter :size="16" />
        </Button>
      </div>
    </div>
    
    <!-- 筛选器面板 -->
    <div v-if="shouldShowFilters" :class="[
      'absolute top-full left-1/2 transform -translate-x-1/2 mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 space-y-4 transition-all duration-300 z-50',
      size === 'large' ? 'w-full max-w-2xl' : 'w-full max-w-4xl'
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
          <span class="text-sm font-medium">日期:</span>
          <Popover>
            <PopoverTrigger as-child>
              <Button
                variant="outline"
                size="sm"
                class="h-8 text-xs justify-start font-normal"
                :class="!dateRange && 'text-muted-foreground'"
              >
                <CalendarIcon :size="14" class="mr-2" />
                <template v-if="dateRange?.start">
                  <template v-if="dateRange.end">
                    {{ dateRange.start.toString().slice(0,10) }} - {{ dateRange.end.toString().slice(0,10) }}
                  </template>
                  <template v-else>
                    {{ dateRange.start.toString().slice(0,10) }}
                  </template>
                </template>
                <template v-else>
                  选择日期范围
                </template>
              </Button>
            </PopoverTrigger>
            <PopoverContent class="w-auto p-0">
              <RangeCalendar 
                v-model="dateRange" 
                initial-focus 
                :number-of-months="2" 
              />
            </PopoverContent>
          </Popover>
          <Button 
            v-if="dateRange"
            @click="clearDateFilter"
            variant="ghost"
            size="sm"
            class="h-8 w-8 p-0"
          >
            <X :size="14" />
          </Button>
        </div>
        
        <!-- 清除所有筛选 -->
        <Button 
          v-if="hasActiveFilters"
          @click="clearAllFilters"
          variant="outline"
          size="sm"
          class="h-8 text-xs"
        >
          <X :size="14" class="mr-1" />
          清除筛选
        </Button>
      </div>
      
      <!-- 使用提示 (仅在主页面显示) -->
      <div v-if="size === 'large'" class="text-xs text-gray-500 mt-3 text-center">
        💡 设置筛选条件后，在搜索框中输入关键词并按回车键开始搜索
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
        <Clock :size="14" />
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
import { cn } from '@/lib/utils'
import { 
  Search, 
  X, 
  Filter,
  Loader2,
  Clock,
  CalendarIcon
} from 'lucide-vue-next'

interface Props {
  // 搜索框尺寸
  size?: 'normal' | 'large'
  // 占位符文本
  placeholder?: string
  // 是否显示筛选功能
  showFilters?: boolean
  // 是否显示统计信息
  showStats?: boolean
  // 是否自动聚焦
  autoFocus?: boolean
  // 初始关键词
  initialKeyword?: string
  // 初始分类
  initialCategory?: 'all' | 'found' | 'lost'
  // 初始日期范围
  initialDateRange?: any
  // 搜索结果统计
  stats?: {
    total: number
    found: number
    lost: number
  }
}

interface Emits {
  (e: 'search', params: {
    keyword: string
    category: 'all' | 'found' | 'lost'
    dateRange: any
  }): void
  (e: 'clear'): void
}

const props = withDefaults(defineProps<Props>(), {
  size: 'normal',
  placeholder: '搜索失物招领信息...',
  showFilters: false,
  showStats: false,
  autoFocus: false,
  initialKeyword: '',
  initialCategory: 'all',
  initialDateRange: undefined,
  stats: () => ({ total: 0, found: 0, lost: 0 })
})

const emit = defineEmits<Emits>()
const router = useRouter()

// 搜索状态
const searchInput = ref<HTMLInputElement>()
const keyword = ref(props.initialKeyword)
const searching = ref(false)
const category = ref<'all' | 'found' | 'lost'>(props.initialCategory)
const dateRange = ref<any>(props.initialDateRange)
const filtersOpen = ref(false)
const isFocused = ref(false)

// 计算属性
const showClear = computed(() => !!keyword.value || category.value !== 'all' || !!dateRange.value)
const hasActiveFilters = computed(() => category.value !== 'all' || !!dateRange.value)
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
    searchInput.value?.blur()
    isFocused.value = false
  }
}

// 执行搜索
const handleSearch = () => {
  if (props.size === 'large') {
    // 大尺寸搜索框跳转到搜索页面，带上筛选条件
    const urlParams = new URLSearchParams()
    if (keyword.value.trim()) urlParams.set('q', keyword.value.trim())
    if (category.value !== 'all') urlParams.set('c', category.value)
    if (dateRange.value?.start) urlParams.set('startDate', dateRange.value.start.toString())
    if (dateRange.value?.end) urlParams.set('endDate', dateRange.value.end.toString())
    
    const queryString = urlParams.toString()
    if (queryString) {
      router.push(`/search?${queryString}`)
    } else {
      router.push('/search')
    }
  } else {
    // 普通尺寸发出搜索事件
    emitSearch()
  }
}

// 发出搜索事件
const emitSearch = () => {
  emit('search', {
    keyword: keyword.value,
    category: category.value,
    dateRange: dateRange.value
  })
}

// 清除搜索
const clearSearch = () => {
  keyword.value = ''
  category.value = 'all'
  dateRange.value = undefined
  searching.value = false
  filtersOpen.value = false
  searchInput.value?.focus()
  emit('clear')
}

// 切换筛选器
const toggleFilters = () => {
  filtersOpen.value = !filtersOpen.value
  // 当筛选器关闭时，如果搜索框没有焦点，则隐藏筛选按钮
  if (!filtersOpen.value) {
    setTimeout(() => {
      const activeElement = document.activeElement
      if (activeElement !== searchInput.value) {
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

// 清除日期筛选
const clearDateFilter = () => {
  dateRange.value = undefined
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

// 自动聚焦
if (props.autoFocus) {
  nextTick(() => {
    searchInput.value?.focus()
  })
}

// 暴露方法
defineExpose({
  focus: () => searchInput.value?.focus(),
  clear: clearSearch,
  setKeyword: (value: string) => {
    keyword.value = value
    emitSearch()
  }
})
</script>

<style scoped>
.search-box-container {
  width: 100%;
}
</style> 