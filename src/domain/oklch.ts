/**
 * 知覚的色空間 OKLCH の値オブジェクト。
 * lightness: Lightness（明度）, chroma: Chroma（彩度）, hue: Hue（色相）
 */

import type { ColorSpace } from './colorSpace';

export interface OklchValue {
  readonly lightness: number;
  readonly chroma: number;
  readonly hue: number;
}

/**
 * 彩度の可視化で使う正規化基準。
 * - `gamut`: 作業色空間のガマット内最大 chroma で正規化（既定）。
 *   sRGB なら sRGB 内の最大、P3 なら P3 内の最大を基準にするため、
 *   その色空間で表現しうる最も鮮やかな色がフル（白）になる。同一色空間の画像間で比較可能。
 * - `absolute`: 色空間によらない固定の OKLCH 絶対上限で正規化。
 *   異なる色空間の画像を同じ絶対スケールで比較したいときに使う。
 */
export type ChromaScaleBasis = 'gamut' | 'absolute';

/**
 * 各作業色空間のガマット内グローバル最大 OKLCH Chroma。
 * culori で各ガマットの原色・2次色を OKLCH 変換して求めた値（最も鮮やかな到達点）。
 * - srgb: マゼンタ(#F0F) で約 0.3225
 * - display-p3: グリーンで約 0.3685
 */
const GAMUT_MAX_CHROMA: Record<ColorSpace, number> = {
  srgb: 0.3225,
  'display-p3': 0.3685,
};

/**
 * 色空間によらない OKLCH の絶対表示上限。
 * 現状サポートする srgb(0.32)・display-p3(0.37) を包含する 0.4 を採用。
 * 注意: rec2020 はグリーンで約 0.468 に達するため、将来 rec2020 を
 * 作業色空間に加える場合はこの値の引き上げが必要。
 */
export const OKLCH_ABSOLUTE_MAX = 0.4;

/**
 * 指定基準での彩度正規化上限を返す。グレースケール・ヒストグラム・マスクで共通に使う。
 * @param colorSpace 作業色空間（`gamut` 基準のとき参照）
 * @param basis 正規化基準
 */
export function chromaDisplayMax(colorSpace: ColorSpace, basis: ChromaScaleBasis): number {
  return basis === 'absolute' ? OKLCH_ABSOLUTE_MAX : GAMUT_MAX_CHROMA[colorSpace];
}

/**
 * @param lightness 明度 (Lightness, 0–1)
 * @param chroma 彩度 (Chroma, 0–0.4+)
 * @param hue 色相 (Hue, 0–360)
 */
export function createOklch(lightness: number, chroma: number, hue: number): OklchValue {
  return { lightness, chroma, hue };
}
