<template>
  <!-- グローバルナビ：md 以上は左サイドバー、md 未満は画面下の固定タブバー -->
  <aside
    class="fixed bottom-0 inset-x-0 z-40 flex w-full flex-row border-t-2 border-border bg-card shrink-0 pb-[env(safe-area-inset-bottom)]
           md:sticky md:top-0 md:bottom-auto md:inset-x-auto md:z-auto md:h-screen md:w-16 md:flex-col md:border-t-0 md:border-r-2 md:pb-0"
  >
    <!-- アプリマーク（モバイルでは非表示） -->
    <div
      class="relative hidden h-14 items-center justify-center border-b-2 border-border md:flex"
      @mouseenter="playLottie"
      @mouseleave="stopLottie"
    >
      <img
        v-show="!isLottieActive"
        src="@/assets/app-icon.png"
        alt="Coloralyzer"
        class="h-11 w-11 rounded-md"
      />
      <div
        v-show="isLottieActive"
        ref="lottieContainer"
        class="h-11 w-11 rounded-md"
      />
      <!-- 吹き出し -->
      <div class="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 pointer-events-none">
        <Transition name="bubble">
          <div
            v-if="isLottieActive"
            class="relative rounded-lg bg-card border-2 border-border px-3 pt-1.5 pb-2 shadow-lg whitespace-nowrap pointer-events-auto"
          >
            <!-- 左向き三角 -->
            <div class="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-border" />
            <div class="absolute -left-[6px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[7px] border-r-card" />
            <span class="text-xs leading-none text-foreground">{{ bubbleTypedText }}</span>
          </div>
        </Transition>
      </div>
    </div>
    <!-- 主要ルート（分析ページ / デザインシステム） -->
    <nav ref="navRef" class="relative flex-1 flex flex-row justify-around gap-1 p-1 md:flex-col md:justify-start md:pt-2">
      <!-- スライドするアクティブハイライト -->
      <div
        v-if="highlightStyle"
        class="absolute rounded-lg bg-primary pointer-events-none will-change-transform"
        :style="highlightStyle"
      />
      <template v-for="(item, idx) in items" :key="item.type === 'divider' ? `divider-${idx}` : item.path">
        <div v-if="item.type === 'divider'" class="mx-1 border-l-2 border-border md:mx-0 md:my-1 md:border-l-0 md:border-t-2" />
        <router-link
          v-else
          :ref="(el) => setItemRef(item.path, el as HTMLElement | null)"
          :to="item.path"
          :aria-label="item.label"
          :class="cn(
            'relative z-[1] flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 transition-colors md:flex-none',
            isActive(item.path)
              ? 'text-white'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          )"
          @mouseenter="prefetch(item.path)"
        >
          <component :is="item.icon" class="h-5 w-5" />
          <span class="text-[10px] leading-tight text-center truncate w-full">
            {{ item.shortLabel }}
          </span>
        </router-link>
      </template>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { LayoutGrid, Droplets, Sun, Target, Box, BarChart3 } from 'lucide-vue-next'
import type { Component } from 'vue'
import { ref, computed, inject, watch, nextTick, onMounted, onBeforeUnmount, type CSSProperties, type Ref } from 'vue'
import { cn } from '@/lib/utils'
import { routeImports, type RoutePath } from '@/router'
import lottie, { type AnimationItem } from 'lottie-web'
import animationData from '@/assets/animations/LottieAnimeAppAnime.json'

const route = useRoute()
const navRef = ref<HTMLElement | null>(null)
const highlightStyle = ref<CSSProperties | null>(null)

/* --- Lottie アプリアイコン --- */
const lottieContainer = ref<HTMLElement | null>(null)
const isLottieActive = ref(false)
let lottieAnim: AnimationItem | null = null

/* --- 吹き出しタイプライター --- */
const bubbleMessage = '左メニューから分析方法を選べるよ'
const bubbleTypedCount = ref(0)
let bubbleTimer: ReturnType<typeof setInterval> | null = null

const bubbleTypedText = computed(() => bubbleMessage.slice(0, bubbleTypedCount.value))

function startBubbleTypewriter() {
  bubbleTypedCount.value = 0
  const totalChars = bubbleMessage.length
  const interval = Math.max(250 / totalChars, 20)
  bubbleTimer = setInterval(() => {
    bubbleTypedCount.value++
    if (bubbleTypedCount.value >= totalChars && bubbleTimer) {
      clearInterval(bubbleTimer)
      bubbleTimer = null
    }
  }, interval)
}

function stopBubbleTypewriter() {
  if (bubbleTimer) {
    clearInterval(bubbleTimer)
    bubbleTimer = null
  }
  bubbleTypedCount.value = 0
}

