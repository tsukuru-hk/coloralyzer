<template>
  <!-- ページ：明度 — Lightness をグレースケール可視化 -->
  <AnalysisPageLayout
    title="明度分析"
    description="画像のどこが明るく、どこが暗いかを可視化し、明度のバランスを分析します"
    placeholder-text="画像をアップロードすると明度分析が表示されます"
  >
    <template #title-icon>
      <img src="@/assets/Lightness-icon.png" alt="" class="h-14 w-14" />
    </template>
    <template #explanation="{ close }">
      <ExplanationContent
        title="明度分析"
        :sections="explanationSections"
        @close="close"
      >
        <template #icon>
          <img src="@/assets/Lightness-icon.png" alt="" class="h-8 w-8" />
        </template>
      </ExplanationContent>
    </template>
    <template #default="{ colorAwareImageData }">
      <div v-if="selectedImage" class="space-y-4">
        <div>
          <h3 class="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            明度グレースケール
            <InfoTooltip content="OKLCH の Lightness 値をそのままグレースケールで可視化したものです。白いほど明るく、黒いほど暗いピクセルであることを示します。" />
          </h3>
          <AnalysisErrorCard v-if="isAnalysisError(lightnessMap(colorAwareImageData))" :message="lightnessMap(colorAwareImageData)!.message" @retry="retryAnalysis(selectedImage!.id, 'lightnessMap')" />
          <LightnessMapPanel v-else-if="lightnessMap(colorAwareImageData)" :lightness-map-data="lightnessMap(colorAwareImageData)!" />
          <AnalysisSpinner v-else class="aspect-square" />
        </div>
        <div>
          <h3 class="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            明度ヒストグラム
            <InfoTooltip content="画像内の全ピクセルの OKLCH Lightness 値の分布を示すヒストグラムです。横軸が明度、縦軸がピクセル数を表します。" />
            <span class="ml-auto flex items-center gap-1 scale-75 origin-right">
              <span class="text-[10px] text-muted-foreground select-none">Log</span>
              <Toggle v-model="lightnessLogScale" />
            </span>
          </h3>
          <AnalysisErrorCard v-if="isAnalysisError(lightnessHistogram(colorAwareImageData))" :message="lightnessHistogram(colorAwareImageData)!.message" @retry="retryAnalysis(selectedImage!.id, 'lightnessHistogram')" />
          <LightnessHistogramPanel v-else-if="lightnessHistogram(colorAwareImageData)" :histogram-data="lightnessHistogram(colorAwareImageData)!" :log-scale="lightnessLogScale" />
          <AnalysisSpinner v-else />
        </div>
        <div>
          <Legend
            title="Lightness (明度)"
            min-label="0 (黒)"
            max-label="1.0 (白)"
            gradient="linear-gradient(to right, #000, #fff)"
          />
        </div>
      </div>
    </template>
  </AnalysisPageLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ColorAwareImageData } from '@/domain/colorSpace'
import AnalysisPageLayout from '@/components/ui/AnalysisPageLayout.vue'
import { Legend, InfoTooltip, Toggle, AnalysisErrorCard, AnalysisSpinner, ExplanationContent } from '@/components/ui'
import type { ExplanationSection } from '@/components/ui'
import { isAnalysisError } from '@/types/analysis'
import { LightnessMapPanel, LightnessHistogramPanel } from '@/features/lightness-map'
import { useImageStore } from '@/composables/useImageStore'

const { selectedImage, getAnalysis, retryAnalysis } = useImageStore()
const lightnessLogScale = ref(false)

const explanationSections: ExplanationSection[] = [
  {
    label: '明度分析とは',
    description: '明度（Lightness）は色の明るさを表す属性で、OKLCH 色空間では 0（黒）〜 1（白）の範囲で表現されます。画像のどこが明るく、どこが暗いかを分析します。',
  },
  {
    label: '明度グレースケールとは',
    description: '各ピクセルの OKLCH Lightness 値をそのままグレースケールで可視化したものです。白いほど明るく、黒いほど暗いピクセルであることを示します。',
  },
  {
    label: '明度ヒストグラムとは',
    description: '明度値ごとのピクセル数の分布を示すヒストグラムです。ピークの位置で画像全体のトーン（ハイキー/ローキー）を判断できます。Log スケールに切り替えると少数派の明度帯も確認しやすくなります。',
  },
]

function lightnessMap(source: ColorAwareImageData) {
  return selectedImage.value ? getAnalysis(selectedImage.value.id, source, 'lightnessMap') : null
}
function lightnessHistogram(source: ColorAwareImageData) {
  return selectedImage.value ? getAnalysis(selectedImage.value.id, source, 'lightnessHistogram') : null
}
</script>
