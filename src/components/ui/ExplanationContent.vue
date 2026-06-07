<template>
  <div class="flex h-full flex-col">
    <!-- ヘッダー: アイコン + タイトル -->
    <div class="flex items-center gap-2.5 border-b border-border px-5 py-4">
      <slot name="icon" />
      <h2 class="text-lg font-bold text-foreground">{{ title }}について</h2>
      <div class="ml-auto">
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          @click="$emit('close')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>

    <!-- メインコンテンツ: モバイルは上部チップ列 + 下解説、md以上は左メニュー + 右解説 -->
    <div class="flex flex-1 flex-col overflow-hidden md:flex-row">
      <!-- セクション切替: モバイルは横スクロールのタブ列、md以上は縦メニュー -->
      <nav class="shrink-0 overflow-x-auto border-b border-border p-2 md:w-[30%] md:overflow-y-auto md:border-b-0 md:border-r md:p-3">
        <ul class="flex gap-1.5 md:flex-col">
          <li v-for="(item, idx) in sections" :key="idx" class="shrink-0">
            <button
              :class="[
                'whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-colors md:w-full md:whitespace-normal md:px-4 md:py-3 md:text-base',
                activeIndex === idx
                  ? 'bg-primary text-white font-medium'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              ]"
              @click="activeIndex = idx"
            >
              {{ item.label }}
            </button>
          </li>
        </ul>
      </nav>

      <!-- 解説内容 -->
      <div class="flex-1 overflow-y-auto p-4 md:p-5">
        <!-- メディアあり: 自然な高さで全体表示し、はみ出たらパネル側でスクロール -->
        <div v-if="activeSection?.video || activeSection?.image">
          <div class="overflow-hidden rounded-xl bg-muted">
            <video
              v-if="activeSection.video"
              :key="activeSection.video"
              autoplay
              muted
              loop
              playsinline
              class="w-full"
            >
              <source :src="activeSection.video" type="video/mp4" />
            </video>
            <img
              v-else
              :key="activeSection.image"
              :src="activeSection.image"
              :alt="activeSection.label"
              class="w-full"
            />
          </div>
          <div class="pt-4">
            <h3 class="mb-2 text-base font-semibold text-foreground">{{ activeSection?.label }}</h3>
            <p class="text-sm leading-relaxed text-muted-foreground">{{ activeSection?.description }}</p>
          </div>
        </div>
        <!-- プレースホルダ: 高さを 2:1 で分割するレイアウト -->
        <div v-else class="flex h-full flex-col">
          <div class="relative flex-[2] overflow-hidden rounded-xl bg-muted">
            <div class="flex h-full items-center justify-center text-muted-foreground">
              <div class="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-2 opacity-40">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                <span class="text-sm">解説動画（準備中）</span>
              </div>
            </div>
          </div>
          <!-- 下部 1/3: テキスト解説 -->
          <div class="flex-[1] pt-4">
            <h3 class="mb-2 text-base font-semibold text-foreground">{{ activeSection?.label }}</h3>
            <p class="text-sm leading-relaxed text-muted-foreground">{{ activeSection?.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

export interface ExplanationSection {
  /** メニューに表示するラベル */
  label: string
  /** テキスト解説 */
  description: string
  /** 動画 URL（未設定なら準備中プレースホルダ） */
  video?: string
  /** 画像 URL（動画がなければこちらを表示） */
  image?: string
}

const props = defineProps<{
  title: string
  sections: ExplanationSection[]
}>()

defineEmits<{
  close: []
}>()

const activeIndex = ref(0)
const activeSection = computed(() => props.sections[activeIndex.value])
</script>
