declare module 'culori' {
  /** sRGB の色オブジェクト */
  export type Rgb = { mode: 'rgb'; r: number; g: number; b: number; alpha?: number }

  /** RGB 系の色オブジェクト（sRGB / Display P3） */
  type RgbColor =
    | Rgb
    | { mode: 'p3'; r: number; g: number; b: number }

  /** OKLCH の色オブジェクト。無彩色では h が undefined（powerless hue）になる */
  type OklchColor = { mode: 'oklch'; l: number; c: number; h?: number | undefined }

  /** sRGB / Display P3 / OKLCH / CSS 文字列 → OKLCH 変換 */
  export function oklch(
    color: string | RgbColor | OklchColor
  ): { mode: 'oklch'; l: number; c: number; h: number | undefined } | undefined

  /** 色が sRGB ガマット内に収まる（表示可能）かを判定する */
  export function displayable(color: string | { mode: string; [key: string]: unknown }): boolean

  /** 指定ガマット内かを判定する関数を返す（例: inGamut('p3')） */
  export function inGamut(
    mode?: string
  ): (color: string | { mode: string; [key: string]: unknown }) => boolean

  export function converter(
    mode: string
  ): (color: { mode: string; l?: number; c?: number; h?: number; r?: number; g?: number; b?: number }) =>
    { mode: string; r: number; g: number; b: number } | undefined

  export function formatHex(color: { mode: string; [key: string]: unknown }): string

  /** OKLCH chroma を sRGB ガマット内に収まるよう縮小する */
  export function clampChroma(
    color: { mode: string; [key: string]: unknown },
    mode?: string
  ): { mode: string; [key: string]: unknown }
}
