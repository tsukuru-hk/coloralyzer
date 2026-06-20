<template>
  <!-- 複数画像タブ：サムネ・削除・追加（分析ページ上部の帯） -->
  <!-- 帯にカーソルが重なった初回に、2枚目追加の誘導ヒントを出す -->
  <div class="image-tab-bar" @mouseenter="maybeShowAddHint">
    <!-- 各画像タブ + 追加 -->
    <div class="flex items-stretch gap-px overflow-x-auto bg-muted px-1.5 pt-1.5">
      <div
        v-for="img in images"
        :key="img.id"
        :class="cn(
          'group relative flex shrink-0 cursor-pointer items-center gap-2.5 px-2 py-2 text-xs transition-colors',
          img.id === selectedId
            ? 'rounded-t-lg bg-card text-foreground shadow-sm'
            : 'rounded-t-lg bg-transparent text-muted-foreground hover:bg-card/50',
        )"
        @click="selectImage(img.id)"
      >
        <img
          :src="img.thumbnailUrl"
          :alt="img.fileName"
          :class="cn(
            'h-10 w-10 rounded object-cover transition-opacity',
            img.id !== selectedId && 'opacity-50',
          )"
        />
        <span class="max-w-[140px] truncate">{{ img.fileName }}</span>
        <button
          :class="cn(
            'ml-4 flex h-5 w-5 items-center justify-center rounded-full transition-colors',
            img.id === selectedId
              ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
              : 'text-muted-foreground/50 opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100',
          )"
          @click.stop="removeImage(img.id)"
        >
          <X class="h-3.5 w-3.5" :stroke-width="2.5" />
        </button>
      </div>

      <!-- 追加ボタン -->
      <label
        v-if="canAddMore"
        :class="cn(
          'flex shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-t-lg px-4 py-2.5 text-xs transition-colors',
          dragOver
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-card/50 hover:text-foreground',
          showAddHint && 'hint-pulse-btn',
        )"
        @dragenter.prevent="dragOver = true"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
      >
        <Plus class="h-5 w-5" />
        <span class="text-[10px] leading-tight">画像追加</span>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          multiple
          class="hidden"
          @change="onFileChange"
        />
      </label>

      <!-- 2枚目追加の誘導ヒント：初回に1枚目を読み込んだときだけ約5秒表示 -->
      <Transition name="hint-fade">
        <div
          v-if="showAddHint"
          class="flex shrink-0 items-center gap-1.5 self-center pl-0.5 pr-2 text-primary"
        >
          <ArrowLeft class="hint-arrow h-7 w-7 shrink-0" :stroke-width="2.5" />
          <span class="whitespace-nowrap text-sm font-medium">2枚目の画像を入れて比較できます</span>
        </div>
      </Transition>
    </div>
    <!-- タブ列と下のコンテンツの区切り線 -->
    <div class="h-px bg-border" />
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { X, Plus, ArrowLeft } from 'lucide-vue-next'
import { useImageStore } from '@/composables/useImageStore'
import { useToast } from '@/composables/useToast'
import { cn } from '@/lib/utils'

const { images, selectedId, canAddMore, addImage, removeImage, selectImage } = useImageStore()
const { toast } = useToast()

const dragOver = ref(false)

// ── 2枚目追加の誘導ヒント ──
// 「追加」エリアは小さく見落としやすいため、セッション内で初めて1枚目を読み込んだ
// ときだけ矢印アニメ + テキストで存在を知らせる。
// sessionStorage を使うことで「リロードでは再表示しない／タブを閉じて開き直すと再表示」を満たす。
const HINT_KEY = 'coloralyzer:add-second-image-hint-shown'
const showAddHint = ref(false)
let hintTimer: ReturnType<typeof setTimeout> | null = null

function maybeShowAddHint(): void {
  if (showAddHint.value || hintTimer) return
  if (sessionStorage.getItem(HINT_KEY)) return
  // 1枚目だけが読み込まれた状態（=まだ追加できる）に限る
  if (images.value.length !== 1 || !canAddMore.value) return
  sessionStorage.setItem(HINT_KEY, '1')
  showAddHint.value = true
  hintTimer = setTimeout(() => {
    showAddHint.value = false
    hintTimer = null
  }, 5000)
}

onBeforeUnmount(() => {
  if (hintTimer) clearTimeout(hintTimer)
})

/**
 * 受け取ったファイル群を順次 `addImage` に流す。
 * - 直列処理は `loadProgress` の競合を避けるためと、`canAddMore` をファイル単位で再評価するため。
 * - 上限に達したら残りファイルは処理せず、一度だけトーストで通知する。
 */
async function handleFiles(files: File[]): Promise<void> {
  let skipped = 0
  for (const file of files) {
    if (!canAddMore.value) {
      skipped = files.length - files.indexOf(file)
      break
    }
    await addImage(file)
  }
  if (skipped > 0) {
    toast({
      title: `${skipped} 件を追加できませんでした`,
      description: '画像枚数の上限に達しています。',
      variant: 'info',
    })
  }
}

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  input.value = ''
  if (files.length > 0) void handleFiles(files)
}

function onDrop(event: DragEvent): void {
  dragOver.value = false
  const files = event.dataTransfer?.files
  if (files && files.length > 0) void handleFiles(Array.from(files))
}
</script>

<style scoped>
/* 矢印を左へ繰り返し打ちつける（左を地としたバウンス）— 「追加」ボタンへ視線を誘導。
   静止位置(0)を右の頂点、左の -8px を地面として、落ちて跳ね返る動きにする
   （静止位置より右へは出ないので、テキストとの隙間は保たれる）。 */
.hint-arrow {
  animation: hint-bounce-x 0.9s infinite;
}

@keyframes hint-bounce-x {
  0%,
  100% {
    transform: translateX(0);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  50% {
    transform: translateX(-8px);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
}

/* 追加ボタンを矢印と同じ 0.9s リズムで青く点滅させる。
   矢印が地面（左端）に達する 50% で最も青くなるよう同期させる。 */
.hint-pulse-btn {
  animation: hint-pulse-btn 0.9s infinite;
}

@keyframes hint-pulse-btn {
  50% {
    background-color: color-mix(in srgb, var(--color-primary) 14%, transparent);
    color: var(--color-primary);
  }
}

.hint-fade-enter-active,
.hint-fade-leave-active {
  transition: opacity 0.4s ease;
}
.hint-fade-enter-from,
.hint-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .hint-arrow,
  .hint-pulse-btn {
    animation: none;
  }
}
</style>
