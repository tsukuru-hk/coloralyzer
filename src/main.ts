/**
 * エントリ：Vue アプリ生成、スタイル・ルータ適用、`#app` へマウント。
 */
import { createApp } from 'vue'
import '@/assets/css/tailwind.css'
import App from './App.vue'
import router, { routeImports } from './router'
import { useToast } from '@/composables/useToast'

// --- 全ページチャンクの先読み ---
// デプロイで旧ハッシュのチャンクがサーバーから消えても、メモリに載った後なら
// タブ切り替えはネットワークに触れないため壊れない。
const RELOADED_KEY = 'coloralyzer:chunk-reloaded'
const prefetchAllRoutes = () => {
  Promise.all(Object.values(routeImports).map((load) => load()))
    // 全チャンクが揃ったら自動リロード保険をリセット（次のデプロイ跨ぎに備える）
    .then(() => sessionStorage.removeItem(RELOADED_KEY))
    .catch(() => {}) // 失敗してもタブ切り替え時に再試行される
}
if ('requestIdleCallback' in window) {
  requestIdleCallback(prefetchAllRoutes, { timeout: 5000 })
} else {
  setTimeout(prefetchAllRoutes, 2000)
}

// 先読み完了前にデプロイを跨いでチャンク取得に失敗した場合の保険：一度だけ自動リロード。
// リロード後も失敗する場合は ErrorBoundary（再読み込みボタン）に任せる。
window.addEventListener('vite:preloadError', (e) => {
  if (sessionStorage.getItem(RELOADED_KEY)) return
  sessionStorage.setItem(RELOADED_KEY, '1')
  e.preventDefault()
  window.location.reload()
})

const app = createApp(App)

// --- グローバルエラーハンドラ ---
app.config.errorHandler = (err, _instance, info) => {
  console.error(`[Vue Error] ${info}:`, err)
  const { toast } = useToast()
  toast({
    title: '予期しないエラーが発生しました',
    description: err instanceof Error ? err.message : String(err),
    variant: 'error',
  })
}

window.addEventListener('unhandledrejection', (e) => {
  console.error('[Unhandled Rejection]', e.reason)
  const { toast } = useToast()
  toast({
    title: '非同期処理でエラーが発生しました',
    description: e.reason instanceof Error ? e.reason.message : String(e.reason),
    variant: 'error',
  })
})

app.use(router).mount('#app')
