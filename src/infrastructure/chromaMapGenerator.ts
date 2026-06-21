/**
 * 彩度チャンネルをグレースケール画像へ変換（Culori OKLCH）。
 * Infrastructure: ピクセルループと Canvas 非依存の純粋な ImageData 生成。
 */
import { type Result, success } from '@/core/result'
import type { ColorAwareImageData } from '@/domain/colorSpace'
import { chromaDisplayMax, type ChromaScaleBasis } from '@/domain/oklch'
import { createPixelConverter } from '@/infrastructure/colorSpaceConverter'

export type ChromaMapError = 'ConversionError'

/**
 * 8ビット RGB の量子化ノイズを無彩色と見なす閾値。
 * RGB 各チャンネルの最大差がこの値以下のピクセルは chroma = 0 として扱う。
 * 暗部では ±1 の差で OKLCH chroma が 0.02 程度発生するため、これを除去する。
 */
const RGB_ACHROMATIC_THRESHOLD = 2

/**
 * 画像の各ピクセルの OKLCH chroma 値をグレースケールに変換した ImageData を生成する。
 * 彩度上限で線形正規化（gray ∝ C）し、彩度が高い部分ほど明るく表示される。
 * 画像内の最大彩度ではなく固定スケール（色空間のガマット最大 or OKLCH 絶対最大）を
 * 使うため、無彩色画像は黒く、また異なる画像間でも比較できる。
 * @param source 色空間情報付き入力画像
 * @param basis 正規化基準（既定: ガマット最大）
 */
export function generateChromaMap(
  source: ColorAwareImageData,
  basis: ChromaScaleBasis = 'gamut',
): Result<ImageData, ChromaMapError> {
  const { data, width, height } = source.imageData
  const pixelCount = width * height
  const toOklch = createPixelConverter(source.colorSpace)
  const displayMax = chromaDisplayMax(source.colorSpace, basis)

  const output = new ImageData(width, height)
  const outData = output.data

  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4
    if (data[offset + 3]! < 128) {
      outData[offset] = 0
      outData[offset + 1] = 0
      outData[offset + 2] = 0
      outData[offset + 3] = 0
      continue
    }
    const r = data[offset]!, g = data[offset + 1]!, b = data[offset + 2]!
    let c = 0
    if (Math.max(r, g, b) - Math.min(r, g, b) > RGB_ACHROMATIC_THRESHOLD) {
      c = toOklch(r, g, b)?.c ?? 0
    }
    const gray = Math.round(Math.min(c / displayMax, 1) * 255)
    outData[offset] = gray
    outData[offset + 1] = gray
    outData[offset + 2] = gray
    outData[offset + 3] = 255
  }

  return success(output)
}
