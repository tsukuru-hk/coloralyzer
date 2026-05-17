<template>
  <!-- ページ：彩度 — Chroma をグレースケール可視化 -->
  <AnalysisPageLayout
    title="彩度分析"
    description="画像のどこが鮮やかで、どこが落ち着いた色かを可視化し、彩度の分布を分析します"
    placeholder-text="画像をアップロードすると彩度分析が表示されます"
  >
    <template #title-icon>
      <img src="@/assets/Chroma-icon.png" alt="" class="h-14 w-14" />
    </template>
    <template #explanation="{ close }">
      <ExplanationContent
        title="彩度分析"
        :sections="explanationSections"
        @close="close"
      >
        <template #icon>
          <img src="@/assets/Chroma-icon.png" alt="" class="h-8 w-8" />
        </template>
      </ExplanationContent>
    </template>
    <template #default="{ colorAwareImageData }">
      <div class="space-y-4">
        <div>
          <SectionLabel>
            彩度グレースケール
            <InfoTooltip content="OKLCH の Chroma 値を 0〜1 に正規化し、グレースケールで可視化したものです。白いほど彩度が高く、黒いほど無彩色に近いことを示します。" />
          </SectionLabel>
          <AnalysisErrorCard v-if="isAnalysisError(chromaMap(colorAwareImageData))" :message="chromaMap(colorAwareImageData)!.message" @retry="retryAnalysis(selectedImage!.id, 'chromaMap')" />
          <ChromaMapPanel v-else-if="chromaMap(colorAwareImageData)" :chroma-map-data="chromaMap(colorAwareImageData)!" />
          <AnalysisSpinner v-else class="aspect-square" />
        </div>
        <div>
          <SectionLabel>
            彩度ヒストグラム
            <InfoTooltip content="画像内の全ピクセルの OKLCH Chroma 値の分布を示すヒストグラムです。横軸が彩度、縦軸がピクセル数を表します。" />
            <span class="ml-auto flex items-center gap-1 scale-75 origin-right">
              <span class="text-[10px] text-muted-foreground select-none">Log</span>
              <Toggle v-model="chromaLogScale" />
            </span>
          </SectionLabel>
          <AnalysisErrorCard v-if="isAnalysisError(chromaHistogram(colorAwareImageData))" :message="chromaHistogram(colorAwareImageData)!.message" @retry="retryAnalysis(selectedImage!.id, 'chromaHistogram')" />
          <ChromaHistogramPanel v-else-if="chromaHistogram(colorAwareImageData)" :histogram-data="chromaHistogram(colorAwareImageData)!" :log-scale="chromaLogScale" />
          <AnalysisSpinner v-else />
        </div>
        <div>
          <Legend
            title="Chroma (彩度)"
            min-label="0 (無彩色)"
            max-label="0.4+ (高彩度)"
gradient="linear-gradient(to right, oklch(0.55 0 0), oklch(0.84 0.4 145))"
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
import { Legend, InfoTooltip, Toggle, AnalysisSpinner, AnalysisErrorCard, ExplanationContent, SectionLabel } from '@/components/ui'
import type { ExplanationSection } from '@/components/ui'
import { isAnalysisError } from '@/types/analysis'
import { ChromaMapPanel, ChromaHistogramPanel } from '@/features/grayscale-map'
import { useImageStore } from '@/composables/useImageStore'

const { selectedImage, getAnalysis, retryAnalysis } = useImageStore()
const chromaLogScale = ref(false)

const explanationSections: ExplanationSection[] = [
  {
    label: '彩度分析とは',
    description: '彩度（Chroma）は色の鮮やかさを表す属性で、値が大きいほど鮮やかで、0 に近いほど無彩色（グレー）に近づきます。画像のどこが鮮やかで、どこが落ち着いた色かを分析します。',
  },
  {
    label: '彩度グレースケールとは',
    description: '各ピクセルの OKLCH Chroma 値をグレースケールで可視化したものです。白いほど鮮やかなピクセル、黒いほど無彩色に近いピクセルです。',
  },
  {
    label: '彩度ヒストグラムとは',
    description: '彩度値ごとのピクセル数分布を示し、画像がどの程度カラフルか、彩度の偏りはどこにあるかを確認できます。Log スケールで少数派の高彩度ピクセルも確認できます。',
  },
]

function chromaMap(source: ColorAwareImageData) {
  return selectedImage.value ? getAnalysis(selectedImage.value.id, source, 'chromaMap') : null
}
function chromaHistogram(source: ColorAwareImageData) {
  return selectedImage.value ? getAnalysis(selectedImage.value.id, source, 'chromaHistogram') : null
}
</script>
