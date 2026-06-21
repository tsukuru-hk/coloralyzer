<template>
  <!-- 分析結果を PNG 保存するためのアイコンのみのボタン（ホバーでツールチップ表示） -->
  <Tooltip :content="title" :side="variant === 'overlay' ? 'bottom' : 'top'">
    <button
      type="button"
      :class="buttonClass"
      :aria-label="title"
      :disabled="disabled"
      @click="$emit('click')"
    >
      <Download :size="iconSize" />
    </button>
  </Tooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Download } from 'lucide-vue-next'
import Tooltip from './Tooltip.vue'

const props = withDefaults(defineProps<{
  /** ツールチップ / aria-label */
  title?: string
  /** 無効化（結果が未生成のときなど） */
  disabled?: boolean
  /** 見た目: 通常（白背景）か overlay（3D 上の暗色オーバーレイ） */
  variant?: 'default' | 'overlay'
}>(), {
  title: '分析結果を画像でダウンロード',
  disabled: false,
  variant: 'default',
})

defineEmits<{ click: [] }>()

const iconSize = computed(() => (props.variant === 'overlay' ? 16 : 15))

const buttonClass = computed(() => {
  const base =
    'inline-flex shrink-0 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40'
  if (props.variant === 'overlay') {
    return `${base} h-8 w-8 border border-white/20 bg-black/40 text-white/80 backdrop-blur-sm hover:bg-black/60 hover:text-white`
  }
  return `${base} h-7 w-7 border border-border bg-white text-muted-foreground hover:bg-muted hover:text-foreground`
})
</script>
