<template>
  <div class="flex h-full min-h-[160px] items-center justify-center rounded-lg bg-muted/30">
    <div ref="lottieRef" class="h-20 w-20" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import animData from '@/assets/animations/LottieAnimeLoading.json'
import { useLottie } from '@/composables/useLottie'

const lottieRef = ref<HTMLDivElement | null>(null)
useLottie(lottieRef, animData, { loop: true, autoplay: true })
</script>
