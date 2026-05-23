<template>
  <AnalysisPageLayout
    title="色彩の総合分析"
    description="画像を読み込むだけで、色彩の全体像を瞬時に把握。配色の強みや偏りを、数値とビジュアルで確認できます。"
    placeholder-text="画像をアップロードすると色彩の総合分析が表示されます"
    full-width
  >
    <template #title-icon>
      <img src="@/assets/Overview-icon.png" alt="" class="h-14 w-14" />
    </template>
    <template #explanation="{ close }">
      <ExplanationContent
        title="色彩の総合分析"
        :sections="explanationSections"
        @close="close"
      >
        <template #icon>
          <img src="@/assets/Overview-icon.png" alt="" class="h-8 w-8" />
        </template>
      </ExplanationContent>
    </template>
    <template #default="{ colorAwareImageData }">
      <OverviewGrid :color-aware-image-data="colorAwareImageData" />
    </template>
  </AnalysisPageLayout>
</template>

<script setup lang="ts">
import AnalysisPageLayout from '@/components/ui/AnalysisPageLayout.vue'
import { ExplanationContent } from '@/components/ui'
import type { ExplanationSection } from '@/components/ui'
import { OverviewGrid } from '@/features/overview'

const explanationSections: ExplanationSection[] = [
  {
    label: '色彩の総合分析とは',
    description: '画像全体の配色を明度・彩度・色相の3軸でまとめて俯瞰する機能です。各指標のハイライトや統計値を一覧で確認でき、画像の色彩特徴を素早く把握できます。',
    image: '/explanations/overview-summary.png',
  },
]
</script>
