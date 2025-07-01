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
      v-if="avatar" 
      :src="avatar" 
      :alt="name || '用户'" 
    />
    <AvatarFallback>{{ (name || 'U').charAt(0) }}</AvatarFallback>
  </Avatar>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
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

const handleClick = (event?: Event) => {
  if (!props.clickable || !props.userId) return
  
  // 阻止事件冒泡
  event?.stopPropagation()
  
  // 统一使用 /user?id= 格式跳转到用户页面
  // User.vue页面会自动处理mockData检查和API调用
  router.push(`/user?id=${props.userId}`)
}
</script>

<script lang="ts">
export default {
  name: 'UserAvatar'
}
</script> 