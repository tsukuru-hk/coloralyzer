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
    <!-- オリジナル画像：ヒストグラム棒ホバー時は該当彩度帯のみ表示 -->
    <template #left="{ colorAwareImageData }">
      <ChromaMaskedImage
        :display-data="colorAwareImageData.imageData"
        :chroma-source="colorAwareImageData"
        :bin-count="binCount"
        :display-max="chromaDisplayMaxValue"
        :active-bin="hoveredBin"
      />
    </template>
    <template #default="{ colorAwareImageData }">
      <div v-if="imageId" class="space-y-4">
        <div>
          <div class="flex items-center justify-between gap-2">
            <SectionLabel>
              彩度グレースケール
              <InfoTooltip content="各ピクセルの OKLCH Chroma を彩度上限で線形正規化し、グレースケール化したものです（白いほど彩度が高く、黒いほど無彩色）。正規化の上限は『画像色域基準』では作業色空間（sRGB / P3）のガマット最大彩度、『OKLCH絶対』では色空間によらない固定値を使います。画像内の最大彩度では正規化しないため、画像間で明るさを比較できます。" />
            </SectionLabel>
            <div class="flex items-center gap-2">
              <SegmentedControl
                v-model="chromaScale"
                :options="chromaScaleOptions"
              />
              <DownloadButton
                v-if="chromaMapResult"
                :disabled="isExporting"
                @click="downloadChromaMap"
              />
            </div>
          </div>
          <AnalysisErrorCard v-if="chromaMapError" :message="chromaMapError.message" @retry="retryChromaMap" />
          <ChromaMaskedImage
            v-else-if="chromaMapResult"
            :display-data="chromaMapResult"
            :chroma-source="colorAwareImageData"
            :bin-count="binCount"
            :display-max="chromaDisplayMaxValue"
            :active-bin="hoveredBin"
          />
          <AnalysisSpinner v-else class="aspect-square" />
        </div>
        <div>
          <SectionLabel>
            彩度ヒストグラム
            <InfoTooltip content="画像内の全ピクセルの OKLCH Chroma 値の分布を示すヒストグラムです。横軸が彩度、縦軸がピクセル数を表します。棒にカーソルを重ねると、その彩度帯のピクセルだけが画像に表示されます。" />
            <span class="ml-auto flex items-center gap-1 scale-75 origin-right">
              <span class="text-[10px] text-muted-foreground select-none">Log</span>
              <Toggle v-model="chromaLogScale" />
            </span>
          </SectionLabel>
          <AnalysisErrorCard v-if="chromaHistogramError" :message="chromaHistogramError.message" @retry="retryChromaHistogram" />
          <ChromaHistogramPanel
            v-else-if="chromaHistogramResult"
            :histogram-data="chromaHistogramResult"
            :log-scale="chromaLogScale"
            :interactive="true"
            @hover-bin="hoveredBin = $event"
          />
          <AnalysisSpinner v-else />
        </div>
        <div>
          <Legend
            title="Chroma (彩度)"
            min-label="0 (無彩色)"
            :max-label="chromaMaxLabel"
            gradient="linear-gradient(to right, #000, #fff)"
          />
        </div>
      </div>
    </template>
  </AnalysisPageLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AnalysisPageLayout from '@/components/ui/AnalysisPageLayout.vue'
import { Legend, InfoTooltip, Toggle, SegmentedControl, AnalysisSpinner, AnalysisErrorCard, ExplanationContent, SectionLabel, DownloadButton } from '@/components/ui'
import type { ExplanationSection, SegmentOption } from '@/components/ui'
import type { ChromaScaleBasis } from '@/domain/oklch'
import { ChromaMaskedImage, ChromaHistogramPanel } from '@/features/grayscale-map'
import { useAnalysisResult } from '@/composables/useAnalysisResult'
import { useImageStore } from '@/composables/useImageStore'
import { useAnalysisPngExport } from '@/composables/useAnalysisPngExport'
import { exportImageDataAsPng } from '@/infrastructure/pngExport'
import { EXPORT_SUFFIX } from '@/domain/exportFileName'

const { exportPng, isExporting } = useAnalysisPngExport()
const { colorAwareImageData } = useImageStore()

const chromaLogScale = ref(false)

