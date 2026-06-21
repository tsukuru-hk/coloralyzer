<template>
  <!-- デジタルヒストグラム: 隙間なし塗りつぶしバー。親要素の横幅に追従する -->
  <div>
    <SectionLabel v-if="title">{{ title }}</SectionLabel>
    <div class="relative border border-border">
    <!-- ホバー中のヒント: カーソルが合っているビンだけが画像に映ることを伝える -->
    <Transition name="hint-fade">
      <div
        v-if="interactive && hoverIndex !== null"
        class="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-2 py-1 text-xs text-white shadow"
      >
        {{ hoverHint }}
      </div>
    </Transition>
    <svg
      :viewBox="`0 0 ${data.bins.length} ${svgHeight}`"
      preserveAspectRatio="none"
      width="100%"
      :style="{ height: height + 'px', display: 'block', cursor: interactive ? 'pointer' : 'default' }"
      @mouseleave="onLeave"
    >
      <rect
        v-for="(bin, i) in bars"
        :key="i"
        :x="i"
        :y="bin.y"
        width="1"
        :height="bin.h"
        :fill="bin.fill"
        :opacity="interactive && hoverIndex !== null && hoverIndex !== i ? 0.25 : 1"
        :stroke="useGrayscaleFill || useChromaFill ? '#c0c0c0' : 'none'"
        :stroke-width="useGrayscaleFill || useChromaFill ? 0.3 : 0"
      />
      <!-- ホバー検出用の透明オーバーレイ（棒の高さに依らず全高で受ける） -->
      <template v-if="interactive">
        <rect
          v-for="i in bars.length"
          :key="`hit-${i}`"
          :x="i - 1"
          y="0"
          width="1"
          :height="svgHeight"
          fill="transparent"
          pointer-events="all"
          @mouseenter="onEnter(i - 1)"
          @mousemove="onEnter(i - 1)"
        />
      </template>
    </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { converter } from 'culori'
import type { HistogramData } from '@/infrastructure/histogramTypes'
import SectionLabel from './SectionLabel.vue'

const props = withDefaults(
  defineProps<{
    data: HistogramData
    title?: string
    fillColor?: string
    /** 各棒をビンの明度範囲に応じた知覚グレー(OKLCH L → sRGB LUT)で塗る */
    useGrayscaleFill?: boolean
    /** 各棒をビンの彩度位置に応じた線形グレー(gray ∝ 位置)で塗る。彩度グレースケールマップと一致 */
    useChromaFill?: boolean
    logScale?: boolean
    height?: number
    /** 棒ホバーで明度帯フィルタ（hover-range emit）を有効化する */
    interactive?: boolean
    /** ホバー時に領域上部へ表示するヒント文言 */
    hoverHint?: string
  }>(),
  {
    title: undefined,
    fillColor: '#000000',
    useGrayscaleFill: false,
    useChromaFill: false,
    logScale: false,
    height: 150,
    interactive: false,
    hoverHint: 'カーソルを合わせた範囲のピクセルだけを画像に表示しています',
  },
)

const emit = defineEmits<{
  /** ホバー中のビン番号。離脱時は null */
  (e: 'hover-bin', bin: number | null): void
}>()

const hoverIndex = ref<number | null>(null)

function onEnter(i: number) {
  if (!props.interactive) return
  // 同じ棒の上での mousemove では再 emit しない（無駄な再描画を防ぐ）
  if (hoverIndex.value === i) return
  hoverIndex.value = i
  emit('hover-bin', i)
}

function onLeave() {
  if (!props.interactive) return
  hoverIndex.value = null
  emit('hover-bin', null)
}

const svgHeight = 1000

const maxCount = computed(() => {
  let max = 0
  for (const bin of props.data.bins) {
    if (bin.count > max) max = bin.count
  }
  return max || 1
})

/**
 * OKLCH L → sRGB グレー値の LUT（256 段階）。
 * L をそのまま sRGB 値にマッピングするとガンマが二重適用されるため、
 * OKLCH(L, 0, 0) → sRGB の逆変換で知覚的に正確なグレー値を得る。
 */
const lightnessToSrgbLut = (() => {
  const toRgb = converter('rgb')
  const lut = new Uint8Array(256)
  for (let i = 0; i < 256; i++) {
    const l = i / 255
    const srgb = toRgb({ mode: 'oklch', l, c: 0, h: 0 })
    lut[i] = Math.round(Math.max(0, Math.min(1, srgb?.r ?? 0)) * 255)
  }
  return lut
})()

const bars = computed(() =>
  props.data.bins.map((bin) => {
    const raw = props.logScale ? Math.log1p(bin.count) : bin.count
    const max = props.logScale ? Math.log1p(maxCount.value) : maxCount.value
    const h = Math.round((raw / max) * svgHeight)
    const mid = (bin.rangeStart + bin.rangeEnd) / 2
    const domain = props.data.domain
    const t = domain[1] > domain[0] ? (mid - domain[0]) / (domain[1] - domain[0]) : 0
    let fill = props.fillColor
    if (props.useGrayscaleFill) {
      const gray = lightnessToSrgbLut[Math.min(Math.round(t * 255), 255)]!
      fill = `rgb(${gray},${gray},${gray})`
    } else if (props.useChromaFill) {
      const gray = Math.min(Math.round(t * 255), 255)
      fill = `rgb(${gray},${gray},${gray})`
    }
    return { y: svgHeight - h, h, fill }
  }),
)
</script>

<style scoped>
.hint-fade-enter-active,
.hint-fade-leave-active {
  transition: opacity 0.15s ease;
}
.hint-fade-enter-from,
.hint-fade-leave-to {
  opacity: 0;
}
</style>
