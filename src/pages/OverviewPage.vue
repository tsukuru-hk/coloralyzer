<template>
  <AnalysisPageLayout
    title="色彩の総合分析"
    description="画像の配色を明度・彩度・色相の3軸でまとめて俯瞰します"
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
  },
  {
    label: '明度スコアの見方',
    description: '明度スコアは画像全体の明るさの傾向を示します。値が高いほどハイキー（明るい印象）、低いほどローキー（暗い印象）の画像です。',
  },
  {
    label: '彩度スコアの見方',
    description: '彩度スコアは画像全体の鮮やかさの傾向を示します。値が高いほどカラフルで、低いほどモノトーンに近い配色です。',
  },
  {
    label: '色相の偏り',
    description: '色相の偏りは、画像が特定の色味に集中しているか、幅広い色を使っているかを示します。偏りが大きいほど統一感のある配色です。',
  },
]
</script>
