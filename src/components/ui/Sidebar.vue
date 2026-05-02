<template>
  <!-- グローバル左ナビ：ロゴ + ルートリンク一覧 -->
  <aside class="flex h-screen w-16 flex-col border-r border-border bg-card shrink-0">
    <!-- アプリマーク -->
    <div class="flex h-14 items-center justify-center border-b border-border">
      <img src="@/assets/app-icon.png" alt="Coloralyzer" class="h-8 w-8 rounded-lg" />
    </div>
    <!-- 主要ルート（分析ページ / デザインシステム） -->
    <nav ref="navRef" class="relative flex-1 flex flex-col gap-1 p-1 pt-2">
      <!-- スライドするアクティブハイライト -->
      <div
        v-if="highlightStyle"
        class="absolute left-1 right-1 rounded-lg bg-primary pointer-events-none will-change-transform"
        :style="highlightStyle"
      />
      <template v-for="(item, idx) in items" :key="item.type === 'divider' ? `divider-${idx}` : item.path">
        <div v-if="item.type === 'divider'" class="my-1 border-t border-border" />
        <router-link
          v-else
          :ref="(el) => setItemRef(item.path, el as HTMLElement | null)"
          :to="item.path"
          :aria-label="item.label"
          :class="cn(
            'relative z-[1] flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 transition-colors',
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
import { LayoutDashboard, Droplets, Sun, Rainbow, Box, BarChart3 } from 'lucide-vue-next'
import type { Component } from 'vue'
import { ref, watch, nextTick, onMounted, type CSSProperties } from 'vue'
import { cn } from '@/lib/utils'
import { routeImports, type RoutePath } from '@/router'

const route = useRoute()
const navRef = ref<HTMLElement | null>(null)
const highlightStyle = ref<CSSProperties | null>(null)

/** 各ナビ項目の DOM 要素を保持 */
const itemRefs = new Map<RoutePath, HTMLElement>()
function setItemRef(path: RoutePath, el: unknown) {
  // router-link はコンポーネントなので $el で実 DOM を取得
  const dom = (el as { $el?: HTMLElement })?.$el ?? (el as HTMLElement | null)
  if (dom) itemRefs.set(path, dom)
  else itemRefs.delete(path)
}

/** アクティブ項目の位置にハイライトを移動 */
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
  const y = elRect.top - navRect.top
  highlightStyle.value = {
    top: '0',
    height: `${elRect.height}px`,
    transform: `translateY(${y}px)`,
    transition: 'transform 300ms ease-out',
  }
}

onMounted(() => {
  nextTick(updateHighlight)
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
  { path: '/', label: '総合分析', shortLabel: '総合', icon: LayoutDashboard },
  { path: '/lightness', label: '明度 (Lightness)', shortLabel: '明度', icon: Sun },
  { path: '/chroma', label: '彩度 (Chroma)', shortLabel: '彩度', icon: Droplets },
  { path: '/hue', label: '色相 (Hue)', shortLabel: '色相', icon: Rainbow },
  { path: '/gamut', label: '3D ガマット', shortLabel: '3D', icon: Box },
  { path: '/distribution', label: '色分布', shortLabel: '色分布', icon: BarChart3 },
]

function isActive(path: RoutePath): boolean {
  return route.path === path
}
</script>
