<template>
  <div 
    @click="$emit('click')"
    class="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[300px] max-w-[400px] cursor-pointer hover:shadow-xl transition-shadow duration-200"
  >
    <!-- 用户头像 -->
    <div class="flex-shrink-0">
      <UserAvatar 
        :userId="senderId"
        :name="senderName"
        :avatar="senderAvatar"
        size="sm"
        :clickable="false"
      />
    </div>
    
    <!-- 消息内容 -->
    <div class="flex-1 min-w-0">
      <!-- 发送者名称 -->
      <div class="flex items-center gap-2 mb-1">
        <span class="font-medium text-gray-900 text-sm truncate">
          {{ displayName }}
        </span>
        <span v-if="anonymous" class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
          匿名
        </span>
      </div>
      
      <!-- 消息内容 -->
      <div class="text-sm text-gray-700 break-words">
        {{ content }}
      </div>
      
      <!-- 相关物品信息 -->
      <div v-if="itemName" class="mt-2 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
        关于: {{ itemName }}
      </div>
      
      <!-- 时间戳 -->
      <div class="mt-1 text-xs text-gray-400">
        {{ formatTime(sentTime) }}
      </div>
    </div>
    
    <!-- 关闭按钮 -->
    <button 
      @click.stop="$emit('close')"
      class="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
    >
      <X :size="16" />
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { X } from 'lucide-vue-next'
import UserAvatar from '@/components/UserAvatar.vue'

export default defineComponent({
  name: 'MessageToast',
  components: {
    X,
    UserAvatar
  },
  props: {
    senderId: {
      type: Number,
      required: true
    },
    senderName: {
      type: String,
      required: true
    },
    senderAvatar: {
      type: String,
      default: ''
    },
    content: {
      type: String,
      required: true
    },
    sentTime: {
      type: String,
      required: true
    },
    itemName: {
      type: String,
      default: ''
    },
    anonymous: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'click'],
  setup(props) {
    const displayName = computed(() => {
      if (props.anonymous) {
        return '匿名用户'
      }
      return props.senderName || '未知用户'
    })

    const formatTime = (timeStr: string) => {
      try {
        const date = new Date(timeStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / (1000 * 60))
        
        if (diffMins < 1) {
          return '刚刚'
        } else if (diffMins < 60) {
          return `${diffMins}分钟前`
        } else if (diffMins < 24 * 60) {
          const diffHours = Math.floor(diffMins / 60)
          return `${diffHours}小时前`
        } else {
          return date.toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        }
      } catch (error) {
        return timeStr
      }
    }

    return {
      displayName,
      formatTime
    }
  }
})
</script>

<style scoped>
/* 确保文本换行 */
.break-words {
  word-wrap: break-word;
  word-break: break-word;
}
</style> 