<template>
  <!-- 明度分布バー: ビンの占有率に応じた幅でグレースケール色を敷き詰める -->
  <div class="flex h-6 w-full overflow-hidden rounded-md border border-border">
    <div
      v-for="(seg, i) in segments"
      :key="i"
      class="h-full"
      :style="{
        flex: '0 0 ' + seg.percent + '%',
        backgroundColor: seg.fill,
        minWidth: '0',
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { converter } from 'culori'
import type { HistogramData } from '@/infrastructure/histogramTypes'

const props = defineProps<{
  data: HistogramData
}>()

const toRgb = converter('rgb')

const segments = computed(() =>
  props.data.bins.map((bin) => {
    const percent = props.data.totalPixels > 0
      ? (bin.count / props.data.totalPixels) * 100
      : 0
    const midL = (bin.rangeStart + bin.rangeEnd) / 2
    const srgb = toRgb({ mode: 'oklch', l: midL, c: 0, h: 0 })
    const gray = Math.round(Math.max(0, Math.min(1, srgb?.r ?? 0)) * 255)
    return { percent, fill: `rgb(${gray},${gray},${gray})` }
  }),
)
</script>
