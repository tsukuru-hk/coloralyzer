<template>
  <!-- ファイル入力：クリック／D&D で画像を選び検証後に親へ通知 -->
  <div
    :class="cn(
      'dropzone-root group flex items-center justify-center rounded-2xl p-8 text-center transition-colors cursor-pointer',
      dragState === 'idle' && 'border-[6px] border-dashed border-border bg-card hover:border-primary/50 hover:bg-secondary/50',
      dragState === 'dragover' && 'border-[6px] border-dashed border-primary bg-primary/5',
      dragState === 'error' && 'border-[6px] border-dashed border-destructive bg-red-50',
    )"
    @click="inputRef?.click()"
    @mouseenter="emit('hover-change', true)"
    @mouseleave="emit('hover-change', false)"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <!-- 非表示の file input（ラベル／外枠クリックで開く） -->
    <input
      ref="inputRef"
      type="file"
      :accept="acceptAttr"
      :multiple="multiple"
      class="hidden"
      @change="onInputChange"
    />
    <!-- ヒント文とファイルカード -->
    <div class="flex flex-col items-center gap-8">
      <!-- ファイルカードアニメーション -->
      <div class="file-cards-container">
        <div
          v-for="(card, i) in fileCards"
          :key="card.ext"
          class="file-card"
          :class="`file-card-${i}`"
        >
          <!-- カード外形ボーダー（clip-path では border が効かないため SVG で描画） -->
          <svg class="file-card-border" viewBox="0 0 96 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 0.5 H77.5 L95.5 18.5 V116 A4 4 0 0 1 91.5 120 H4 A3.5 3.5 0 0 1 0.5 116.5 V4 A3.5 3.5 0 0 1 4 0.5 Z" stroke="rgba(0,0,0,0.12)" stroke-width="2" fill="none" />
            <path d="M78 0.5 V14.5 A3.5 3.5 0 0 1 74.5 18 H78 L95.5 18 L78 0.5 Z" fill="rgba(0,0,0,0.04)" stroke="rgba(0,0,0,0.08)" stroke-width="0.5" />
          </svg>
          <!-- プレースホルダーアイコン（後で差し替え可能） -->
          <svg viewBox="0 0 44 44" class="file-card-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1.5" y="4.5" width="41" height="38" rx="3" stroke="currentColor" stroke-width="3" fill="none" />
            <circle cx="30" cy="16" r="4.5" fill="currentColor" />
            <path d="M5 37 L16 19 L27 37 Z" fill="currentColor" />
            <path d="M22 37 L30 25 L38 37 Z" fill="currentColor" />
            <rect x="5" y="35" width="34" height="4" rx="2" fill="currentColor" />
          </svg>
          <span class="file-card-label">.{{ card.ext }}</span>
        </div>
      </div>

      <p class="text-sm font-medium text-foreground">
        {{ dragState === 'dragover' ? 'ドロップして読み込み' : 'ドラッグ＆ドロップ、またはクリックして画像を選択' }}
      </p>
      <p v-if="errorText" class="text-xs text-destructive">{{ errorText }}</p>
      <p v-else class="text-xs text-muted-foreground">
        {{ allowedExts.map(e => e.toUpperCase().replace('.', '')).join(' / ') }} — 最大 {{ Math.round(maxSize / 1024 / 1024) }}MB
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { cn } from '@/lib/utils'

const fileCards = [
  { ext: 'png' },
  { ext: 'webp' },
  { ext: 'jpg' },
]

const props = withDefaults(defineProps<{
  /** 許可する拡張子（先頭ドット付き、小文字）。例: `['.jpg', '.png']` */
  allowedExts?: readonly string[]
  /** 許容する最大ファイルサイズ（バイト） */
  maxSize?: number
  /** 複数ファイルの選択／ドロップを許可するか */
  multiple?: boolean
}>(), {
  allowedExts: () => ['.jpg', '.jpeg', '.png', '.webp'],
  maxSize: 10 * 1024 * 1024,
  multiple: true,
})

