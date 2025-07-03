<template>
  <Avatar 
    :size="size" 
    :class="[
      'cursor-pointer transition-all duration-200',
      clickable ? 'hover:scale-105 hover:shadow-md' : '',
      props.class
    ]"
    @click="handleClick"
  >
    <AvatarImage 
      v-if="displayAvatar" 
      :src="displayAvatar" 
      :alt="name || '用户'" 
    />
    <AvatarFallback>{{ (name || 'U').charAt(0) }}</AvatarFallback>
  </Avatar>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { getPublicUserProfile } from '@/stores/user'
import type { AvatarVariants } from '@/components/ui/avatar'

interface Props {
  userId?: number
  name?: string
  avatar?: string
  size?: AvatarVariants['size']
  clickable?: boolean
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'sm',
  clickable: true
})

const router = useRouter()
const fetchedAvatar = ref<string>('')
const isLoading = ref(false)

// 计算显示的头像，优先使用传入的 avatar，如果为空则使用获取到的头像
const displayAvatar = computed(() => {
  return props.avatar || fetchedAvatar.value
})

// 获取用户头像
const fetchUserAvatar = async () => {
  if (!props.userId || props.avatar || isLoading.value) return
  
  try {
    isLoading.value = true
    console.log('UserAvatar: 获取用户头像，userId:', props.userId)
    
    const result = await getPublicUserProfile(props.userId)
    if (result.success && result.data?.avatar) {
      fetchedAvatar.value = result.data.avatar
      console.log('UserAvatar: 获取到用户头像:', result.data.avatar)
    } else {
      console.log('UserAvatar: 未获取到用户头像')
    }
  } catch (error) {
    console.error('UserAvatar: 获取用户头像失败:', error)
  } finally {
    isLoading.value = false
  }
}

const handleClick = (event?: Event) => {
  if (!props.clickable || !props.userId) return
  
  // 阻止事件冒泡
  event?.stopPropagation()
  
  // 统一使用 /user?id= 格式跳转到用户页面
  router.push(`/user?id=${props.userId}`)
}

// 组件挂载时和 userId 变化时获取头像
onMounted(() => {
  fetchUserAvatar()
})

watch(() => props.userId, () => {
  fetchedAvatar.value = '' // 清空之前获取的头像
  fetchUserAvatar()
})

watch(() => props.avatar, () => {
  // 如果 avatar 从空变为有值，清空获取的头像
  if (props.avatar) {
    fetchedAvatar.value = ''
  } else {
    // 如果 avatar 变为空，尝试获取头像
    fetchUserAvatar()
  }
})
</script>

<script lang="ts">
export default {
  name: 'UserAvatar'
}
</script> 