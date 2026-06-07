<template>
  <div class="absolute right-3 top-3 z-10 flex flex-col items-end gap-1.5">
    <button
      v-for="preset in presets"
      :key="preset.value"
      type="button"
      class="inline-flex w-full items-center gap-1 rounded-lg border border-border bg-card/90 px-2 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:text-foreground"
      :title="preset.title"
      @click="$emit('set-view', preset.value)"
    >
      <component :is="preset.icon" :size="13" />
      <span>{{ preset.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ArrowDownToDot, ArrowUpFromDot, Axis3d } from 'lucide-vue-next'
import type { GamutViewPreset } from './composables/gamutCameraState'

defineEmits<{
  'set-view': [view: GamutViewPreset]
}>()

const presets = [
  { value: 'top', label: '上から', title: '真上から見る（色相・彩度の平面）', icon: ArrowDownToDot },
  { value: 'bottom', label: '下から', title: '真下から見る', icon: ArrowUpFromDot },
  { value: 'default', label: '初期', title: '初期視点に戻す', icon: Axis3d },
] as const
</script>
