import { ref, shallowRef, computed } from 'vue'
import type { ColorSpace, ColorAwareImageData } from '@/domain/colorSpace'
import type { AnalysisKey, AnalysisResult, AnalysisError } from '@/types/analysis'
import type { AnalysisParams } from '@/infrastructure/analysisWorkerProtocol'
import { isAnalysisError } from '@/types/analysis'
import { loadImageUseCase } from '@/application/useCase/loadImageUseCase'
import { requestAnalysis, cancelByImageId } from '@/infrastructure/analysisWorkerClient'
import type { AnalysisResponse } from '@/infrastructure/analysisWorkerProtocol'
import { determineWorkingColorSpace } from '@/infrastructure/displayCapabilityDetector'
import { useToast } from '@/composables/useToast'

/** ギャラリーに保持する画像の上限（タブ過多・メモリを抑える） */
const MAX_IMAGES = 5

/** 1枚分の読み込み結果（サムネ用 object URL を含む） */
export interface ImageEntry {
  id: string
  colorAwareImageData: ColorAwareImageData
  fileName: string
  thumbnailUrl: string
}

const images = ref<ImageEntry[]>([])
const selectedId = ref<string | null>(null)
const loadProgress = ref<'idle' | 'loading' | 'done' | 'error'>('idle')

/** スロットキー → 分析結果 の reactive キャッシュ */
const analysisCacheMap = shallowRef(new Map<string, AnalysisResult[AnalysisKey] | AnalysisError>())

/** 処理中の分析スロット */
const inFlightSet = shallowRef(new Set<string>())

/** スロットごとに最後に dispatch した requestId（古い Worker 応答を無視する） */
const latestRequestIdBySlot = new Map<string, string>()

/** 起動時に一度だけ判定する作業色空間 */
const workingColorSpace = ref<ColorSpace>(determineWorkingColorSpace())

const selectedImage = computed(() =>
  images.value.find((img) => img.id === selectedId.value) ?? null,
)

const colorAwareImageData = computed(() => selectedImage.value?.colorAwareImageData ?? null)
const canAddMore = computed(() => images.value.length < MAX_IMAGES)

/**
 * キャッシュ・in-flight 用スロットキー。
 * colorClustering は paletteSize ごとに別スロットとする。
 */
function analysisSlotKey(imageId: string, key: AnalysisKey, params?: AnalysisParams): string {
  if (key === 'colorClustering') {
    const ps = params?.paletteSize ?? 0
    return `${imageId}::${key}::ps=${ps}`
  }
  return `${imageId}::${key}`
}

function setCacheEntry(slot: string, value: AnalysisResult[AnalysisKey] | AnalysisError) {
  const newMap = new Map(analysisCacheMap.value)
  newMap.set(slot, value)
  analysisCacheMap.value = newMap
}

function deleteCacheEntriesForImage(imageId: string) {
  const newMap = new Map(analysisCacheMap.value)
  const prefix = `${imageId}::`
  for (const k of newMap.keys()) {
    if (k.startsWith(prefix)) {
      newMap.delete(k)
      latestRequestIdBySlot.delete(k)
    }
  }
  analysisCacheMap.value = newMap
}

/**
 * ImageData から object URL 用の Blob を生成する。
 * @param data サムネイル元のピクセルデータ
 */
function generateThumbnailUrl(data: ImageData): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = data.width
    canvas.height = data.height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('Could not get 2d context'))
      return
    }
    ctx.putImageData(data, 0, 0)
    canvas.toBlob((blob) => {
      if (blob) resolve(URL.createObjectURL(blob))
      else reject(new Error('Failed to generate thumbnail'))
    })
  })
}

function cacheResponsePayload(
  response: AnalysisResponse,
): AnalysisResult[AnalysisKey] | null {
  if (response.status !== 'success') return null
  if (response.imageData) return response.imageData
  if (response.histogramData) return response.histogramData
  if (response.gamutPointCloudData) return response.gamutPointCloudData
  if (response.colorClusterData) return response.colorClusterData
  if (response.hueAnalysisData) return response.hueAnalysisData
  return null
}

/**
 * 分析ページで共有する画像ギャラリー状態。
 * 読み込み・選択・削除とサムネ object URL の解放をまとめて扱う。
 */
