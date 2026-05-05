<template>
  <!-- アプリシェル：左ナビ + メイン（ルートごとのページ）+ グローバル通知 -->
  <!-- ローンチアニメーション（セッション初回のみ） -->
  <LaunchScreen v-if="showLaunch" @done="onLaunchDone" />

  <div class="flex min-h-screen bg-background">
    <!-- ナビゲーション中のプログレスバー -->
    <div
      v-if="navigating"
      class="fixed inset-x-0 top-0 z-50 h-0.5 bg-primary/30"
    >
      <div class="nav-progress h-full bg-primary" />
    </div>
    <!-- グローバルナビゲーション -->
    <Sidebar />
    <!-- ルートに応じたページ（分析・デザインシステムなど） -->
    <main class="flex-1 min-w-0 p-6 overflow-auto">
      <ErrorBoundary>
        <router-view />
      </ErrorBoundary>
      <footer class="mt-12 pb-4 text-center text-xs text-muted-foreground">
        © 2026 Coloralyzer. All rights reserved.
      </footer>
    </main>
    <Toaster />
  </div>
</template>

<script setup lang="ts">
import { ref, provide, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Sidebar, Toaster, ErrorBoundary } from '@/components/ui'
import LaunchScreen from '@/components/ui/LaunchScreen.vue'

const showLaunch = ref(!sessionStorage.getItem('launched'))
if (showLaunch.value) sessionStorage.setItem('launched', '1')

/** ローンチアニメ完了フラグ — Sidebar がこれを inject して初回吹き出しを制御する */
const launchDone = ref(!showLaunch.value)
provide('launchDone', launchDone)

function onLaunchDone() {
  showLaunch.value = false
  launchDone.value = true
}

const navigating = ref(false)
const router = useRouter()

// beforeEach / afterEach は `undefined` の可能性がないよう戻り値を受け取り、
// 単一インスタンスとはいえ HMR 時の多重登録を避けるため unmount で解除する。
const stopBefore = router.beforeEach(() => {
  navigating.value = true
})
const stopAfter = router.afterEach(() => {
  navigating.value = false
})
// `afterEach` はキャンセル/失敗時に呼ばれないケースがあるため、
// `onError` でもプログレスバーを必ず閉じる（フェイルクローズド）。
const stopError = router.onError(() => {
  navigating.value = false
})

onBeforeUnmount(() => {
  stopBefore()
  stopAfter()
  stopError()
})
</script>

<style scoped>
.nav-progress {
  animation: nav-grow 1.5s ease-out forwards;
}

@keyframes nav-grow {
  0% { width: 0%; }
  50% { width: 60%; }
  80% { width: 85%; }
  100% { width: 95%; }
}
</style>
