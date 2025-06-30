<script setup>
import { ref, computed } from 'vue'

// Props - 从父组件接收数据 (Vue组件通信的重要概念)
const props = defineProps({
  items: {
    type: Array,
    required: true
  }
})

// 响应式数据
const searchQuery = ref('')
const filterType = ref('all') // all, found, lost

// 计算属性 - Vue的核心特性，会根据依赖自动更新
const filteredItems = computed(() => {
  let result = props.items

  // 按类型过滤
  if (filterType.value !== 'all') {
    result = result.filter(item => item.type === filterType.value)
  }

  // 按搜索关键词过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(item => 
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.location.toLowerCase().includes(query)
    )
  }

  return result
})

// 获取物品类型的中文显示
const getTypeText = (type) => {
  return type === 'found' ? '拾到物品' : '寻找物品'
}

// 获取类型对应的emoji
const getTypeEmoji = (type) => {
  return type === 'found' ? '🔍' : '😢'
}
</script>

<template>
  <div class="item-list">
    <!-- 搜索和过滤区域 -->
    <div class="search-section">
      <h2 class="section-title">📋 物品列表</h2>
      
      <div class="search-controls">
        <div class="search-box">
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="搜索物品名称、描述或地点..."
            class="search-input"
          >
          <span class="search-icon">🔍</span>
        </div>
        
        <div class="filter-tabs">
          <button 
            @click="filterType = 'all'"
            :class="{ active: filterType === 'all' }"
            class="filter-btn"
          >
            全部 ({{ items.length }})
          </button>
          <button 
            @click="filterType = 'found'"
            :class="{ active: filterType === 'found' }"
            class="filter-btn"
          >
            🔍 拾到 ({{ items.filter(item => item.type === 'found').length }})
          </button>
          <button 
            @click="filterType = 'lost'"
            :class="{ active: filterType === 'lost' }"
            class="filter-btn"
          >
            😢 寻找 ({{ items.filter(item => item.type === 'lost').length }})
          </button>
        </div>
      </div>
    </div>

    <!-- 物品网格 -->
    <div class="items-grid">
      <!-- v-for指令 - 列表渲染 -->
      <div 
        v-for="item in filteredItems" 
        :key="item.id"
        class="item-card"
      >
        <div class="item-image">
          <img :src="item.image" :alt="item.title" />
          <div class="item-type-badge" :class="item.type">
            {{ getTypeEmoji(item.type) }} {{ getTypeText(item.type) }}
          </div>
        </div>
        
        <div class="item-content">
          <h3 class="item-title">{{ item.title }}</h3>
          <p class="item-description">{{ item.description }}</p>
          
          <div class="item-details">
            <div class="detail-item">
              <span class="detail-icon">📍</span>
              <span class="detail-text">{{ item.location }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-icon">📅</span>
              <span class="detail-text">{{ item.date }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-icon">📞</span>
              <span class="detail-text">{{ item.contact }}</span>
            </div>
          </div>
          
          <button class="contact-btn">
            💬 联系我
          </button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="filteredItems.length === 0" class="empty-state">
      <div class="empty-icon">🔍</div>
      <h3>暂无匹配的物品</h3>
      <p v-if="searchQuery">尝试调整搜索关键词或选择不同的分类</p>
      <p v-else>暂时没有物品信息，快去发布第一条吧！</p>
    </div>
  </div>
</template>

<style scoped>
.item-list {
  max-width: 100%;
}

.search-section {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.section-title {
  margin: 0 0 1.5rem 0;
  color: #333;
  font-size: 1.8rem;
}

.search-controls {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.search-box {
  position: relative;
  max-width: 500px;
}

.search-input {
  width: 100%;
  padding: 1rem 3rem 1rem 1rem;
  border: 2px solid #e9ecef;
  border-radius: 50px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.search-icon {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.2rem;
}

.filter-tabs {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 0.75rem 1.5rem;
  border: 2px solid #e9ecef;
  border-radius: 25px;
  background: white;
  color: #495057;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.filter-btn:hover {
  border-color: #667eea;
  background: #f8f9ff;
}

.filter-btn.active {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 2rem;
}

.item-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.item-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.item-image {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-type-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  color: white;
}

.item-type-badge.found {
  background: linear-gradient(135deg, #28a745, #20c997);
}

.item-type-badge.lost {
  background: linear-gradient(135deg, #dc3545, #fd7e14);
}

.item-content {
  padding: 1.5rem;
}

.item-title {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.3rem;
  font-weight: 600;
}

.item-description {
  margin: 0 0 1.5rem 0;
  color: #666;
  line-height: 1.5;
}

.item-details {
  margin-bottom: 1.5rem;
}

.detail-item {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.detail-icon {
  margin-right: 0.5rem;
  font-size: 1rem;
}

.detail-text {
  color: #666;
  font-size: 0.9rem;
}

.contact-btn {
  width: 100%;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 25px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.contact-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  backdrop-filter: blur(10px);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  color: #333;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: #666;
  margin: 0;
}

@media (max-width: 768px) {
  .search-controls {
    gap: 1rem;
  }
  
  .filter-tabs {
    flex-direction: column;
  }
  
  .filter-btn {
    text-align: center;
  }
  
  .items-grid {
    grid-template-columns: 1fr;
  }
}
</style> 