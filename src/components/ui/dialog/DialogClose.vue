<script setup lang="ts">
import { DialogClose, type DialogCloseProps } from 'reka-ui'

const props = defineProps<DialogCloseProps>()
</script>

<template>
  <DialogClose v-bind="props">
    <X class="h-4 w-4 icon-bg-fill" />
  </DialogClose>
</template>
