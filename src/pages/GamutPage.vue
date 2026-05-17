<template>
  <AnalysisPageLayout
    title="3D ガマット"
    description="画像に含まれるすべての色を3D空間にマッピングし、配色の広がりや偏りを立体的に確認できます"
    placeholder-text="画像をアップロードすると3Dマッピングが表示されます"
    :split-pane="true"
    pane-height="h-[calc(100vh-13rem)]"
  >
    <template #title-icon>
      <img src="@/assets/3D-icon.png" alt="" class="h-14 w-14" />
    </template>
    <template #explanation="{ close }">
      <ExplanationContent
        title="3D ガマット"
        :sections="explanationSections"
        @close="close"
      >
        <template #icon>
          <img src="@/assets/3D-icon.png" alt="" class="h-8 w-8" />
        </template>
      </ExplanationContent>
    </template>
    <template #left="{ colorAwareImageData }">
      <div class="relative">
        <ImageCanvas :image-data="colorAwareImageData.imageData" />
        <GamutBrushOverlay
          :image-data="colorAwareImageData.imageData"
          :color-space="colorAwareImageData.colorSpace"
          :brush-mode="isBrush"
          @stroke-start="beginStroke"
          @stroke-end="endStroke"
          @brush-stroke="addBrushPoints"
        />
      </div>
    </template>
    <template #default="{ colorAwareImageData }">
      <AnalysisErrorCard v-if="isAnalysisError(pointCloud(colorAwareImageData))" :message="pointCloud(colorAwareImageData)!.message" @retry="retryAnalysis(selectedImage!.id, 'gamutPointCloud')" />
      <GamutScene
        v-else-if="pointCloud(colorAwareImageData)"
        :point-cloud-data="pointCloud(colorAwareImageData)!"
        :color-space="colorAwareImageData.colorSpace"
        :mode="mode"
        :brush-data="brushData"
        @set-mode="setMode"
        @clear-brush="clearBrushPoints"
      />
      <AnalysisSpinner v-else />
    </template>
  </AnalysisPageLayout>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, watch } from 'vue'
import type { ColorAwareImageData } from '@/domain/colorSpace'
import { AnalysisPageLayout, AnalysisSpinner, AnalysisErrorCard, ExplanationContent } from '@/components/ui'
import type { ExplanationSection } from '@/components/ui'
import { isAnalysisError } from '@/types/analysis'
import GamutBrushOverlay from '@/features/gamut-3d/GamutBrushOverlay.vue'
import ImageCanvas from '@/features/image-analysis/ImageCanvas.vue'
import { useImageStore } from '@/composables/useImageStore'
import { useToast } from '@/composables/useToast'
import {
  useGamutBrush,
  MAX_BRUSH_POINTS,
} from '@/features/gamut-3d/composables/useGamutBrush'

const GamutScene = defineAsyncComponent(() =>
  import('@/features/gamut-3d/GamutScene.vue'),
)

const { selectedImage, images, getAnalysis, retryAnalysis } = useImageStore()
const { toast } = useToast()

const explanationSections: ExplanationSection[] = [
  {
    label: '3D ガマットとは',
    description: '画像内のすべての色を OKLCH 色空間の3次元座標にプロットする機能です。色の点が広く分散していれば多彩な配色、一箇所に集中していれば統一感のある配色であることがわかります。',
  },
  {
    label: '軸の読み方',
    description: '縦軸が明度（L: 0=黒〜1=白）、中心からの水平距離が彩度（C: 0=無彩色〜0.4+=高彩度）、回転角度が色相（H: 0°〜360°）を表します。',
  },
  {
    label: 'ブラシ機能',
    description: '画像上をブラシでなぞると、なぞった領域の色だけを3D空間上でハイライト表示できます。特定の部分の色がどこに分布しているか確認するのに便利です。',
  },
]

const imageId = computed(() => selectedImage.value?.id ?? '')

const {
  mode,
  isBrush,
  brushData,
  setMode,
  addBrushPoints,
  clearBrushPoints,
  beginStroke,
  endStroke,
  forgetImage,
  setOnLimitReached,
} = useGamutBrush(imageId)

// 上限到達時のトースト通知（1 ストローク中の連続通知を 1 回に抑制）
let limitToastShown = false
setOnLimitReached(() => {
  if (limitToastShown) return
  limitToastShown = true
  toast({
    title: `ブラシ点は最大 ${MAX_BRUSH_POINTS.toLocaleString()} 点です`,
    description: 'リセットしてから続けてください。',
    variant: 'info',
  })
})

// 画像が切り替わるたびに上限トーストフラグをリセット
watch(imageId, () => {
  limitToastShown = false
})

// 画像削除時に対応するブラシ状態を破棄（メモリ解放）
watch(images, (current, prev) => {
  if (!prev) return
  const currentIds = new Set(current.map((img) => img.id))
  for (const old of prev) {
    if (!currentIds.has(old.id)) forgetImage(old.id)
  }
}, { deep: false })

function pointCloud(source: ColorAwareImageData) {
  return selectedImage.value
    ? getAnalysis(selectedImage.value.id, source, 'gamutPointCloud')
    : null
}
</script>
