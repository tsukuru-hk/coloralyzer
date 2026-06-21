/**
 * 画像の各ピクセルが属する明度ビンの番号 (0..binCount-1) を計算した配列を生成する。
 * 明度ヒストグラム（lightnessHistogramGenerator）と同一の floor(L * binCount) 分割を
 * 使うことで、ヒストグラムの棒とホバー時のマスク表示を 1 対 1 で一致させる。
 */
import type { ColorAwareImageData } from '@/domain/colorSpace'
import { createPixelConverter } from './colorSpaceConverter'

const cache = new WeakMap<ColorAwareImageData, { binCount: number; bins: Uint8Array }>()

/**
 * 各ピクセルの L から min(floor(L * binCount), binCount-1) でビン番号を求めた Uint8Array。
 * 透明判定は呼び出し側で元画像のアルファを参照すること。
 * @param binCount ヒストグラムのビン数（domain を等分する数）
 */
export function getLightnessBinMap(source: ColorAwareImageData, binCount: number): Uint8Array {
  // ヒストグラム未ロード時（binCount=0）はビン分割が定義できない。
  // この間はホバーも起き得ないので、フルパスの無駄計算を避けて空配列を返す。
  if (binCount <= 0) return new Uint8Array(0)

  const cached = cache.get(source)
  if (cached && cached.binCount === binCount) return cached.bins

  const { data, width, height } = source.imageData
  const toOklch = createPixelConverter(source.colorSpace)
  const count = width * height
  const bins = new Uint8Array(count)

  for (let i = 0; i < count; i++) {
    const off = i * 4
    const result = toOklch(data[off]!, data[off + 1]!, data[off + 2]!)
    const l = result?.l ?? 0
    bins[i] = Math.min(Math.floor(l * binCount), binCount - 1)
  }

  cache.set(source, { binCount, bins })
  return bins
}
