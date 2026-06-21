/**
 * 画像ファイルに埋め込まれた色空間情報（ICC プロファイル / PNG cICP）を読み取り、
 * 作業色空間を決定する。ディスプレイ能力ではなく「画像そのもの」の色空間を返す。
 * Infrastructure: File / ArrayBuffer / DecompressionStream に依存。
 *
 * 判定方針:
 * - 文字列（プロファイル名・desc）は Apple の Display P3 が UTF-16 で格納するなど
 *   エンコーディングが一定でないため使わない。
 * - ICC の赤原色 rXYZ タグの X 値（数値）で色域を判定する。
 *   sRGB ≈ 0.4361 / Display P3 ≈ 0.5151 / BT.2020 ≈ 0.6734 と明確に分かれる。
 * - PNG は cICP チャンク（coding-independent code points）があれば最優先で使う。
 * - 判定できない・タグなしは安全側の 'srgb' にフォールバックする。
 */
import type { ColorSpace } from '@/domain/colorSpace'

/** 赤原色 X がこの値を超えたら広色域（P3 以上）とみなす。sRGB 0.436 と P3 0.515 の中間。 */
const WIDE_GAMUT_RED_X_THRESHOLD = 0.47

/**
 * 画像ファイルの色空間を検出する。失敗時・不明時は 'srgb'。
 * @param file 画像ファイル（PNG / JPEG を想定）
 */
export async function detectImageColorSpace(file: File): Promise<ColorSpace> {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (isPng(bytes)) return await detectPngColorSpace(bytes)
    if (isJpeg(bytes)) return detectJpegColorSpace(bytes)
    return 'srgb'
  } catch {
    return 'srgb'
  }
}

function isPng(b: Uint8Array): boolean {
  return (
    b.length > 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  )
}

function isJpeg(b: Uint8Array): boolean {
  return b.length > 3 && b[0] === 0xff && b[1] === 0xd8
}

// === PNG ===

/**
 * PNG のチャンクを走査し、cICP > iCCP > sRGB の優先順で色空間を判定する。
 */
async function detectPngColorSpace(bytes: Uint8Array): Promise<ColorSpace> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let offset = 8 // シグネチャの後ろから
  let iccp: Uint8Array | null = null
  let hasSrgbChunk = false

  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset)
    const type = chunkType(bytes, offset + 4)
    const dataStart = offset + 8
    if (dataStart + length > bytes.length) break

    if (type === 'cICP') {
      // data[0] = colour primaries (ITU-T H.273)
      const primaries = bytes[dataStart]
      return primaries === 9 || primaries === 11 || primaries === 12 ? 'display-p3' : 'srgb'
    }
    if (type === 'iCCP') {
      iccp = bytes.subarray(dataStart, dataStart + length)
    }
    if (type === 'sRGB') {
      hasSrgbChunk = true
    }
    if (type === 'IDAT' || type === 'IEND') break // 以降に色空間情報は無い

    offset = dataStart + length + 4 // データ + CRC4
  }

  if (iccp) {
    const profile = await inflateIccpProfile(iccp)
    if (profile) {
      const cs = colorSpaceFromIccProfile(profile)
      if (cs) return cs
    }
  }
  if (hasSrgbChunk) return 'srgb'
  return 'srgb'
}

function chunkType(b: Uint8Array, at: number): string {
  return String.fromCharCode(b[at]!, b[at + 1]!, b[at + 2]!, b[at + 3]!)
}

/**
 * iCCP チャンク（プロファイル名 + null + 圧縮方式 + zlib圧縮ICC）を展開する。
 * DecompressionStream 非対応環境では null。
 */
