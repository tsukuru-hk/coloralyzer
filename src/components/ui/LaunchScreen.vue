<template>
  <Teleport to="body">
    <div
      v-if="mounted"
      class="launch-overlay"
      :class="{ 'is-fading': fadingOut }"
      @transitionend.self="onOverlayTransitionEnd"
    >
      <!-- プログレスバー -->
      <div class="progress-track">
        <div v-if="showProgress" class="progress-bar" />
      </div>

      <div class="launch-content">
        <div ref="lottieRef" class="launch-lottie" />
        <span class="progress-text" :class="{ visible: showProgress }">{{ percent }}%</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import animationData from '@/assets/animations/LottieAnimeLaunch.json'
import { useLottie } from '@/composables/useLottie'

const emit = defineEmits<{ done: [] }>()

const props = withDefaults(defineProps<{
  /**
   * Lottie のアニメが終わったあとに止まるフレーム番号。
   * 既定 `-1` は「最終フレーム」で止める（= そのまま再生完了位置で静止）。
   * Lottie JSON の最終フレームが「絵が消えた空フレーム」の場合は、
   * 絵が見える位置のフレーム番号（例: `60`）を渡して静止させる。
   */
  freezeFrame?: number
}>(), {
  freezeFrame: -1,
})

const DURATION = 500
const durationCss = `${DURATION}ms`
/** フェードアウトに使う transition 時間（ms）。CSS の transition-duration と同期。 */
const FADE_MS = 800
const fadeCss = `${FADE_MS}ms`
/**
 * Lottie ロードが無反応になった場合に備えた最大待機時間。
 * これを過ぎても `complete` が発火しなければ強制的にプログレスへ移行する（フェイルクローズド）。
 */
const LOAD_TIMEOUT_MS = 2000
/** 100% 到達後に一瞬「100%」を見せてから閉じるまでの余韻 */
const COMPLETION_HOLD_MS = 150

const mounted = ref(true)
const fadingOut = ref(false)
const showProgress = ref(false)
const percent = ref(0)
const lottieRef = ref<HTMLDivElement | null>(null)
let rafId = 0
let fallbackTimer: ReturnType<typeof setTimeout> | null = null
let holdTimer: ReturnType<typeof setTimeout> | null = null
let fadeSafetyTimer: ReturnType<typeof setTimeout> | null = null

/**
 * プログレスを RAF で進行させ、完了時に余韻を挟んでフェードアウトを開始する。
 * CSS animation の `animationend` は SFC の scoped `@keyframes` 名がハッシュ化されるため当てにせず、
 * RAF 側で完了を検知する（プログレスバーの CSS アニメ長は同じ `DURATION` で揃えている）。
 */
function startCounter(): void {
  const start = performance.now()
  function tick(): void {
    const elapsed = performance.now() - start
    percent.value = Math.min(Math.round((elapsed / DURATION) * 100), 100)
    if (elapsed < DURATION) {
      rafId = requestAnimationFrame(tick)
      return
    }
    holdTimer = setTimeout(startFadeOut, COMPLETION_HOLD_MS)
  }
  rafId = requestAnimationFrame(tick)
}

/** opacity の transition をトリガーして、完了後に要素をアンマウントする。 */
function startFadeOut(): void {
  if (fadingOut.value) return
  fadingOut.value = true
  // `transitionend` が取りこぼされた場合に備えたセーフティタイマー
  fadeSafetyTimer = setTimeout(finishUnmount, FADE_MS + 200)
}

function onOverlayTransitionEnd(event: TransitionEvent): void {
  // フェードアウト中の `opacity` transition の終了だけを取り扱う
  if (!fadingOut.value) return
  if (event.propertyName !== 'opacity') return
  finishUnmount()
}

function finishUnmount(): void {
  if (!mounted.value) return
  mounted.value = false
  emit('done')
}

/** Lottie の complete / タイムアウトのどちらでも、プログレスへの移行は1回限りで良い。 */
let progressStarted = false
function beginProgress(): void {
  if (progressStarted) return
  progressStarted = true
  if (fallbackTimer) {
    clearTimeout(fallbackTimer)
    fallbackTimer = null
  }
  const anim = lottie.getAnimation()
  if (anim) {
    // `complete` 時点で既に最終フレームなので通常は no-op。
    // 絵が見えるフレームで止めたい場合は `freezeFrame` を数値で指定する。
    const target = props.freezeFrame >= 0 ? props.freezeFrame : anim.totalFrames - 1
    anim.goToAndStop(target, true)
  }
  showProgress.value = true
  startCounter()
}

const lottie = useLottie(lottieRef, animationData, {
  loop: false,
  onComplete: beginProgress,
  onError: beginProgress,
})

onMounted(() => {
  fallbackTimer = setTimeout(beginProgress, LOAD_TIMEOUT_MS)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  if (fallbackTimer) clearTimeout(fallbackTimer)
  if (holdTimer) clearTimeout(holdTimer)
  if (fadeSafetyTimer) clearTimeout(fadeSafetyTimer)
})
</script>

<style scoped>
.launch-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  background-color: #fff;
  opacity: 1;
  transition: opacity v-bind(fadeCss) ease-in-out;
}

.launch-overlay.is-fading {
  opacity: 0;
}

.launch-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.progress-text {
  font-size: 42px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: #333;
  letter-spacing: 0.05em;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.progress-text.visible {
  opacity: 1;
}

.launch-lottie {
  width: 200px;
  height: 200px;
}

/* プログレスバー */
.progress-track {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 30px;
}

.progress-bar {
  height: 100%;
  width: 0;
  animation: progress-fill v-bind(durationCss) linear forwards, hue-shift v-bind(durationCss) linear forwards;
}

@keyframes progress-fill {
  to {
    width: 100%;
  }
}

@keyframes hue-shift {
  0%   { background-color: oklch(0.7 0.3 0); }
  25%  { background-color: oklch(0.7 0.3 90); }
  50%  { background-color: oklch(0.7 0.3 180); }
  75%  { background-color: oklch(0.7 0.3 270); }
  100% { background-color: oklch(0.7 0.3 360); }
}
</style>