function playLottie() {
  isLottieActive.value = true
  startBubbleTypewriter()
  if (lottieAnim) {
    lottieAnim.goToAndPlay(0)
    return
  }
  nextTick(() => {
    if (!lottieContainer.value) return
    lottieAnim = lottie.loadAnimation({
      container: lottieContainer.value,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData,
    })
  })
}

function stopLottie() {
  isLottieActive.value = false
  stopBubbleTypewriter()
  if (lottieAnim) {
    lottieAnim.stop()
  }
}

onBeforeUnmount(() => {
  stopBubbleTypewriter()
  if (autoPlayTimer) clearTimeout(autoPlayTimer)
  if (autoHideTimer) clearTimeout(autoHideTimer)
  if (lottieAnim) {
    lottieAnim.destroy()
    lottieAnim = null
  }
})

/* --- 初回自動再生（ローンチアニメ完了後） --- */
const launchDone = inject<Ref<boolean>>('launchDone', ref(true))
let autoPlayTimer: ReturnType<typeof setTimeout> | null = null
let autoHideTimer: ReturnType<typeof setTimeout> | null = null

function autoPlayOnce() {
  autoPlayTimer = setTimeout(() => {
    playLottie()
    autoHideTimer = setTimeout(() => {
      stopLottie()
    }, 3000)
  }, 2000)
}

// ローンチアニメがある場合は完了を待って自動再生、ない場合は即座に発火
if (launchDone.value) {
  // ローンチアニメなし（2回目以降のセッション）→ マウント後に自動再生
  onMounted(() => autoPlayOnce())
} else {
  const stopWatch = watch(launchDone, (done) => {
    if (done) {
      stopWatch()
      autoPlayOnce()
    }
  })
}

/** 各ナビ項目の DOM 要素を保持 */
const itemRefs = new Map<RoutePath, HTMLElement>()
function setItemRef(path: RoutePath, el: unknown) {
  // router-link はコンポーネントなので $el で実 DOM を取得
  const dom = (el as { $el?: HTMLElement })?.$el ?? (el as HTMLElement | null)
  if (dom) itemRefs.set(path, dom)
  else itemRefs.delete(path)
}

/** アクティブ項目の位置にハイライトを移動（縦サイドバー / 横ボトムバー両対応） */
function updateHighlight() {
  const activePath = route.path as RoutePath
  const el = itemRefs.get(activePath)
  const nav = navRef.value
  if (!el || !nav || typeof el.getBoundingClientRect !== 'function') {
    highlightStyle.value = null
    return
  }
  const navRect = nav.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  const x = elRect.left - navRect.left
  const y = elRect.top - navRect.top
  highlightStyle.value = {
    top: '0',
    left: '0',
    width: `${elRect.width}px`,
    height: `${elRect.height}px`,
    transform: `translate(${x}px, ${y}px)`,
    transition: 'transform 300ms ease-out, width 300ms ease-out, height 300ms ease-out',
  }
}

onMounted(() => {
  nextTick(updateHighlight)
  // レイアウト切り替え（縦⇔横）やウィンドウ幅変化で位置がずれるため再計算する
  window.addEventListener('resize', updateHighlight)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateHighlight)
})

watch(() => route.path, () => {
  nextTick(updateHighlight)
})

/** ホバー時にルートチャンクを事前ロード（1パスにつき1回のみ） */
const prefetched = new Set<RoutePath>()
function prefetch(path: RoutePath): void {
  if (prefetched.has(path)) return
  prefetched.add(path)
  routeImports[path]()
}

/** ナビ項目の型（divider / link の判別は type プロパティで行う） */
type NavItem =
  | { type: 'divider' }
  | {
      type?: undefined
      path: RoutePath
      label: string
      shortLabel: string
      icon: Component
    }

const items: NavItem[] = [
  { path: '/', label: '総合分析', shortLabel: '総合', icon: LayoutGrid },
  { path: '/lightness', label: '明度 (Lightness)', shortLabel: '明度', icon: Sun },
  { path: '/chroma', label: '彩度 (Chroma)', shortLabel: '彩度', icon: Droplets },
  { path: '/hue', label: '色相 (Hue)', shortLabel: '色相', icon: Target },
  { path: '/gamut', label: '3D ガマット', shortLabel: '3D', icon: Box },
  { path: '/distribution', label: '色分布', shortLabel: '色分布', icon: BarChart3 },
]

function isActive(path: RoutePath): boolean {
  return route.path === path
}
</script>

<style scoped>
.bubble-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.bubble-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.bubble-enter-from,
.bubble-leave-to {
  opacity: 0;
  transform: translateX(-6px);
}
.bubble-enter-to,
.bubble-leave-from {
  opacity: 1;
  transform: translateX(0);
}
</style>