export function useImageStore() {
  const { toast } = useToast()

  /**
   * 画像を1枚追加し、選択中 ID をその画像にする。
   * @param file ブラウザで選ばれた画像ファイル
   */
  async function addImage(file: File) {
    if (!canAddMore.value) {
      toast({ title: `最大${MAX_IMAGES}枚までです`, variant: 'error' })
      return
    }

    loadProgress.value = 'loading'

    const result = await loadImageUseCase(file, workingColorSpace.value)

    if (result.isFailure()) {
      toast({ title: 'エラー', description: result.error.message, variant: 'error' })
      loadProgress.value = 'error'
      return
    }

    let thumbnailUrl: string
    try {
      thumbnailUrl = await generateThumbnailUrl(result.value.imageData)
    } catch (err) {
      console.error('[useImageStore] Thumbnail generation failed:', err)
      toast({ title: 'サムネイル生成に失敗しました', variant: 'error' })
      loadProgress.value = 'error'
      return
    }
    const entry: ImageEntry = {
      id: crypto.randomUUID(),
      colorAwareImageData: result.value,
      fileName: file.name,
      thumbnailUrl,
    }

    images.value = [...images.value, entry]
    selectedId.value = entry.id
    loadProgress.value = 'done'
    toast({ title: '画像を読み込みました', variant: 'success' })
  }

  /**
   * 指定画像・指定種別の分析結果を取得する。
   * キャッシュにあれば即返す。なければ Worker に依頼し null を返す。
   * Worker 完了時に reactive キャッシュが更新され、再レンダーでキャッシュヒットする。
   * 失敗した分析は AnalysisError が返るため、呼び出し側は isAnalysisError で判別する。
   */
  function getAnalysis<K extends AnalysisKey>(
    imageId: string,
    source: ColorAwareImageData,
    key: K,
    params?: AnalysisParams,
  ): AnalysisResult[K] | AnalysisError | null {
    const slot = analysisSlotKey(imageId, key, params)
    const cached = analysisCacheMap.value.get(slot)
    if (cached !== undefined) {
      return cached as AnalysisResult[K] | AnalysisError
    }

    if (inFlightSet.value.has(slot)) {
      return null
    }

    const nextInFlight = new Set(inFlightSet.value)
    nextInFlight.add(slot)
    inFlightSet.value = nextInFlight

    const { requestId, promise } = requestAnalysis(imageId, key, source, params)
    latestRequestIdBySlot.set(slot, requestId)

    promise.then((response) => {
      if (latestRequestIdBySlot.get(slot) !== response.requestId) {
        return
      }

      const updated = new Set(inFlightSet.value)
      updated.delete(slot)
      inFlightSet.value = updated

      const payload = cacheResponsePayload(response)
      if (payload !== null) {
        setCacheEntry(slot, payload)
      } else {
        // エラー応答・payload 不明な success 応答ともエラーとしてキャッシュし、
        // 再 dispatch ループと無限スピナーを防止する
        const error: AnalysisError = {
          _tag: 'AnalysisError',
          analysisKey: key,
          message:
            response.status === 'success'
              ? '分析結果の形式が不正です'
              : (response.errorMessage ?? '分析処理に失敗しました'),
        }
        setCacheEntry(slot, error)
      }
    })

    return null
  }

  /** 指定の分析が処理中かどうかを返す */
  function isAnalysisLoading(imageId: string, key: AnalysisKey, params?: AnalysisParams): boolean {
    return inFlightSet.value.has(analysisSlotKey(imageId, key, params))
  }

  /** エラーになった分析をキャッシュから削除し、再取得を促す */
  function retryAnalysis(imageId: string, key: AnalysisKey, params?: AnalysisParams): void {
    const slot = analysisSlotKey(imageId, key, params)
    const cached = analysisCacheMap.value.get(slot)
    if (cached !== undefined && isAnalysisError(cached)) {
      invalidateAnalysis(imageId, key, params)
    }
  }

  /**
   * 指定分析のキャッシュを無効化し、次回 getAnalysis で再計算を促す。
   * colorClustering で params を省略した場合、その画像の全 paletteSize スロットを無効化する。
   */
  function invalidateAnalysis(imageId: string, key: AnalysisKey, params?: AnalysisParams): void {
    const newMap = new Map(analysisCacheMap.value)
    const slotPrefix = `${imageId}::${key}`

    if (key === 'colorClustering' && params === undefined) {
      for (const k of [...newMap.keys()]) {
        if (k.startsWith(`${slotPrefix}::`)) {
          newMap.delete(k)
          latestRequestIdBySlot.delete(k)
        }
      }
    } else {
      const slot = analysisSlotKey(imageId, key, params)
      newMap.delete(slot)
      latestRequestIdBySlot.delete(slot)
    }
    analysisCacheMap.value = newMap

    const updated = new Set(inFlightSet.value)
    if (key === 'colorClustering' && params === undefined) {
      for (const k of updated) {
        if (k.startsWith(`${slotPrefix}::`)) updated.delete(k)
      }
    } else {
      updated.delete(analysisSlotKey(imageId, key, params))
    }
    inFlightSet.value = updated
  }

  /**
   * 指定 ID の画像を削除し、サムネ URL を revoke する。
   * @param id `ImageEntry.id`
   */
  function removeImage(id: string) {
    const index = images.value.findIndex((img) => img.id === id)
    if (index === -1) return

    const removed = images.value[index]
    if (!removed) return
    URL.revokeObjectURL(removed.thumbnailUrl)
    deleteCacheEntriesForImage(id)
    cancelByImageId(id)

    const nextInFlight = new Set(inFlightSet.value)
    for (const k of nextInFlight) {
      if (k.startsWith(`${id}::`)) nextInFlight.delete(k)
    }
    inFlightSet.value = nextInFlight

    const next = [...images.value]
    next.splice(index, 1)
    images.value = next

    if (selectedId.value === id) {
      selectedId.value =
        next[Math.min(index, next.length - 1)]?.id ?? null
    }
  }

  /** 表示・分析対象とする画像を切り替える。 */
  function selectImage(id: string) {
    selectedId.value = id
  }

  /** 全画像を破棄し、状態を初期化する。 */
  function clear() {
    for (const img of images.value) {
      URL.revokeObjectURL(img.thumbnailUrl)
      cancelByImageId(img.id)
    }
    analysisCacheMap.value = new Map()
    inFlightSet.value = new Set()
    latestRequestIdBySlot.clear()
    images.value = []
    selectedId.value = null
    loadProgress.value = 'idle'
  }

  return {
    images,
    selectedId,
    selectedImage,
    getAnalysis,
    isAnalysisLoading,
    isAnalysisError,
    retryAnalysis,
    invalidateAnalysis,
    colorAwareImageData,
    canAddMore,
    loadProgress,
    workingColorSpace,
    addImage,
    removeImage,
    selectImage,
    clear,
  }
}