const emit = defineEmits<{
  /** 妥当なファイルが1件以上選択された。配列の長さは常に 1 以上。 */
  'files-selected': [files: File[]]
  'hover-change': [hovered: boolean]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const dragState = ref<'idle' | 'dragover' | 'error'>('idle')
const errorText = ref<string | null>(null)
/** dragenter/leave はネストした子で連発するためカウンタで判定 */
let dragDepth = 0

/** ネイティブ `<input>` の `accept` 属性（MIME も拡張子も許可しているブラウザ互換のためドット付きで渡す） */
const acceptAttr = computed(() => props.allowedExts.join(','))

/**
 * 拡張子と MIME タイプの両方から「画像ファイルとして許容できるか」を判定する。
 * 拡張子だけではリネーム偽装を許してしまうため、`file.type` が `image/` で始まることも併せて確認する。
 */
function validateOne(file: File): { ok: true; file: File } | { ok: false; reason: string } {
  const name = file.name
  const dotIndex = name.lastIndexOf('.')
  const ext = dotIndex >= 0 ? name.slice(dotIndex).toLowerCase() : ''
  const allowed = props.allowedExts.map((e) => e.toLowerCase())
  if (!ext || !allowed.includes(ext)) {
    return {
      ok: false,
      reason: `${name}: 対応形式 (${allowed.join(', ')}) ではありません`,
    }
  }
  if (file.type && !file.type.startsWith('image/')) {
    return {
      ok: false,
      reason: `${name}: 画像ファイルではありません (${file.type})`,
    }
  }
  if (file.size > props.maxSize) {
    const limitMb = Math.round(props.maxSize / 1024 / 1024)
    return {
      ok: false,
      reason: `${name}: ${limitMb}MB を超えています`,
    }
  }
  return { ok: true, file }
}

function processFiles(fileList: FileList | File[] | null | undefined): void {
  errorText.value = null
  dragState.value = 'idle'
  dragDepth = 0

  const files = fileList ? Array.from(fileList) : []
  if (files.length === 0) return

  const targets = props.multiple ? files : files.slice(0, 1)
  const accepted: File[] = []
  const errors: string[] = []
  for (const f of targets) {
    const result = validateOne(f)
    if (result.ok) accepted.push(result.file)
    else errors.push(result.reason)
  }

  if (!props.multiple && files.length > 1) {
    errors.unshift('複数ファイルは未対応です。先頭の1件のみ処理します。')
  }

  if (errors.length > 0) {
    errorText.value = errors.join(' / ')
    if (accepted.length === 0) {
      dragState.value = 'error'
      return
    }
  }

  if (accepted.length > 0) {
    emit('files-selected', accepted)
  }
}

function onDragEnter(): void {
  dragDepth++
  dragState.value = 'dragover'
  emit('hover-change', true)
}

function onDragLeave(): void {
  dragDepth = Math.max(dragDepth - 1, 0)
  if (dragDepth === 0) {
    dragState.value = 'idle'
    emit('hover-change', false)
  }
}

function onDrop(event: DragEvent): void {
  processFiles(event.dataTransfer?.files)
}

function onInputChange(event: Event): void {
  const target = event.target as HTMLInputElement
  processFiles(target.files)
  // 同じファイルを選び直しても `change` が発火するようリセット
  target.value = ''
}
</script>

<style scoped>
.file-cards-container {
  position: relative;
  width: 280px;
  height: 160px;
  margin: 0 auto;
}

.file-card {
  position: absolute;
  width: 96px;
  height: 120px;
  background: white;
  /* 右上を三角に切り落とす */
  clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.08));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: bottom center;
}

/* ── カード外形ボーダー SVG ── */
.file-card-border {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.file-card-icon {
  width: 48px;
  height: 48px;
  color: #999;
  transition: color 0.3s ease;
}

.file-card-label {
  position: absolute;
  bottom: 8px;
  left: 10px;
  font-size: 12px;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
  transition: color 0.3s ease;
}

/* ── デフォルト（idle）の位置 — 3枚を中央基準で左右対称 ── */
.file-card-0 {
  left: 42px;
  bottom: 3px;
  transform: rotate(-8deg);
  z-index: 1;
}
.file-card-1 {
  left: 92px;
  bottom: 6px;
  transform: rotate(0deg);
  z-index: 2;
}
.file-card-2 {
  left: 142px;
  bottom: 0px;
  transform: rotate(8deg);
  z-index: 3;
}

/* ── ホバー時：カードが左右対称に広がって浮き上がる ── */
.dropzone-root:hover .file-card-0,
.dropzone-root.dragover .file-card-0 {
  transform: rotate(-14deg) translateX(-14px) translateY(-8px);
}
.dropzone-root:hover .file-card-1,
.dropzone-root.dragover .file-card-1 {
  transform: rotate(0deg) translateY(-14px);
}
.dropzone-root:hover .file-card-2,
.dropzone-root.dragover .file-card-2 {
  transform: rotate(14deg) translateX(14px) translateY(-8px);
}

/* ── ホバー時：ラベルの色を強調 ── */
.dropzone-root:hover .file-card-label {
  color: hsl(var(--primary));
}
</style>
