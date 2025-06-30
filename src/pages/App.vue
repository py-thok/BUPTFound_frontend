<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { ListIcon } from 'lucide-vue-next'

// 定义类型接口
interface Item {
  id: number
  title: string
  description: string
  type: 'found' | 'lost'
  location: string
  contact: string
  date: string
  image: string
}

// 响应式状态
const currentView = ref<'items' | 'add'>('items')
const items = ref<Item[]>([
  {
    id: 1,
    title: '黑色钱包',
    description: '在图书馆3楼发现的黑色皮质钱包，内有身份证和银行卡',
    type: 'found',
    location: '图书馆3楼',
    contact: '13800138001',
    date: '2024-01-15',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=200&fit=crop'
  },
  {
    id: 2,
    title: '蓝色保温杯',
    description: '我丢失了一个蓝色的保温杯，上面有卡通贴纸',
    type: 'lost',
    location: '食堂二楼',
    contact: '13900139002',
    date: '2024-01-14',
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=300&h=200&fit=crop'
  }
])

// 方法
const switchView = (view: 'items' | 'add') => {
  currentView.value = view
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <!-- 导航栏 -->
    <header class="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-gray-900">
            🔍 失物招领平台
          </h1>
          <nav class="flex items-center gap-2">
            
            <Button
              @click="switchView('items')"
              :variant="currentView === 'items' ? 'default' : 'outline'"
              size="sm"
            >
              <ListIcon :size="18" class="mr-1" />
              物品列表
            </Button>
            <Button
              @click="switchView('add')"
              :variant="currentView === 'add' ? 'default' : 'outline'"
              size="sm"
            >
              ➕ 发布信息
            </Button>
          </nav>
        </div>
      </div>
    </header>

    <!-- 主要内容 -->
    <main class="container mx-auto px-4 py-8">
      

      <!-- 物品列表页面 -->
      <div v-if="currentView === 'items'" class="space-y-6">
        <div class="text-center">
          <h2 class="text-3xl font-bold text-gray-900 mb-4">失物招领列表</h2>
          <p class="text-gray-600">帮助物品找到它们的主人</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div 
            v-for="item in items" 
            :key="item.id"
            class="bg-white rounded-xl overflow-hidden shadow-sm border hover:shadow-md transition-shadow"
          >
            <img 
              :src="item.image" 
              :alt="item.title"
              class="w-full h-48 object-cover"
            >
            <div class="p-6">
              <div class="flex items-center justify-between mb-2">
                <h3 class="font-semibold text-lg">{{ item.title }}</h3>
                <span 
                  :class="item.type === 'found' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                  class="px-2 py-1 rounded-full text-xs font-medium"
                >
                  {{ item.type === 'found' ? '拾到' : '寻找' }}
                </span>
              </div>
              <p class="text-gray-600 text-sm mb-4">{{ item.description }}</p>
              <div class="space-y-1 text-xs text-gray-500">
                <p>📍 {{ item.location }}</p>
                <p>📅 {{ item.date }}</p>
                <p>📞 {{ item.contact }}</p>
              </div>
              <Button class="w-full mt-4" size="sm">
                联系我
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- 发布信息页面 -->
      <div v-if="currentView === 'add'" class="max-w-2xl mx-auto">
        <div class="text-center mb-8">
          <h2 class="text-3xl font-bold text-gray-900 mb-4">发布失物招领</h2>
          <p class="text-gray-600">帮助物品找到它们的主人，让爱心传递下去</p>
        </div>
        
        <div class="bg-white rounded-xl p-8 shadow-sm border">
          <form class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                信息类型
              </label>
              <div class="grid grid-cols-2 gap-4">
                <Button variant="outline" class="h-20 flex-col">
                  <span class="text-2xl mb-1">🔍</span>
                  <span>拾到物品</span>
                </Button>
                <Button variant="outline" class="h-20 flex-col">
                  <span class="text-2xl mb-1">😢</span>
                  <span>寻找物品</span>
                </Button>
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                物品名称
              </label>
              <input 
                type="text" 
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如：黑色钱包、iPhone 14..."
              >
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                详细描述
              </label>
              <textarea 
                rows="4"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请详细描述物品的特征、颜色、大小等信息..."
              ></textarea>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  地点
                </label>
                <input 
                  type="text" 
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="图书馆、食堂..."
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  联系方式
                </label>
                <input 
                  type="tel" 
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="手机号码"
                >
              </div>
            </div>
            
            <Button class="w-full" size="lg">
              🚀 发布信息
            </Button>
          </form>
        </div>
      </div>
    </main>

    <!-- 页脚 -->
    <footer class="bg-white/80 backdrop-blur-md border-t border-gray-200 mt-16">
      <div class="container mx-auto px-4 py-6 text-center text-gray-600">
        <p>© 2024 失物招领平台 - 让每一件物品都能回家 ❤️</p>
      </div>
    </footer>
  </div>
</template>

<style>
/* 全局样式已由 Tailwind CSS 和 style.css 处理 */
</style>
