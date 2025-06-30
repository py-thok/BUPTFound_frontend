<script setup>
import { ref, reactive, computed } from 'vue'

// 自定义事件 - 向父组件发射数据 (Vue组件通信的重要方式)
const emit = defineEmits(['add-item'])

// 表单数据 - 使用reactive创建响应式对象
const form = reactive({
  title: '',
  description: '',
  type: 'found', // found 或 lost
  location: '',
  contact: '',
  image: ''
})

// 表单验证状态
const errors = ref({})
const isSubmitting = ref(false)

// 预设的地点选项
const locationOptions = [
  '图书馆',
  '食堂',
  '宿舍区',
  '教学楼',
  '篮球场',
  '足球场',
  '体育馆',
  '校门口',
  '停车场',
  '其他'
]

// 表单验证规则
const validateForm = () => {
  const newErrors = {}
  
  if (!form.title.trim()) {
    newErrors.title = '请输入物品名称'
  } else if (form.title.length < 2) {
    newErrors.title = '物品名称至少需要2个字符'
  }
  
  if (!form.description.trim()) {
    newErrors.description = '请输入物品描述'
  } else if (form.description.length < 10) {
    newErrors.description = '物品描述至少需要10个字符'
  }
  
  if (!form.location.trim()) {
    newErrors.location = '请选择或输入地点'
  }
  
  if (!form.contact.trim()) {
    newErrors.contact = '请输入联系方式'
  } else if (!/^1[3-9]\d{9}$/.test(form.contact.replace(/\s/g, ''))) {
    newErrors.contact = '请输入正确的手机号码'
  }
  
  if (!form.image.trim()) {
    newErrors.image = '请输入图片链接'
  } else if (!isValidUrl(form.image)) {
    newErrors.image = '请输入正确的图片链接'
  }
  
  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

// URL验证函数
const isValidUrl = (string) => {
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }
  
  isSubmitting.value = true
  
  // 模拟API调用延迟
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // 发射事件给父组件
  emit('add-item', { ...form })
  
  // 重置表单
  Object.keys(form).forEach(key => {
    form[key] = key === 'type' ? 'found' : ''
  })
  
  errors.value = {}
  isSubmitting.value = false
  
  // 显示成功消息
  alert('发布成功！')
}

// 计算属性：表单是否有效
const isFormValid = computed(() => {
  return form.title.trim() && 
         form.description.trim() && 
         form.location.trim() && 
         form.contact.trim() && 
         form.image.trim()
})

// 获取类型显示文本
const getTypeText = (type) => {
  return type === 'found' ? '我拾到了这个物品' : '我丢失了这个物品'
}

