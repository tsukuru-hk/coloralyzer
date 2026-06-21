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
          ref="hueChartRef"
          :data="hueResult"
          :active-band="activeBand"
          :log-scale="logScale"
          class="h-full w-full"
        />
        <!-- 分析タイトル + PNG ダウンロード（オーバーレイ） -->
        <div class="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2">
          <span class="rounded-lg border border-white/20 bg-black/40 px-3 py-1 text-sm font-semibold text-white/90 backdrop-blur-sm">色相3D</span>
          <DownloadButton variant="overlay" @click="downloadHue3d" />
        </div>
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
import { AnalysisSpinner, AnalysisErrorCard, Toggle, ExplanationContent, DownloadButton } from '@/components/ui'
import type { ExplanationSection } from '@/components/ui'
import { LightnessBandToggle } from '@/features/hue-analysis'
import { isAnalysisError } from '@/types/analysis'
import type { HueAnalysisResult } from '@/types/hueAnalysis'
import { useImageStore } from '@/composables/useImageStore'
import { useToast } from '@/composables/useToast'
import { exportCanvasAsPng } from '@/infrastructure/pngExport'
import { buildExportFileName, EXPORT_SUFFIX } from '@/domain/exportFileName'

const HueTerrainChart = defineAsyncComponent(() =>
  import('@/features/hue-analysis/HueTerrainChart.vue'),
)
const LightnessBandPreview = defineAsyncComponent(() =>
  import('@/features/hue-analysis/LightnessBandPreview.vue'),
)

const { selectedImage, getAnalysis, retryAnalysis } = useImageStore()
const { toast } = useToast()

/** 色相3Dチャート（PNG エクスポート用の Canvas 取得に使用） */
const hueChartRef = ref<{ captureCanvas: () => HTMLCanvasElement | null } | null>(null)

/** 色相3Dを PNG として保存する */
async function downloadHue3d() {
  const canvas = hueChartRef.value?.captureCanvas()
  const fileName = selectedImage.value?.fileName
  if (!canvas || !fileName) return
  const result = await exportCanvasAsPng(
    canvas,
    buildExportFileName(fileName, EXPORT_SUFFIX.hue3d),
  )
  if (result.isFailure()) {
    toast({ title: 'ダウンロードに失敗しました', description: result.error.message, variant: 'error' })
  }
}

const explanationSections: ExplanationSection[] = [
  {
    label: '色相分析とは',
    description: '色相とは、色の「属性」そのもののことです。赤、青、緑——こうした色味の違いが色相です。明るさや鮮やかさが同じでも、赤と青ではまったく印象が異なりますよね。本サイトでは人間の知覚に沿った OKLCH 色空間を採用しており、色相は Hue（H）として 0°〜 360° の角度で定義されます。色相環をぐるっと一周すると、赤→橙→黄→緑→青→紫→赤と色味が変化します。この分析ページでは、画像の各ピクセルの H 値を 3D 地形チャートなどで可視化し、画像にどんな色味がどれだけ含まれているかを把握できるようにしています。',
    image: '/explanations/hue-overview.png',
  },
  {
    label: '3D 地形チャートとは',
    description: '画像にどんな色味がどれだけ含まれているかを、立体的な地形として確認できます。円形の地形の角度が色相環（赤→橙→黄→緑→青→紫→赤）に対応しており、山が高い方向ほどその色味のピクセルが多いことを示します。マウスドラッグで視点を回転できるので、あらゆる角度から分布を立体的に観察できます。OKLCH 色空間の Hue 値を使っているため、地形上で隣り合う色は人間の目にも近い色味として映り、分布の偏りや色味のグラデーションを自然に読み取れます。',
    image: '/explanations/hue-3d.png',
  },
  {
    label: '明度バンド切り替え',
    description: '同じ色味でも、明るい色と暗い色では印象がまったく異なります。この機能では、暗い色（Dark）・中間色（Mid）・明るい色（Light）の3つの明度帯に分けて色相分布を確認できます。たとえば「暗い部分は青が多いが、明るい部分は黄色が多い」といった、明暗ごとの色味の使い分けが見えてきます。OKLCH の Lightness で明度帯を区切っているため、人間の目が感じる「暗い・中間・明るい」という感覚と一致した分類になっており、直感的に配色の奥行きを把握できます。',
    image: '/explanations/hue-3D-band.png',
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

</script>
