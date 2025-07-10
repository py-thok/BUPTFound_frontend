<template>
  <div class="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
    <!-- 加载状态 -->
    <div v-if="!error" class="text-center">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
      <p class="text-sm text-gray-600 dark:text-gray-400">{{ loadingText }}</p>
    </div>
    
    <!-- 错误状态 -->
    <div v-else class="text-center p-4">
      <div class="mb-3">
        <AlertCircle :size="32" class="mx-auto text-red-500 mb-2 icon-bg-fill" />
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">{{ error }}</p>
      </div>
      <Button @click="$emit('retry')" size="sm" variant="outline">
        <RotateCcw :size="16" class="mr-2 icon-bg-fill" />
        重试
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { AlertCircle, RotateCcw } from 'lucide-vue-next'

interface MapLoadingOverlayProps {
  error?: string
  loadingText?: string
}

withDefaults(defineProps<MapLoadingOverlayProps>(), {
  error: '',
  loadingText: '正在加载地图...'
})

defineEmits<{
  retry: []
}>()
</script> 