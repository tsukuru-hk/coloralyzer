<template>
  <Teleport to="body">
    <div
      v-if="mounted"
      class="launch-overlay"
      :class="{ 'is-fading': fadingOut }"
      @transitionend.self="onOverlayTransitionEnd"
    >
      <div class="launch-content">
        <div ref="lottieRef" class="launch-lottie" />
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

/** フェードアウトに使う transition 時間（ms）。CSS の transition-duration と同期。 */
const FADE_MS = 800
const fadeCss = `${FADE_MS}ms`
/**
 * Lottie がロードすら完了しないときに UI が永続するのを避けるための最大待機時間。
 * DOM 展開が確認できたらこのタイマーは解除し、アニメの長さに関わらず `complete` を待つ。
 */
const LOAD_TIMEOUT_MS = 3000

const mounted = ref(true)
const fadingOut = ref(false)
const lottieRef = ref<HTMLDivElement | null>(null)
let fallbackTimer: ReturnType<typeof setTimeout> | null = null
let fadeSafetyTimer: ReturnType<typeof setTimeout> | null = null

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

/** Lottie の complete / タイムアウトのどちらでも、フェードアウトへの移行は1回限りで良い。 */
let finishStarted = false
function beginFinish(): void {
  if (finishStarted) return
  finishStarted = true
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
  startFadeOut()
}

/** ローンチアニメの再生速度。1.3 倍速で再生し、サイト表示までの待ち時間を短縮する */
const LOTTIE_SPEED = 1.3

const lottie = useLottie(lottieRef, animationData, {
  loop: false,
  speed: LOTTIE_SPEED,
  // ロードが確認できたらタイムアウトによる打ち切りを解除し、アニメを最後まで再生させる
  onReady: () => {
    if (fallbackTimer) {
      clearTimeout(fallbackTimer)
      fallbackTimer = null
    }
  },
  onComplete: beginFinish,
  onError: beginFinish,
})

onMounted(() => {
  fallbackTimer = setTimeout(beginFinish, LOAD_TIMEOUT_MS)
})

onBeforeUnmount(() => {
  if (fallbackTimer) clearTimeout(fallbackTimer)
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

.launch-lottie {
  width: 200px;
  height: 200px;
}
</style>
