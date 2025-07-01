<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { 
  Search as SearchIcon, 
  X, 
  Calendar as CalendarIcon,
  MapPin, 
  Phone, 
  Filter,
  Loader2,
  Clock,
  ArrowLeft
} from 'lucide-vue-next'
import { items, type Item } from '@/stores/user'
import AppNavbar from '@/components/AppNavbar.vue'
import SearchBox from '@/components/SearchBox.vue'

const route = useRoute()
const router = useRouter()

// 搜索状态
const searchInput = ref<HTMLInputElement>()
const keyword = ref('')
const searching = ref(false)
const showClear = ref(false)
const inputFixed = ref(false)
const category = ref<'all' | 'found' | 'lost'>('all')
const dateFilter = ref('')
const showFilters = ref(false)
const showedTip = ref(false)

// 简单的中文分词函数
const chineseSegment = (text: string): string[] => {
  const segments: string[] = []
  let current = ''
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (/[\u4e00-\u9fa5]/.test(char)) {
      // 中文字符
      if (current && !/[\u4e00-\u9fa5]/.test(current[current.length - 1])) {
        segments.push(current.trim())
        current = char
      } else {
        current += char
      }
    } else if (/[a-zA-Z0-9]/.test(char)) {
      // 英文数字
      current += char
    } else if (/\s/.test(char)) {
      // 空格
      if (current.trim()) {
        segments.push(current.trim())
        current = ''
      }
    } else {
      // 其他字符
      if (current.trim()) {
        segments.push(current.trim())
        current = ''
      }
    }
  }
  
  if (current.trim()) {
    segments.push(current.trim())
  }
  
  return segments.filter(s => s.length > 0)
}

// 搜索匹配函数
const matchItem = (item: Item, keywords: string[]): boolean => {
  if (keywords.length === 0) return true
  
  const searchText = `${item.title} ${item.description} ${item.location} ${item.contact}`.toLowerCase()
  
  return keywords.every(keyword => {
    const lowerKeyword = keyword.toLowerCase()
    return searchText.includes(lowerKeyword) || 
           item.title.toLowerCase().includes(lowerKeyword) ||
           item.description.toLowerCase().includes(lowerKeyword) ||
           item.location.toLowerCase().includes(lowerKeyword)
  })
}

// 高亮关键词函数
const highlightKeywords = (text: string): string => {
  if (!keyword.value.trim()) return text
  
  const keywords = chineseSegment(keyword.value.trim())
  let result = text
  
  keywords.forEach(word => {
    if (word.length > 0) {
      const regex = new RegExp(`(${word})`, 'gi')
      result = result.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>')
    }
  })
  
  return result
}

// 过滤后的物品列表
const filteredItems = ref<Item[]>([])

// 搜索统计
const searchStats = computed(() => {
  const total = filteredItems.value.length
  const found = filteredItems.value.filter(item => item.type === 'found').length
  const lost = filteredItems.value.filter(item => item.type === 'lost').length
  
  return { total, found, lost }
})

// 处理搜索
const handleSearch = (params: { keyword: string; category: 'all' | 'found' | 'lost'; dateFilter: string }) => {
  let result = items.value

  // 分类筛选
  if (params.category !== 'all') {
    result = result.filter(item => item.type === params.category)
  }

  // 日期筛选
  if (params.dateFilter) {
    result = result.filter(item => item.date === params.dateFilter)
  }

  // 关键词搜索
  if (params.keyword.trim()) {
    const keywords = chineseSegment(params.keyword.trim())
    result = result.filter(item => matchItem(item, keywords))
  }

  filteredItems.value = result
  
  // 更新URL参数
  const urlParams = new URLSearchParams()
  if (params.keyword) urlParams.set('q', params.keyword)
  if (params.category !== 'all') urlParams.set('c', params.category)
  if (params.dateFilter) urlParams.set('date', params.dateFilter)
  router.replace({ query: Object.fromEntries(urlParams) })
}

// 清除搜索
const handleClear = () => {
  filteredItems.value = items.value
  router.replace({ query: {} })
}

// 切换分类
const switchCategory = (newCategory: 'all' | 'found' | 'lost') => {
  category.value = newCategory
  const params = new URLSearchParams()
  if (keyword.value) params.set('q', keyword.value)
  if (newCategory !== 'all') params.set('c', newCategory)
  router.replace({ query: Object.fromEntries(params) })
}

// 跳转到帖子详情
const goToPost = (itemId: number) => {
  router.push(`/post/${itemId}`)
}

