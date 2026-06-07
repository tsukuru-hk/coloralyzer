<template>
  <!-- グローバル通知：`useToast` のキューを body 直下に重ね描画 -->
  <Teleport to="body">
    <!-- モバイルでは操作の邪魔にならないよう右上、デスクトップでは右下に表示 -->
    <div class="fixed right-4 top-4 z-50 flex flex-col gap-2 md:bottom-4 md:top-auto">
      <TransitionGroup
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="translate-x-full opacity-0"
        enter-to-class="translate-x-0 opacity-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="translate-x-0 opacity-100"
        leave-to-class="translate-x-full opacity-0"
      >
        <Toast
          v-for="item in toasts"
          :key="item.id"
          :title="item.title"
          :description="item.description"
          :variant="item.variant"
          @close="dismiss(item.id)"
        />
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import Toast from './Toast.vue'

const { toasts, dismiss } = useToast()
</script>
