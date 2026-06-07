import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { AnalysisKey, AnalysisResult } from '@/types/analysis'
import type { AnalysisParams } from '@/infrastructure/analysisWorkerProtocol'
import { isAnalysisError } from '@/types/analysis'
import { useImageStore } from '@/composables/useImageStore'

/**
 * 単一分析種別の結果を computed で取得する composable。
 * @param key 分析種別
 * @param paramsGetter colorClustering の paletteSize 等（省略可）
 */
export function useAnalysisResult<K extends AnalysisKey>(
  key: K,
  paramsGetter?: MaybeRefOrGetter<AnalysisParams | undefined>,
) {
  const { selectedImage, getAnalysis, retryAnalysis } = useImageStore()

  const imageId = computed(() => selectedImage.value?.id ?? '')

  const raw = computed(() => {
    const id = imageId.value
    const source = selectedImage.value?.colorAwareImageData
    if (!id || !source) return null
    const params = paramsGetter ? toValue(paramsGetter) : undefined
    return getAnalysis(id, source, key, params)
  })

  const error = computed(() =>
    isAnalysisError(raw.value) ? raw.value : null,
  )

  const result = computed((): AnalysisResult[K] | null => {
    const r = raw.value
    return r != null && !isAnalysisError(r) ? (r as AnalysisResult[K]) : null
  })

  function retry() {
    const id = imageId.value
    if (!id) return
    const params = paramsGetter ? toValue(paramsGetter) : undefined
    retryAnalysis(id, key, params)
  }

  return { imageId, raw, error, result, retry }
}
