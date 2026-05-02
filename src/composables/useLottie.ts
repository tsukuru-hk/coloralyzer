import {
  isRef,
  onBeforeUnmount,
  onMounted,
  watch,
  type Ref,
} from 'vue'
import lottie, { type AnimationItem } from 'lottie-web'

/** `useLottie` の起動オプション */
export interface UseLottieOptions {
  /** ループ再生（既定: `true`） */
  loop?: boolean
  /** 自動再生（既定: `true`） */
  autoplay?: boolean
  /** レンダラー（既定: `'svg'`） */
  renderer?: 'svg' | 'canvas' | 'html'
  /** アニメーション完了時に呼ばれるコールバック */
  onComplete?: () => void
  /** ロード失敗時に呼ばれるコールバック（`data_failed` / ロード例外） */
  onError?: (reason?: unknown) => void
}

/** `useLottie` が返すコントローラ */
export interface UseLottieReturn {
  /** 現在の Lottie インスタンス（未ロード時は `null`） */
  getAnimation: () => AnimationItem | null
  /** 明示的に破棄する（通常は unmount で自動実行される） */
  destroy: () => void
}

/**
 * Lottie のライフサイクル（マウント時ロード → 破棄時 destroy）と
 * `animationData` の差し替え再ロードを一括管理する composable。
 *
 * - `target` が `null` の間は待機し、DOM が用意された時点でロードする。
 * - `animationData` を `Ref` で渡すと、値が切り替わったときに安全に再ロードする。
 * - コンポーネントの unmount 時に必ず `destroy()` するため、インスタンスリークを防ぐ。
 *
 * @param target 描画先のコンテナ要素 `Ref`
 * @param animationData Lottie JSON（`Ref` を渡すと変更追従）
 * @param options `loop`/`autoplay`/`renderer` とイベントコールバック
 */
export function useLottie(
  target: Ref<HTMLElement | null>,
  animationData: unknown | Ref<unknown>,
  options: UseLottieOptions = {},
): UseLottieReturn {
  const {
    loop = true,
    autoplay = true,
    renderer = 'svg',
    onComplete,
    onError,
  } = options

  let instance: AnimationItem | null = null

  function load(data: unknown): void {
    const container = target.value
    if (!container || data == null) return

    destroy()
    try {
      instance = lottie.loadAnimation({
        container,
        renderer,
        loop,
        autoplay,
        animationData: data,
      })
      if (onComplete) {
        instance.addEventListener('complete', () => onComplete())
      }
      if (onError) {
        instance.addEventListener('data_failed', () => onError(undefined))
      }
    } catch (err) {
      instance = null
      onError?.(err)
    }
  }

  function destroy(): void {
    instance?.destroy()
    instance = null
  }

  const dataRef = isRef(animationData) ? animationData : null

  onMounted(() => {
    load(dataRef ? dataRef.value : animationData)
  })

  if (dataRef) {
    watch(dataRef, (next) => {
      if (!target.value) return
      load(next)
    })
  }

  watch(target, (el) => {
    if (!el) {
      destroy()
      return
    }
    if (!instance) {
      load(dataRef ? dataRef.value : animationData)
    }
  })

  onBeforeUnmount(() => {
    destroy()
  })

  return {
    getAnimation: () => instance,
    destroy,
  }
}
