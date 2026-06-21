<template>
  <ChannelMaskedImage
    :display-data="displayData"
    :bin-map="binMap"
    :alpha-data="chromaSource.imageData.data"
    :active-bin="activeBin"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ColorAwareImageData } from '@/domain/colorSpace'
import { getChromaBinMap } from '@/infrastructure/chromaBinMap'
import ChannelMaskedImage from '@/features/image-analysis/ChannelMaskedImage.vue'

const props = defineProps<{
  /** 実際に描画するピクセル（オリジナル画像 or 彩度グレースケール） */
  displayData: ImageData
  /** ピクセルごとの OKLCH C を求めるための元画像 */
  chromaSource: ColorAwareImageData
  /** ヒストグラムのビン数（分割数） */
  binCount: number
  /** 正規化上限（ヒストグラムの domain[1]）。ビン割り当てをヒストグラムと一致させる */
  displayMax: number
  /** ホバー中のビン番号。null なら全体表示 */
  activeBin: number | null
}>()

const binMap = computed(() =>
  getChromaBinMap(props.chromaSource, props.binCount, props.displayMax),
)
</script>
