import { ref, onBeforeUnmount, type Ref } from 'vue'

/**
 * メディアクエリの一致状態をリアクティブに返す composable。
 * SplitPane のようにモバイルで別レイアウトへ切り替える際、
 * スロットの二重レンダリングを避けるための JS 分岐に使う。
 *
 * @param query - CSS メディアクエリ文字列（例: '(min-width: 768px)'）
 * @returns クエリに一致しているかどうかの Ref
 */
export function useMediaQuery(query: string): Ref<boolean> {
  const mql = window.matchMedia(query)
  const matches = ref(mql.matches)

  const onChange = (e: MediaQueryListEvent) => {
    matches.value = e.matches
  }
  mql.addEventListener('change', onChange)

  onBeforeUnmount(() => {
    mql.removeEventListener('change', onChange)
  })

  return matches
}
