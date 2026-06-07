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
    <template #default>
      <div v-if="imageId" class="space-y-4">
        <div>
          <SectionLabel>
            彩度グレースケール
            <InfoTooltip content="OKLCH の Chroma 値を 0〜1 に正規化し、グレースケールで可視化したものです。白いほど彩度が高く、黒いほど無彩色に近いことを示します。" />
          </SectionLabel>
          <AnalysisErrorCard v-if="chromaMapError" :message="chromaMapError.message" @retry="retryChromaMap" />
          <ChromaMapPanel v-else-if="chromaMapResult" :chroma-map-data="chromaMapResult" />
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
          <AnalysisErrorCard v-if="chromaHistogramError" :message="chromaHistogramError.message" @retry="retryChromaHistogram" />
          <ChromaHistogramPanel v-else-if="chromaHistogramResult" :histogram-data="chromaHistogramResult" :log-scale="chromaLogScale" />
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
import AnalysisPageLayout from '@/components/ui/AnalysisPageLayout.vue'
import { Legend, InfoTooltip, Toggle, AnalysisSpinner, AnalysisErrorCard, ExplanationContent, SectionLabel } from '@/components/ui'
import type { ExplanationSection } from '@/components/ui'
import { ChromaMapPanel, ChromaHistogramPanel } from '@/features/grayscale-map'
import { useAnalysisResult } from '@/composables/useAnalysisResult'

const chromaLogScale = ref(false)

const {
  imageId,
  error: chromaMapError,
  result: chromaMapResult,
  retry: retryChromaMap,
} = useAnalysisResult('chromaMap')

const {
  error: chromaHistogramError,
  result: chromaHistogramResult,
  retry: retryChromaHistogram,
} = useAnalysisResult('chromaHistogram')

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