// 键盘快捷键处理
const handleKeyDown = (e: KeyboardEvent) => {
  if (document.activeElement !== document.body) return
  
  if (e.key === '/') {
    e.preventDefault()
    searchInput.value?.focus()
  } else if (e.key === 'Escape') {
    searchInput.value?.blur()
  } else {
    // 提示用户可以使用快捷键
    if (showedTip.value) return
    if (e.key.length !== 1 || e.altKey || e.ctrlKey || e.metaKey) return
    
    console.log("按 / 键可快速跳转到搜索框")
    showedTip.value = true
  }
}

// 滚动处理
const handleScroll = () => {
  if (searchInput.value) {
    const rect = searchInput.value.getBoundingClientRect()
    inputFixed.value = rect.top <= 16
  }
}

// 初始化
onMounted(() => {
  // 从URL参数恢复搜索状态
  const query = route.query
  if (query.q) {
    keyword.value = query.q as string
  }
  if (query.c && ['found', 'lost'].includes(query.c as string)) {
    category.value = query.c as 'found' | 'lost'
  }
  if (query.date) {
    dateFilter.value = query.date as string
  }

  // 初始化搜索结果
  filteredItems.value = items.value
  
  // 如果有搜索参数，执行搜索
  if (keyword.value || category.value !== 'all' || dateFilter.value) {
    handleSearch({
      keyword: keyword.value,
      category: category.value,
      dateFilter: dateFilter.value
    })
  }

  // 绑定事件
  document.addEventListener('keydown', handleKeyDown)
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <!-- 导航栏 -->
    <AppNavbar 
      :page-title="'搜索失物招领'"
      :current-page="'search'"
      :show-back-button="true"
      :is-scroll-navbar="false"
      :show-navbar="true"
      :show-search="false"
    />

    <div class="container mx-auto px-4 py-8 space-y-6">
      <!-- 搜索框区域 -->
      <SearchBox 
        :initial-keyword="keyword"
        :initial-category="category"
        :initial-date="dateFilter"
        :stats="searchStats"
        :show-filters="true"
        :show-stats="true"
        :auto-focus="true"
        placeholder="搜索失物招领信息... (按 / 键快速搜索)"
        @search="handleSearch"
        @clear="handleClear"
      />
      
      <!-- 为固定搜索框预留空间 -->
      <div v-if="inputFixed" class="h-20"></div>
      
      <!-- 搜索结果 -->
      <div class="max-w-6xl mx-auto">
        <div v-if="filteredItems.length === 0 && (keyword || category !== 'all' || dateFilter)" class="text-center py-12">
          <div class="text-gray-400 mb-4">
            <SearchIcon :size="48" class="mx-auto" />
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">未找到相关物品</h3>
          <p class="text-gray-600 mb-4">
            尝试使用其他关键词或调整筛选条件
          </p>
          <Button @click="handleClear" variant="outline">
            清除搜索条件
          </Button>
        </div>
        
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card 
            v-for="item in filteredItems" 
            :key="item.id"
            @click="goToPost(item.id)"
            class="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer"
          >
            <div class="relative">
              <img 
                :src="item.image" 
                :alt="item.title"
                class="w-full h-48 object-cover"
              >
              <Badge 
                :variant="item.status === 'resolved' ? 'secondary' : (item.type === 'found' ? 'default' : 'destructive')"
                class="absolute top-3 right-3"
              >
                {{ item.status === 'resolved' ? '已找回' : (item.type === 'found' ? '拾到' : '寻找') }}
              </Badge>
            </div>
            
            <CardHeader class="pb-3">
              <div class="text-lg font-semibold" v-html="highlightKeywords(item.title)"></div>
              <div class="text-sm text-muted-foreground line-clamp-1" v-html="highlightKeywords(item.description)"></div>
            </CardHeader>
            
            <CardContent class="space-y-3">
              <div class="space-y-2 text-sm text-gray-600">
                <div class="flex items-center gap-2">
                  <MapPin :size="14" class="text-gray-400" />
                  <span v-html="highlightKeywords(item.location)"></span>
                </div>
                <div class="flex items-center gap-2">
                  <CalendarIcon :size="14" class="text-gray-400" />
                  <span>{{ item.date }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <Phone :size="14" class="text-gray-400" />
                  <span>{{ item.contact }}</span>
                </div>
              </div>
              
              <Button class="w-full mt-4" size="sm">
                <Phone :size="14" class="mr-2" />
                联系我
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(mark) {
  background-color: #fef08a;
  padding: 0 2px;
  border-radius: 2px;
}

/* 文本截断样式 */
.line-clamp-1 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-height: 1.4;
}
</style> 