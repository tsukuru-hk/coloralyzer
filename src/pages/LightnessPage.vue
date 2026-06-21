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
    <template #default>
      <div v-if="imageId" class="space-y-4">
        <div>
          <div class="flex items-center justify-between gap-2">
            <SectionLabel>
              明度グレースケール
              <InfoTooltip content="OKLCH の Lightness 値をそのままグレースケールで可視化したものです。白いほど明るく、黒いほど暗いピクセルであることを示します。" />
            </SectionLabel>
            <DownloadButton
              v-if="lightnessMapResult"
              @click="downloadLightnessMap"
            />
          </div>
          <AnalysisErrorCard v-if="lightnessMapError" :message="lightnessMapError.message" @retry="retryLightnessMap" />
          <LightnessMapPanel v-else-if="lightnessMapResult" :lightness-map-data="lightnessMapResult" />
          <AnalysisSpinner v-else class="aspect-square" />
        </div>
        <div>
          <SectionLabel>
            明度ヒストグラム
            <InfoTooltip content="画像内の全ピクセルの OKLCH Lightness 値の分布を示すヒストグラムです。横軸が明度、縦軸がピクセル数を表します。" />
            <span class="ml-auto flex items-center gap-1 scale-75 origin-right">
              <span class="text-[10px] text-muted-foreground select-none">Log</span>
              <Toggle v-model="lightnessLogScale" />
            </span>
          </SectionLabel>
          <AnalysisErrorCard v-if="lightnessHistogramError" :message="lightnessHistogramError.message" @retry="retryLightnessHistogram" />
          <LightnessHistogramPanel v-else-if="lightnessHistogramResult" :histogram-data="lightnessHistogramResult" :log-scale="lightnessLogScale" />
          <AnalysisSpinner v-else />
        </div>
        <div>
          <SectionLabel>
            明度分布バー
            <InfoTooltip content="画像内の明度の占有比率を横棒で可視化したものです。各セグメントの幅がピクセル数の割合に対応します。" />
          </SectionLabel>
          <LightnessDistributionBar v-if="lightnessHistogramResult" :data="lightnessHistogramResult" />
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
import AnalysisPageLayout from '@/components/ui/AnalysisPageLayout.vue'
import { Legend, InfoTooltip, Toggle, AnalysisErrorCard, AnalysisSpinner, ExplanationContent, SectionLabel, DownloadButton } from '@/components/ui'
import type { ExplanationSection } from '@/components/ui'
import { LightnessMapPanel, LightnessHistogramPanel, LightnessDistributionBar } from '@/features/lightness-map'
import { useAnalysisResult } from '@/composables/useAnalysisResult'
import { useImageStore } from '@/composables/useImageStore'
import { useToast } from '@/composables/useToast'
import { exportImageDataAsPng } from '@/infrastructure/pngExport'
import { buildExportFileName, EXPORT_SUFFIX } from '@/domain/exportFileName'

const { selectedImage } = useImageStore()
const { toast } = useToast()

const lightnessLogScale = ref(false)

/** 明度グレースケールを PNG として保存する */
async function downloadLightnessMap() {
  const data = lightnessMapResult.value
  const fileName = selectedImage.value?.fileName
  if (!data || !fileName) return
  const result = await exportImageDataAsPng(
    data,
    buildExportFileName(fileName, EXPORT_SUFFIX.lightnessGrayscale),
  )
  if (result.isFailure()) {
    toast({ title: 'ダウンロードに失敗しました', description: result.error.message, variant: 'error' })
  }
}

const {
  imageId,
  error: lightnessMapError,
  result: lightnessMapResult,
  retry: retryLightnessMap,
} = useAnalysisResult('lightnessMap')

const {
  error: lightnessHistogramError,
  result: lightnessHistogramResult,
  retry: retryLightnessHistogram,
} = useAnalysisResult('lightnessHistogram')

const explanationSections: ExplanationSection[] = [
  {
    label: '明度分析とは',
    description: '明度とは、ひとことで言えば色の「明るさ」のことです。同じ青でも空色は明るく、紺色は暗い——この明暗の度合いが明度です。本サイトでは人間の知覚に沿った OKLCH 色空間を採用しており、明度は Lightness（L）として 0（真っ黒）〜 1（真っ白）の数値で定義されます。この分析ページでは、画像の各ピクセルの L 値をグレースケールやヒストグラムで可視化し、画像全体の明暗の傾向を把握できるようにしています。',
    image: '/explanations/lightness-overview.png',
  },
  {
    label: '明度グレースケールとは',
    description: 'グレースケール画像で、元の画像のどこが明るく、どこが暗いかが一目でわかります。白く表示されている部分ほど明るいピクセル、黒く表示されている部分ほど暗いピクセルです。色味や鮮やかさの情報を取り除き、純粋に「明るさだけ」を見える化した画像と考えてください。本サイトでは知覚的に均一な OKLCH 色空間の Lightness 値を使っているため、人間の目が感じる明暗の差とグレースケールの濃淡が自然に一致します。',
    image: '/explanations/lightness-grayscale.png',
  },
  {
    label: '明度ヒストグラムとは',
    description: '画像全体の明るさの分布をグラフで確認できます。横軸が明度（左が暗い、右が明るい）、縦軸がその明度を持つピクセルの数です。グラフの山が左に寄っていればローキー（暗い印象）、右に寄っていればハイキー（明るい印象）の画像だとわかります。Log スケールに切り替えると、ごく少数しかない明度帯も見やすくなります。OKLCH の Lightness を基準にしているため、グラフ上で等間隔の差は人間の目にも等間隔の明暗差として感じられ、直感的にトーンの偏りを読み取れます。',
    image: '/explanations/lightness-histogram.png',
  },
]
</script>
