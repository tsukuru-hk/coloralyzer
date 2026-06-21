/**
 * 画像ファイルを読み込み、Canvas に描画した ColorAwareImageData を返すユースケース。
 * Application層: インフラを組み合わせてシナリオを実行。
 *
 * 色分析の精度を保つため、リサイズせず原寸で読み込む。
 * 補間によるピクセル混合を避けることで、元画像に忠実な色情報を保持する。
 *
 * 作業色空間はディスプレイ能力ではなく「画像に埋め込まれた色空間」(ICC / PNG cICP)
 * から決定する。これにより同じ画像はどの環境でも同じ基準で解析される。
 */

import type { Result } from '@/core/result';
import type { ColorAwareImageData } from '@/domain/colorSpace';
import { loadImageToColorAwareImageData } from '@/infrastructure/imageLoader';
import type { ImageLoadError } from '@/infrastructure/imageLoader';
import { detectImageColorSpace } from '@/infrastructure/imageColorSpaceDetector';

/**
 * @param file 画像ファイル
 */
export async function loadImageUseCase(
  file: File,
): Promise<Result<ColorAwareImageData, ImageLoadError>> {
  const imageColorSpace = await detectImageColorSpace(file);
  return loadImageToColorAwareImageData(file, imageColorSpace);
}
