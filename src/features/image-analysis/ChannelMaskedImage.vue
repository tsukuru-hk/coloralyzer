<template>
  <div class="canvas-wrap">
    <!-- 下層：常にフル画像を描画。分析モードの背後で見える土台 -->
    <canvas ref="baseRef" class="preview base" />
    <!-- 上層：選択ビンのみ表示するマスク版。activeBin の有無で 0.5s フェード -->
    <canvas
      ref="maskRef"
      class="preview mask"
      :style="{ opacity: activeBin !== null ? 1 : 0 }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  /** 実際に描画するピクセル（オリジナル画像 or グレースケール） */
  displayData: ImageData
  /** ピクセルごとが属するビン番号 (0..binCount-1) の配列 */
  binMap: Uint8Array
  /** 透明判定に使う元画像の RGBA バッファ */
  alphaData: Uint8ClampedArray
  /** 表示するビン番号。null なら全体をそのまま表示 */
  activeBin: number | null
}>()

const baseRef = ref<HTMLCanvasElement | null>(null)
const maskRef = ref<HTMLCanvasElement | null>(null)

// 下層（フル画像）：displayData が変わったときだけ描き直す
watch(
  () => props.displayData,
  async () => {
    await nextTick()
    drawBase()
  },
  { immediate: true },
)

// 上層（マスク版）：activeBin が指定されている間だけ内容を更新する。
// null になっても内容は消さず、opacity フェードで消えるに任せる。
watch(
  [() => props.activeBin, () => props.displayData, () => props.binMap],
  async () => {
    if (props.activeBin === null) return
    await nextTick()
    drawMask(props.activeBin)
  },
  { immediate: true },
)

function drawBase() {
  const canvas = baseRef.value
  if (!canvas) return
  const display = props.displayData
  canvas.width = display.width
  canvas.height = display.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.putImageData(display, 0, 0)
}

function drawMask(activeBin: number) {
  const canvas = maskRef.value
  if (!canvas) return
  const display = props.displayData
  canvas.width = display.width
  canvas.height = display.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const binMap = props.binMap
  const alphaData = props.alphaData

  const src = display.data
  const out = ctx.createImageData(display.width, display.height)
  const od = out.data
  const count = display.width * display.height
  for (let i = 0; i < count; i++) {
    const off = i * 4
    const alpha = alphaData[off + 3]!
    if (alpha >= 128 && binMap[i] === activeBin) {
      od[off] = src[off]!
      od[off + 1] = src[off + 1]!
      od[off + 2] = src[off + 2]!
      od[off + 3] = 255
    } else {
      // 範囲外は透明にし、CSS のチェッカーボード背景を透けさせる
      // （白に近い画素が白背景に溶けて見えなくなるのを防ぐ）
      od[off + 3] = 0
    }
  }
  ctx.putImageData(out, 0, 0)
}
</script>

<style scoped>
.canvas-wrap {
  position: relative;
  display: inline-block;
  max-width: 100%;
  margin: 0;
  line-height: 0;
}
.preview {
  display: block;
  max-width: 100%;
  height: auto;
  border: 1px solid #ddd;
  box-sizing: border-box;
}
/* 上層は下層にぴったり重ね、opacity でクロスフェードさせる */
.preview.mask {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transition: opacity 0.5s ease;
  /* 範囲外の透明部分に敷くチェッカーボード。
     白に近い画素も視認できるよう、白を含まない 2 色のグレーを使う。 */
  --checker-a: #c9c9c9;
  --checker-b: #a4a4a4;
  background-image:
    linear-gradient(45deg, var(--checker-b) 25%, transparent 25%),
    linear-gradient(-45deg, var(--checker-b) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--checker-b) 75%),
    linear-gradient(-45deg, transparent 75%, var(--checker-b) 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
  background-color: var(--checker-a);
}
</style>
