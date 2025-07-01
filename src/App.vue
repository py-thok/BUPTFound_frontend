<script setup lang="ts">
// 使用官方 Vue Router
import { useTheme } from '@/composables/useTheme'

// 初始化主题
useTheme()
</script>

<template>
  <div id="app">
    <RouterView />
  </div>
</template>

<style>
#app {
  min-height: 100vh;
}
</style> 