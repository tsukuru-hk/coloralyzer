/**
 * 彩度 (OKLCH Chroma) のヒストグラムデータを生成する。
 * Infrastructure: ピクセルループと Culori 変換のみ。Canvas 非依存。
 */
import { type Result, success } from '@/core/result'
import type { ColorAwareImageData } from '@/domain/colorSpace'
import { chromaDisplayMax, type ChromaScaleBasis } from '@/domain/oklch'
import { createPixelConverter } from '@/infrastructure/colorSpaceConverter'
import type { HistogramBin, HistogramData, HistogramError } from './histogramTypes'

/**
 * 画像の各ピクセルの OKLCH chroma 値を集計し、ヒストグラムデータを返す。
 * 横軸は C に対して線形（等幅ビン）。
 * @param source 色空間情報付き入力画像
 * @param binCount ビン数 (デフォルト 64 — 明度ヒストグラムと粒度を揃える)
 * @param basis 正規化基準（既定: ガマット最大）。横軸の上限 domain[1] を決める
 */
export function generateChromaHistogram(
  source: ColorAwareImageData,
  binCount: number = 64,
  basis: ChromaScaleBasis = 'gamut',
): Result<HistogramData, HistogramError> {
  const { data, width, height } = source.imageData
  const pixelCount = width * height
  let opaquePixels = 0
  const toOklch = createPixelConverter(source.colorSpace)

  /**
   * 8ビット RGB の量子化ノイズを無彩色と見なす閾値。
   * RGB 各チャンネルの最大差がこの値以下のピクセルは chroma = 0 として扱う。
   */
  const RGB_ACHROMATIC_THRESHOLD = 2

  // 横軸は固定スケール [0, displayMax]。画像内最大彩度で正規化しないため、
  // 無彩色寄りの画像は左端に集中し、同一スケールの画像間で分布を比較できる。
  const displayMax = chromaDisplayMax(source.colorSpace, basis)
  const binWidth = displayMax / binCount
  const counts = new Uint32Array(binCount)

  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4
    if (data[offset + 3]! < 128) continue
    opaquePixels++
    const r = data[offset]!, g = data[offset + 1]!, b = data[offset + 2]!
    let c = 0
    if (Math.max(r, g, b) - Math.min(r, g, b) > RGB_ACHROMATIC_THRESHOLD) {
      c = toOklch(r, g, b)?.c ?? 0
    }
    const idx = Math.min(Math.floor(c / binWidth), binCount - 1)
    counts[idx]!++
  }

  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => ({
    rangeStart: i * binWidth,
    rangeEnd: (i + 1) * binWidth,
    count: counts[i]!,
  }))

  return success({ bins, totalPixels: opaquePixels, domain: [0, displayMax] })
}
