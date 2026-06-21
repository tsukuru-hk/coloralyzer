<template>
  <HistogramChart
    v-if="histogramData"
    :data="histogramData"
    :use-grayscale-fill="true"
    :log-scale="logScale"
    :interactive="interactive"
    hover-hint="カーソルを合わせた明度のピクセルだけを画像に表示しています"
    @hover-bin="$emit('hover-bin', $event)"
  />
</template>

<script setup lang="ts">
import type { HistogramData } from '@/infrastructure/histogramTypes'
import HistogramChart from '@/components/ui/HistogramChart.vue'

defineProps<{
  histogramData: HistogramData | null
  logScale?: boolean
  /** 棒ホバーで明度帯フィルタを有効化する */
  interactive?: boolean
}>()

defineEmits<{
  (e: 'hover-bin', bin: number | null): void
}>()
</script>
