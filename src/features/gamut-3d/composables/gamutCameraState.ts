import type { Vector3 } from 'three'

/** 視点プリセットの種類 */
export type GamutViewPreset = 'top' | 'bottom' | 'default'

/** カメラの初期位置（アイソメトリック視点） */
export const DEFAULT_CAMERA_POSITION: [number, number, number] = [7, 5, 7]
/** カメラの初期注視点 */
export const DEFAULT_CAMERA_TARGET: [number, number, number] = [0, 0, 0]

export interface GamutCameraState {
  position: [number, number, number]
  target: [number, number, number]
}

/**
 * 直近のカメラアングルを保持するモジュールレベル状態。
 * 画像タブの切替やページ遷移で GamutScene が再マウントされても
 * アングルを復元できるようにする（複数画像を同一アングルで比較する用途）。
 */
let savedState: GamutCameraState | null = null

export function saveGamutCamera(position: Vector3, target: Vector3): void {
  savedState = {
    position: [position.x, position.y, position.z],
    target: [target.x, target.y, target.z],
  }
}

export function getSavedGamutCamera(): GamutCameraState | null {
  return savedState
}