// 格式化手机号
const formatPhoneNumber = (value) => {
  const cleaned = value.replace(/\D/g, '')
  const match = cleaned.match(/^(\d{3})(\d{4})(\d{4})$/)
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]}`
  }
  return cleaned
}

// 处理手机号输入
const handlePhoneInput = (event) => {
  const formatted = formatPhoneNumber(event.target.value)
  form.contact = formatted
}
</script>

<template>
  <div class="add-item">
    <div class="form-container">
      <h2 class="form-title">➕ 发布失物招领信息</h2>
      <p class="form-subtitle">
        帮助物品找到它们的主人，让爱心传递下去 💝
      </p>
      
      <form @submit.prevent="handleSubmit" class="item-form">
        <!-- 物品类型选择 -->
        <div class="form-group">
          <label class="form-label">📝 信息类型</label>
          <div class="type-selector">
            <label class="type-option" :class="{ active: form.type === 'found' }">
              <input 
                type="radio" 
                v-model="form.type" 
                value="found"
                class="type-radio"
              >
              <div class="type-content">
                <div class="type-icon">🔍</div>
                <div class="type-text">
                  <strong>拾到物品</strong>
                  <span>我发现了别人的物品</span>
                </div>
              </div>
            </label>
            
            <label class="type-option" :class="{ active: form.type === 'lost' }">
              <input 
                type="radio" 
                v-model="form.type" 
                value="lost"
                class="type-radio"
              >
              <div class="type-content">
                <div class="type-icon">😢</div>
                <div class="type-text">
                  <strong>寻找物品</strong>
                  <span>我丢失了自己的物品</span>
                </div>
              </div>
            </label>
          </div>
        </div>

        <!-- 物品名称 -->
        <div class="form-group">
          <label for="title" class="form-label">📦 物品名称</label>
          <input 
            id="title"
            type="text" 
            v-model.trim="form.title"
            placeholder="例如：黑色钱包、iPhone 14、蓝色保温杯..."
            class="form-input"
            :class="{ error: errors.title }"
          >
          <div v-if="errors.title" class="error-message">{{ errors.title }}</div>
        </div>

        <!-- 物品描述 -->
        <div class="form-group">
          <label for="description" class="form-label">📄 详细描述</label>
          <textarea 
            id="description"
            v-model.trim="form.description"
            placeholder="请详细描述物品的特征、颜色、大小等信息，这有助于物主识别..."
            class="form-textarea"
            :class="{ error: errors.description }"
            rows="4"
          ></textarea>
          <div class="char-count">{{ form.description.length }}/500</div>
          <div v-if="errors.description" class="error-message">{{ errors.description }}</div>
        </div>

        <!-- 地点选择 -->
        <div class="form-group">
          <label for="location" class="form-label">📍 {{ form.type === 'found' ? '发现地点' : '丢失地点' }}</label>
          <div class="location-selector">
            <select 
              v-model="form.location"
              class="form-select"
              :class="{ error: errors.location }"
            >
              <option value="">请选择地点</option>
              <option v-for="location in locationOptions" :key="location" :value="location">
                {{ location }}
              </option>
            </select>
            <span class="select-arrow">▼</span>
          </div>
          <input 
            v-if="form.location === '其他'"
            type="text"
            v-model.trim="form.location"
            placeholder="请输入具体地点"
            class="form-input custom-location"
          >
          <div v-if="errors.location" class="error-message">{{ errors.location }}</div>
        </div>

        <!-- 联系方式 -->
        <div class="form-group">
          <label for="contact" class="form-label">📞 联系方式</label>
          <input 
            id="contact"
            type="tel" 
            :value="form.contact"
            @input="handlePhoneInput"
            placeholder="请输入手机号码"
            class="form-input"
            :class="{ error: errors.contact }"
            maxlength="13"
          >
          <div v-if="errors.contact" class="error-message">{{ errors.contact }}</div>
        </div>

        <!-- 图片链接 -->
        <div class="form-group">
          <label for="image" class="form-label">🖼️ 物品图片</label>
          <input 
            id="image"
            type="url" 
            v-model.trim="form.image"
            placeholder="请输入图片链接 (例如：https://example.com/image.jpg)"
            class="form-input"
            :class="{ error: errors.image }"
          >
          <div class="image-tips">
            💡 建议使用 Unsplash、Pixabay 等免费图片网站的链接
          </div>
          <div v-if="errors.image" class="error-message">{{ errors.image }}</div>
          
          <!-- 图片预览 -->
          <div v-if="form.image && !errors.image" class="image-preview">
            <img :src="form.image" alt="预览图片" @error="errors.image = '图片链接无效'" />
          </div>
        </div>

        <!-- 提交按钮 -->
        <div class="form-actions">
          <button 
            type="submit" 
            class="submit-btn"
            :disabled="!isFormValid || isSubmitting"
            :class="{ loading: isSubmitting }"
          >
            <span v-if="!isSubmitting">
              {{ form.type === 'found' ? '🔍 发布拾到信息' : '😢 发布寻找信息' }}
            </span>
            <span v-else>
              🔄 发布中...
            </span>
          </button>
          
          <p class="form-note">
            {{ getTypeText(form.type) }}，希望能够帮助到需要的人 🤝
          </p>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.add-item {
  max-width: 600px;
  margin: 0 auto;
}

.form-container {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 2.5rem;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.form-title {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 2rem;
  text-align: center;
}

.form-subtitle {
  margin: 0 0 2rem 0;
  color: #666;
  text-align: center;
  font-size: 1rem;
}

.item-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: 600;
  font-size: 1rem;
}

.type-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.type-option {
  position: relative;
  cursor: pointer;
  border: 2px solid #e9ecef;
  border-radius: 15px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  background: white;
}

.type-option:hover {
  border-color: #667eea;
  transform: translateY(-2px);
}

.type-option.active {
  border-color: #667eea;
  background: #f8f9ff;
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.2);
}

.type-radio {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.type-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.type-icon {
  font-size: 2rem;
}

.type-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.type-text strong {
  color: #333;
  font-size: 1rem;
}

.type-text span {
  color: #666;
  font-size: 0.85rem;
}

.form-input,
.form-textarea,
.form-select {
  padding: 1rem;
  border: 2px solid #e9ecef;
  border-radius: 10px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: white;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-input.error,
.form-textarea.error,
.form-select.error {
  border-color: #dc3545;
  box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
}

.char-count {
  align-self: flex-end;
  font-size: 0.85rem;
  color: #666;
  margin-top: 0.25rem;
}

.location-selector {
  position: relative;
}

.form-select {
  width: 100%;
  appearance: none;
  cursor: pointer;
  padding-right: 3rem;
}

.select-arrow {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #666;
}

.custom-location {
  margin-top: 0.5rem;
}

.image-tips {
  font-size: 0.85rem;
  color: #666;
  margin-top: 0.25rem;
}

.image-preview {
  margin-top: 1rem;
  text-align: center;
}

.image-preview img {
  max-width: 200px;
  max-height: 150px;
  border-radius: 10px;
  border: 2px solid #e9ecef;
  object-fit: cover;
}

.error-message {
  color: #dc3545;
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.form-actions {
  margin-top: 1rem;
  text-align: center;
}

.submit-btn {
  width: 100%;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 25px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.submit-btn.loading {
  animation: pulse 2s infinite;
}

.form-note {
  margin: 1rem 0 0 0;
  color: #666;
  font-size: 0.9rem;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

@media (max-width: 768px) {
  .form-container {
    padding: 2rem 1.5rem;
  }
  
  .type-selector {
    grid-template-columns: 1fr;
  }
  
  .type-content {
    justify-content: center;
    text-align: center;
  }
}
</style> 