/** 彩度の正規化基準。gamut=作業色空間のガマット最大、absolute=OKLCH 絶対最大 */
const chromaScale = ref<ChromaScaleBasis>('gamut')
const chromaScaleOptions: ReadonlyArray<SegmentOption<ChromaScaleBasis>> = [
  { value: 'gamut', label: '画像色域基準' },
  { value: 'absolute', label: 'OKLCH絶対' },
]
/** chromaMap / chromaHistogram に渡す分析パラメータ（基準ごとに別キャッシュ） */
const chromaParams = computed(() => ({ chromaScale: chromaScale.value }))

/** ヒストグラム棒ホバー中のビン番号。null なら全体表示 */
const hoveredBin = ref<number | null>(null)

/** 彩度グレースケールを PNG として保存する */
function downloadChromaMap() {
  exportPng(EXPORT_SUFFIX.chromaGrayscale, (filename) => {
    const data = chromaMapResult.value
    return data ? exportImageDataAsPng(data, filename) : null
  })
}

const {
  imageId,
  error: chromaMapError,
  result: chromaMapResult,
  retry: retryChromaMap,
} = useAnalysisResult('chromaMap', chromaParams)

const {
  error: chromaHistogramError,
  result: chromaHistogramResult,
  retry: retryChromaHistogram,
} = useAnalysisResult('chromaHistogram', chromaParams)

/** ヒストグラムのビン数。マスク側も同じ分割で帯を判定する */
const binCount = computed(() => chromaHistogramResult.value?.bins.length ?? 0)

/** 正規化上限（ヒストグラムの domain 上限）。マスクのビン割り当てと凡例に使う */
const chromaDisplayMaxValue = computed(() => chromaHistogramResult.value?.domain[1] ?? 0)

/** 凡例右端ラベル。現在の基準（色域 or OKLCH絶対）と実際の上限値を示す */
const chromaMaxLabel = computed(() => {
  const dm = chromaDisplayMaxValue.value.toFixed(2)
  if (chromaScale.value === 'absolute') return `${dm} (OKLCH絶対最大)`
  const space = colorAwareImageData.value?.colorSpace === 'display-p3' ? 'P3' : 'sRGB'
  return `${dm} (${space}色域最大)`
})

const explanationSections: ExplanationSection[] = [
  {
    label: '彩度分析とは',
    description: '彩度とは、色の「鮮やかさ」のことです。真っ赤なトマトは鮮やかで彩度が高く、くすんだベージュは落ち着いていて彩度が低い——このように、同じ色味でもどれだけ鮮烈かを表すのが彩度です。本サイトでは人間の知覚に沿った OKLCH 色空間を採用しており、彩度は Chroma（C）として定義されます。値が 0 に近いほど無彩色（グレー）、大きいほど鮮やかな色です。この分析ページでは、画像の各ピクセルの C 値をグレースケールやヒストグラムで可視化し、画像の鮮やかさの分布を把握できるようにしています。',
    image: '/explanations/chroma-overview.png',
  },
  {
    label: '彩度グレースケールとは',
    description: 'グレースケール画像で、元の画像のどこが鮮やかで、どこが落ち着いた色かが一目でわかります。白く表示されている部分ほど鮮やかなピクセル、黒く表示されている部分ほど無彩色（グレー）に近いピクセルです。明るさや色味の情報を取り除き、純粋に「鮮やかさだけ」を見える化した画像と考えてください。OKLCH 色空間の Chroma 値を使っているため、人間の目が感じる鮮やかさの差とグレースケールの濃淡が自然に対応します。',
    image: '/explanations/chroma-grayscale.png',
  },
  {
    label: '彩度ヒストグラムとは',
    description: '画像全体の鮮やかさの分布をグラフで確認できます。横軸が彩度（左が無彩色、右が高彩度）、縦軸がその彩度を持つピクセルの数です。グラフの山が左に集中していればモノトーン寄り、右に広がっていればカラフルな画像だとわかります。Log スケールに切り替えると、数の少ない高彩度ピクセルの存在も見逃しにくくなります。OKLCH の Chroma を基準にしているため、グラフ上の差が人間の目で感じる鮮やかさの差と素直に対応し、配色のメリハリを直感的に把握できます。',
    image: '/explanations/chroma-histogram.png',
  },
]
</script>
