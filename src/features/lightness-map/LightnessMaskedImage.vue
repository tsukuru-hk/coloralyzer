<template>
  <ChannelMaskedImage
    :display-data="displayData"
    :bin-map="binMap"
    :alpha-data="lightnessSource.imageData.data"
    :active-bin="activeBin"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ColorAwareImageData } from '@/domain/colorSpace'
import { getLightnessBinMap } from '@/infrastructure/lightnessBinMap'
import ChannelMaskedImage from '@/features/image-analysis/ChannelMaskedImage.vue'

const props = defineProps<{
  /** 実際に描画するピクセル（オリジナル画像 or 明度グレースケール） */
  displayData: ImageData
  /** ピクセルごとの OKLCH L を求めるための元画像 */
  lightnessSource: ColorAwareImageData
  /** ヒストグラムのビン数（分割数） */
  binCount: number
  /** ホバー中のビン番号。null なら全体表示 */
  activeBin: number | null
}>()

const binMap = computed(() => getLightnessBinMap(props.lightnessSource, props.binCount))
</script>
