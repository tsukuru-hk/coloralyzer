/**
 * 画像の各ピクセルが属する彩度ビンの番号 (0..binCount-1) を計算した配列を生成する。
 * 彩度ヒストグラム（chromaHistogramGenerator）と同一の固定スケール
 * （binWidth = displayMax / binCount）の floor(C / binWidth) 分割を使い、
 * 棒とホバー時のマスク表示を一致させる。ヒストグラムと同じ無彩色閾値も適用する。
 * displayMax はヒストグラムの domain[1]（正規化基準で決まる上限）を渡すこと。
 */
import type { ColorAwareImageData } from '@/domain/colorSpace'
import { createPixelConverter } from './colorSpaceConverter'

const cache = new WeakMap<
  ColorAwareImageData,
  { binCount: number; displayMax: number; bins: Uint8Array }
>()

/** 8ビット RGB の量子化ノイズを無彩色と見なす閾値（ヒストグラムと共通） */
const RGB_ACHROMATIC_THRESHOLD = 2

/**
 * 各ピクセルの C から min(floor(C / displayMax * binCount), binCount-1) で
 * ビン番号を求めた Uint8Array。
 * @param binCount ヒストグラムのビン数
 * @param displayMax 正規化上限（ヒストグラムの domain[1] と一致させる）
 */
export function getChromaBinMap(
  source: ColorAwareImageData,
  binCount: number,
  displayMax: number,
): Uint8Array {
  // ヒストグラム未ロード時（binCount=0）はビン分割が定義できない。
  // この間はホバーも起き得ないので、フルパスの無駄計算を避けて空配列を返す。
  if (binCount <= 0) return new Uint8Array(0)

  const cached = cache.get(source)
  if (cached && cached.binCount === binCount && cached.displayMax === displayMax) return cached.bins

  const { data, width, height } = source.imageData
  const toOklch = createPixelConverter(source.colorSpace)
  const count = width * height
  const bins = new Uint8Array(count)
  const binWidth = (displayMax > 0 ? displayMax : 1) / binCount

  for (let i = 0; i < count; i++) {
    const off = i * 4
    const r = data[off]!
    const g = data[off + 1]!
    const b = data[off + 2]!
    let c = 0
    if (Math.max(r, g, b) - Math.min(r, g, b) > RGB_ACHROMATIC_THRESHOLD) {
      const result = toOklch(r, g, b)
      c = result?.c ?? 0
    }
    bins[i] = Math.min(Math.floor(c / binWidth), binCount - 1)
  }

  cache.set(source, { binCount, displayMax, bins })
  return bins
}
