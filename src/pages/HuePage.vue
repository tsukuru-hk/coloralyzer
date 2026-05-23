<template>
  <!-- ページ：色相分析 — 3D地形 + 2Dガマットマップ -->
  <AnalysisPageLayout
    title="色相分析"
    description="色相環のどの範囲の色が多く使われているかを、地形のように立体的に表示します"
    placeholder-text="画像をアップロードすると色相の分布が表示されます"
    :split-pane="true"
    pane-height="h-[calc(100vh-13rem)]"
  >
    <template #title-icon>
      <img src="@/assets/Hue-icon.png" alt="" class="h-14 w-14" />
    </template>
    <template #explanation="{ close }">
      <ExplanationContent
        title="色相分析"
        :sections="explanationSections"
        @close="close"
      >
        <template #icon>
          <img src="@/assets/Hue-icon.png" alt="" class="h-8 w-8" />
        </template>
      </ExplanationContent>
    </template>
    <template #default>
      <AnalysisErrorCard
        v-if="hueError"
        :message="hueError.message"
        @retry="retryAnalysis(imageId, 'hueAnalysis')"
      />
      <template v-else-if="hueResult">
        <!-- 右ペイン全体を 3D 地形チャートで埋める -->
        <HueTerrainChart
          :data="hueResult"
          :active-band="activeBand"
          :log-scale="logScale"
          class="h-full w-full"
        />
        <!-- 有彩色ピクセルなしオーバーレイ -->
        <div
          v-if="hueResult.totalChromaticPixels === 0"
          class="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
        >
          <div class="rounded-lg border border-white/20 bg-black/50 px-4 py-2 backdrop-blur-sm">
            <span class="text-sm text-white/90">有彩色ピクセルが見つかりませんでした</span>
          </div>
        </div>
        <!-- オーバーレイ UI 左上 -->
        <div class="absolute left-3 top-3 z-10 flex flex-col gap-2">
          <LightnessBandToggle v-model="activeBand" />
          <LightnessBandPreview
            v-if="selectedImage"
            :source="selectedImage.colorAwareImageData"
            :active-band="activeBand"
            :precomputed-band-mask="hueResult?.bandMask"
            class="shadow-md"
          />
        </div>
        <!-- オーバーレイ UI 右上: Log トグル -->
        <div class="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/40 px-2 py-1 backdrop-blur-sm">
          <span class="text-[10px] text-white/70 select-none">Log</span>
          <Toggle v-model="logScale" />
        </div>
      </template>
      <AnalysisSpinner v-else />
    </template>
  </AnalysisPageLayout>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'
import AnalysisPageLayout from '@/components/ui/AnalysisPageLayout.vue'
import { AnalysisSpinner, AnalysisErrorCard, Toggle, ExplanationContent } from '@/components/ui'
import type { ExplanationSection } from '@/components/ui'
import { LightnessBandToggle } from '@/features/hue-analysis'
import { isAnalysisError } from '@/types/analysis'
import type { HueAnalysisResult } from '@/types/hueAnalysis'
import { useImageStore } from '@/composables/useImageStore'

const HueTerrainChart = defineAsyncComponent(() =>
  import('@/features/hue-analysis/HueTerrainChart.vue'),
)
const LightnessBandPreview = defineAsyncComponent(() =>
  import('@/features/hue-analysis/LightnessBandPreview.vue'),
)

const { selectedImage, getAnalysis, retryAnalysis } = useImageStore()

const explanationSections: ExplanationSection[] = [
  {
    label: '色相分析とは',
    description: '色相とは、色の「属性」そのもののことです。赤、青、緑——こうした色味の違いが色相です。明るさや鮮やかさが同じでも、赤と青ではまったく印象が異なりますよね。本サイトでは人間の知覚に沿った OKLCH 色空間を採用しており、色相は Hue（H）として 0°〜 360° の角度で定義されます。色相環をぐるっと一周すると、赤→橙→黄→緑→青→紫→赤と色味が変化します。この分析ページでは、画像の各ピクセルの H 値を 3D 地形チャートなどで可視化し、画像にどんな色味がどれだけ含まれているかを把握できるようにしています。',
  },
  {
    label: '3D 地形チャートとは',
    description: '色相環上の分布を3D地形として可視化します。山が高いほどその色相のピクセルが多いことを示します。視点をドラッグして回転させることで、あらゆる角度から分布を確認できます。',
  },
  {
    label: '明度バンド切り替え',
    description: '暗い色（Dark）・中間色（Mid）・明るい色（Light）のバンドで色相分布をフィルタリングできます。明度帯ごとの色相傾向を個別に確認することで、配色の奥行きを把握できます。',
  },
]

const imageId = computed(() => selectedImage.value?.id ?? '')

const activeBand = ref<'all' | 'dark' | 'mid' | 'light'>('all')
const logScale = ref(false)

// 色相分析
const rawHueResult = computed(() => {
  const id = imageId.value
  const source = selectedImage.value?.colorAwareImageData
  if (!id || !source) return null
  return getAnalysis(id, source, 'hueAnalysis')
})

const hueError = computed(() =>
  isAnalysisError(rawHueResult.value) ? rawHueResult.value : null,
)

const hueResult = computed<HueAnalysisResult | null>(() => {
  const r = rawHueResult.value
  return r != null && !isAnalysisError(r) ? r : null
})

// 支配的な色相のラベル
const HUE_NAMES: [number, string][] = [
  [15, '赤'], [45, '橙'], [75, '黄'], [105, '黄緑'],
  [135, '緑'], [165, '青緑'], [195, '青緑'], [225, '青'],
  [255, '青紫'], [285, '紫'], [315, '赤紫'], [345, '赤'],
]

const _dominantHue = computed(() => {
  const sectors = hueResult.value?.sectors
  if (!sectors || sectors.length === 0) return null
  const max = sectors.reduce((a, b) => (a.ratio > b.ratio ? a : b))
  if (max.ratio === 0) return null
  const center = (max.hueStart + max.hueEnd) / 2
  const name = HUE_NAMES.find(([boundary]) => center < boundary)?.[1] ?? '赤'
  return `${name} (${Math.round(center)}°, ${(max.ratio * 100).toFixed(1)}%)`
})
</script>
