<template>
  <!-- 分析ページ共通レイアウト：見出し → 画像投入 or ギャラリー付き分析エリア -->
  <div>
    <!-- ページ見出し -->
    <div class="flex items-center gap-3">
      <div v-if="slots['title-icon']" class="flex h-14 w-14 shrink-0 items-center justify-center">
        <slot name="title-icon" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-foreground">{{ title }}</h1>
        <p v-if="description" class="mt-1 text-sm text-muted-foreground">{{ description }}</p>
      </div>
    </div>

    <!-- 分析エリア：画像が1枚以上あるとき — タブバー + 2カラム（オリジナル / 分析結果） -->
    <div v-if="images.length > 0" class="mt-6 overflow-hidden rounded-xl border-2 border-border">
      <ImageGalleryBar />
      <!-- Split Pane モード：ドラッグで比率調整可能 -->
      <SplitPane v-if="selectedImage && splitPane" :default-ratio="0.3" :min-ratio="0.15" :max-ratio="0.85" :class="[paneHeight, 'bg-card']">
        <template #left>
          <div class="h-full overflow-auto p-4">
            <h3 class="mb-2 text-sm font-medium text-muted-foreground">オリジナル画像</h3>
            <slot v-if="slots.left" name="left" :color-aware-image-data="selectedImage!.colorAwareImageData" />
            <ImageCanvas v-else :image-data="selectedImage!.colorAwareImageData.imageData" />
          </div>
        </template>
        <template #right>
          <div class="relative h-full">
            <slot :color-aware-image-data="selectedImage.colorAwareImageData" />
          </div>
        </template>
      </SplitPane>
      <!-- フルワイドモード：スロットに全幅を委ねる -->
      <div v-else-if="selectedImage && fullWidth" class="bg-card p-4">
        <slot :color-aware-image-data="selectedImage.colorAwareImageData" />
      </div>
      <!-- 通常モード：固定 2 カラム -->
      <div v-else-if="selectedImage" class="grid grid-cols-2 gap-6 bg-card p-4">
        <div>
          <h3 class="mb-2 text-sm font-medium text-muted-foreground">オリジナル画像</h3>
          <ImageCanvas :image-data="selectedImage.colorAwareImageData.imageData" />
        </div>
        <div>
          <h3 v-if="analysisTitle" class="mb-2 text-sm font-medium text-muted-foreground">{{ analysisTitle }}</h3>
          <slot :color-aware-image-data="selectedImage.colorAwareImageData" />
        </div>
      </div>
      <div v-if="loadProgress === 'loading'" class="bg-card p-6 text-sm text-muted-foreground">読み込み中...</div>
    </div>

    <!-- 初回：画像未選択 — 画面中央にドロップゾーン -->
    <div v-else class="flex flex-1 items-center justify-center" style="min-height: calc(100vh - 12rem)">
      <div class="w-full max-w-2xl">
        <div class="mb-4 flex justify-center">
          <div class="flex items-center gap-2">
            <div ref="uploadLottieRef" class="h-16 w-16 shrink-0" />
            <p class="text-2xl font-bold text-muted-foreground whitespace-nowrap">{{ typedText }}<span class="invisible">{{ placeholderText.slice(typedCount) }}</span></p>
          </div>
        </div>
        <DropZone class="aspect-[5/4]" @hover-change="onDropzoneHover" @files-selected="onFilesSelected" />
        <div v-if="loadProgress === 'loading'" class="mt-4 text-center text-sm text-muted-foreground">読み込み中...</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, useSlots } from 'vue'
import { DropZone, SplitPane } from '@/components/ui'
import ImageGalleryBar from '@/components/ui/ImageGalleryBar.vue'
import ImageCanvas from '@/features/image-analysis/ImageCanvas.vue'
import { useImageStore } from '@/composables/useImageStore'
import { useToast } from '@/composables/useToast'
import { useLottie } from '@/composables/useLottie'
import uploadWaitData from '@/assets/animations/LottieAnimeUploadWait.json'
import uploadHoverData from '@/assets/animations/LottieAnimeUploadHover.json'

const props = withDefaults(defineProps<{
  /** ページタイトル（h1） */
  title: string
  /** タイトル直下の説明文 */
  description?: string
  /** 右カラム見出し（例: 「彩度グレースケール」） */
  analysisTitle?: string
  /** 画像未投入時のヒントテキスト */
  placeholderText?: string
  /** Split Pane モード（ドラッグで比率調整可能な 2 ペイン） */
  splitPane?: boolean
  /** SplitPane の高さクラス（デフォルト: h-[70vh]） */
  paneHeight?: string
  /** フルワイドモード（2 カラムを無効化し、スロットに全幅を委ねる） */
  fullWidth?: boolean
}>(), {
  placeholderText: '画像をアップロードすると分析結果が表示されます',
  splitPane: false,
  paneHeight: 'h-[70vh]',
  fullWidth: false,
})

const slots = useSlots()
const { images, selectedImage, loadProgress, canAddMore, addImage } = useImageStore()
const { toast } = useToast()

const uploadLottieRef = ref<HTMLDivElement | null>(null)
/** Lottie の表示用アニメデータ。`useLottie` に Ref で渡すとホバー時も再ロードされる。 */
const currentUploadAnim = ref<unknown>(uploadWaitData)
useLottie(uploadLottieRef, currentUploadAnim, { loop: true, autoplay: true })

/** 直前のホバー状態。不要な再ロードを避けるためのメモ。 */
let lastHovered = false
function onDropzoneHover(hovered: boolean): void {
  if (hovered === lastHovered) return
  lastHovered = hovered
  currentUploadAnim.value = hovered ? uploadHoverData : uploadWaitData
}

/**
 * DropZone から受けた妥当なファイル群を直列に投入する。
 * - 並列だと `loadProgress` の状態が競合するため直列化。
 * - 上限に達したら残件を破棄し、一度だけトーストで通知する（フェイルクローズド）。
 */
async function onFilesSelected(files: File[]): Promise<void> {
  let skipped = 0
  for (const [index, file] of files.entries()) {
    if (!canAddMore.value) {
      skipped = files.length - index
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

// ── タイプライターエフェクト ──
const typedCount = ref(0)
let typeTimer: ReturnType<typeof setInterval> | null = null

function startTypewriter(text: string): void {
  if (typeTimer) {
    clearInterval(typeTimer)
    typeTimer = null
  }
  typedCount.value = 0
  const totalChars = text.length
  if (totalChars === 0) return
  const interval = Math.max(500 / totalChars, 16)
  typeTimer = setInterval(() => {
    typedCount.value++
    if (typedCount.value >= totalChars && typeTimer) {
      clearInterval(typeTimer)
      typeTimer = null
    }
  }, interval)
}

const typedText = computed(() => props.placeholderText.slice(0, typedCount.value))

// placeholderText が動的に変わっても安全に再始動する
watch(
  () => props.placeholderText,
  (text) => startTypewriter(text),
)

// 全画像が削除されて DropZone が再表示されたときにタイプライターをリセット
watch(
  () => images.value.length,
  (newLen, oldLen) => {
    if (newLen === 0 && oldLen > 0) {
      lastHovered = false
      currentUploadAnim.value = uploadWaitData
      startTypewriter(props.placeholderText)
    }
  },
)

onMounted(() => {
  startTypewriter(props.placeholderText)
})

onBeforeUnmount(() => {
  if (typeTimer) clearInterval(typeTimer)
})
</script>