async function inflateIccpProfile(iccp: Uint8Array): Promise<Uint8Array | null> {
  // プロファイル名（最大79バイト）+ null 終端 を読み飛ばす
  let i = 0
  while (i < iccp.length && i < 80 && iccp[i] !== 0) i++
  if (iccp[i] !== 0) return null
  // i = null の位置。次が圧縮方式(1byte)、その次から zlib データ
  const compressed = iccp.subarray(i + 2)
  if (typeof DecompressionStream === 'undefined') return null
  try {
    const ds = new DecompressionStream('deflate')
    // Blob は ArrayBuffer 由来のビューを要求するため、コピーして型を確定させる
    const stream = new Blob([new Uint8Array(compressed)]).stream().pipeThrough(ds)
    const buf = await new Response(stream).arrayBuffer()
    return new Uint8Array(buf)
  } catch {
    return null
  }
}

// === JPEG ===

/**
 * JPEG の APP2 セグメントから ICC プロファイルを連結して色空間を判定する。
 */
function detectJpegColorSpace(bytes: Uint8Array): ColorSpace {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const ICC_SIG = 'ICC_PROFILE\0'
  const chunks: Array<{ seq: number; data: Uint8Array }> = []
  let offset = 2 // FFD8 の後ろ

  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) break
    const marker = bytes[offset + 1]!
    // スタンドアロンマーカー（長さ無し）は想定しない。SOS(0xDA)以降は画像本体。
    if (marker === 0xda || marker === 0xd9) break
    const segLength = view.getUint16(offset + 2) // 長さ2バイトを含む
    const segStart = offset + 4
    const segEnd = offset + 2 + segLength
    if (segEnd > bytes.length) break

    if (marker === 0xe2 && matchesAscii(bytes, segStart, ICC_SIG)) {
      const seq = bytes[segStart + ICC_SIG.length]!
      const data = bytes.subarray(segStart + ICC_SIG.length + 2, segEnd)
      chunks.push({ seq, data })
    }
    offset = segEnd
  }

  if (chunks.length === 0) return 'srgb'
  chunks.sort((a, b) => a.seq - b.seq)
  const total = chunks.reduce((n, c) => n + c.data.length, 0)
  const profile = new Uint8Array(total)
  let pos = 0
  for (const c of chunks) {
    profile.set(c.data, pos)
    pos += c.data.length
  }
  return colorSpaceFromIccProfile(profile) ?? 'srgb'
}

function matchesAscii(b: Uint8Array, at: number, s: string): boolean {
  if (at + s.length > b.length) return false
  for (let k = 0; k < s.length; k++) {
    if (b[at + k] !== s.charCodeAt(k)) return false
  }
  return true
}

// === ICC ===

/**
 * ICC プロファイルの赤原色 rXYZ タグの X 値から色空間を判定する。
 * RGB プロファイルでない、または rXYZ が無い場合は null。
 * @returns 'display-p3'（広色域）/ 'srgb' / null（判定不能）
 */
function colorSpaceFromIccProfile(profile: Uint8Array): ColorSpace | null {
  if (profile.length < 132) return null
  const view = new DataView(profile.buffer, profile.byteOffset, profile.byteLength)
  // ヘッダ offset16 = データ色空間シグネチャ。'RGB ' 以外は対象外。
  const dataColorSpace = chunkType(profile, 16)
  if (dataColorSpace !== 'RGB ') return null

  const tagCount = view.getUint32(128)
  let tableOffset = 132
  for (let t = 0; t < tagCount; t++) {
    if (tableOffset + 12 > profile.length) break
    const sig = chunkType(profile, tableOffset)
    if (sig === 'rXYZ') {
      const dataOffset = view.getUint32(tableOffset + 4)
      // XYZType: 'XYZ '(4) + reserved(4) + X,Y,Z(各 s15Fixed16)
      const xOffset = dataOffset + 8
      if (xOffset + 4 > profile.length) return null
      const redX = view.getInt32(xOffset) / 65536
      return redX > WIDE_GAMUT_RED_X_THRESHOLD ? 'display-p3' : 'srgb'
    }
    tableOffset += 12
  }
  return null
}
