import { ref } from 'vue'
import type { Result } from '@/core/result'
import { useImageStore } from '@/composables/useImageStore'
import { useToast } from '@/composables/useToast'
import { buildExportFileName } from '@/domain/exportFileName'
import type { PngExportError } from '@/infrastructure/pngExport'

/**
 * 分析結果を PNG 保存する共通フローをまとめた composable。
 * - 選択中画像の名前からダウンロードファイル名を生成する
 * - 失敗時はトーストで通知する
 * - `isExporting` で二重起動を防ぐ（UI の disabled にも流用可）
 */
export function useAnalysisPngExport() {
  const { selectedImage } = useImageStore()
  const { toast } = useToast()
  const isExporting = ref(false)

  /**
   * ファイル名を解決して `run` を実行する。
   * @param suffix ファイル名の接尾辞（`EXPORT_SUFFIX` のいずれか）
   * @param run 生成済みファイル名で実エクスポートを行う関数。
   *            キャプチャ対象が未取得なら `null` を返すこと（その場合は中止）。
   */
  async function exportPng(
    suffix: string,
    run: (filename: string) => Promise<Result<void, PngExportError>> | null,
  ): Promise<void> {
    if (isExporting.value) return

    const fileName = selectedImage.value?.fileName
    if (!fileName) {
      console.warn('[useAnalysisPngExport] 選択中の画像がないためエクスポートを中止しました')
      return
    }

    const task = run(buildExportFileName(fileName, suffix))
    if (!task) {
      console.warn('[useAnalysisPngExport] キャプチャ対象が取得できないためエクスポートを中止しました')
      return
    }

    isExporting.value = true
    try {
      const result = await task
      if (result.isFailure()) {
        toast({
          title: 'ダウンロードに失敗しました',
          description: result.error.message,
          variant: 'error',
        })
      }
    } finally {
      isExporting.value = false
    }
  }

  return { exportPng, isExporting }
}
