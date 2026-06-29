<template>
  <div ref="rootRef" class="absolute inset-0">
    <GamutToolbar
      v-if="showToolbar"
      :mode="mode"
      :brush-point-count="brushData.count"
      @set-mode="$emit('set-mode', $event)"
      @clear-brush="$emit('clear-brush')"
    />
    <GamutViewControls v-if="showToolbar" @set-view="setViewPreset" />
    <GamutWireframeSelector v-if="showToolbar" v-model="wireframeGamut" />
    <TresCanvas v-if="isMounted" :clear-color="'#a0a0a0'" :preserve-drawing-buffer="true">
      <TresPerspectiveCamera :position="initialCameraPosition" :fov="20" />
      <OrbitControls
        ref="controlsRef"
        :target="initialCameraTarget"
        :enable-damping="true"
        :damping-factor="0.08"
      />

      <TresGroup ref="spinGroupRef">
        <GamutPointCloud
          v-if="mode === 'bulk'"
          :data="pointCloudData"
          @animation-start="onAnimationStart"
          @animation-end="onAnimationEnd"
        />

        <GamutBrushCloud v-if="mode === 'brush'" :data="brushData" />

        <GamutReferenceGrid :wireframe-gamut="wireframeGamut" />
      </TresGroup>

    </TresCanvas>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, onBeforeUnmount, watch } from 'vue'
import type { WireframeGamut } from '@/domain/colorSpace'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import type { Camera, Group, Vector3 } from 'three'
import type { GamutPointCloudData } from '@/types/analysis'
import type { GamutMode } from './composables/useGamutBrush'
import {
  DEFAULT_CAMERA_POSITION,
  DEFAULT_CAMERA_TARGET,
  getSavedGamutCamera,
  saveGamutCamera,
} from './composables/gamutCameraState'
import type { GamutViewPreset } from './composables/gamutCameraState'
import GamutPointCloud from './GamutPointCloud.vue'
import GamutBrushCloud from './GamutBrushCloud.vue'
import GamutReferenceGrid from './GamutReferenceGrid.vue'
import GamutToolbar from './GamutToolbar.vue'
import GamutViewControls from './GamutViewControls.vue'
import GamutWireframeSelector from './GamutWireframeSelector.vue'

/** スピンの総尺（秒） */
const SPIN_DURATION = 2.0
/** スピン角度（1 周） */
const SPIN_ANGLE = Math.PI * 2

const props = withDefaults(defineProps<{
  pointCloudData: GamutPointCloudData | null
  mode: GamutMode
  brushData: GamutPointCloudData
  /** ツールバー（自動/手動切替）を表示するか */
  showToolbar?: boolean
  /** 再マウントをまたいでカメラアングルを保持するか（画像タブ切替時の比較用） */
  persistCamera?: boolean
}>(), {
  showToolbar: true,
  persistCamera: false,
})

defineEmits<{
  'set-mode': [mode: GamutMode]
  'clear-brush': []
}>()

const wireframeGamut = ref<WireframeGamut>('srgb')

const isMounted = ref(false)
onMounted(() => { isMounted.value = true })

const rootRef = ref<HTMLElement | null>(null)

/** PNG エクスポート用に WebGL の Canvas 要素を返す（未マウント時は null） */
function captureCanvas(): HTMLCanvasElement | null {
  return rootRef.value?.querySelector('canvas') ?? null
}

defineExpose({ captureCanvas })

const spinGroupRef = shallowRef<Group | null>(null)

/* ---------- camera ---------- */

/** OrbitControls のうちこのコンポーネントが触る部分 */
interface CameraControls {
  object: Camera
  target: Vector3
  update: () => void
}

const controlsRef = shallowRef<{ instance?: CameraControls } | null>(null)

// 前回保存したアングルがあれば復元した状態でマウントする（タブ切替対策）
const savedCamera = props.persistCamera ? getSavedGamutCamera() : null
const initialCameraPosition = savedCamera?.position ?? DEFAULT_CAMERA_POSITION
const initialCameraTarget = savedCamera?.target ?? DEFAULT_CAMERA_TARGET

function setViewPreset(view: GamutViewPreset): void {
  const controls = controlsRef.value?.instance
  if (!controls) return
  // スピン中に押されても即座に固定アングルになるよう回転を止める
  stopSpin()

  const camera = controls.object
  const target = controls.target
  if (view === 'default') {
    target.set(...DEFAULT_CAMERA_TARGET)
    camera.position.set(...DEFAULT_CAMERA_POSITION)
  } else {
    // ズーム（注視点までの距離）を保ったまま真上/真下へ移動する。
    // 上方向ベクトルと完全に一致すると OrbitControls が特異点になるため z をわずかにずらす。
    const distance = camera.position.distanceTo(target)
    const sign = view === 'top' ? 1 : -1
    camera.position.set(target.x, target.y + sign * distance, target.z + distance * 1e-3)
  }
  controls.update()
}

let spinning = false
let spinStartTime = -1
let rafId = 0

function stopSpin(): void {
  spinning = false
  const group = spinGroupRef.value
  if (group) group.rotation.y = 0
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
}

function onAnimationStart(): void {
  // bulk 以外に切り替わっていたら何もしない（多重 emit への防御）
  if (props.mode !== 'bulk') return
  spinning = true
  spinStartTime = performance.now()
  if (!rafId) tick()
}

function onAnimationEnd(): void {
  stopSpin()
}

function tick(): void {
  if (!spinning) {
    rafId = 0
    return
  }

  const group = spinGroupRef.value
  if (!group) {
    // まだマウント待ち: 次フレームで再試行
    rafId = requestAnimationFrame(tick)
    return
  }

  const t = (performance.now() - spinStartTime) / 1000
  if (t < SPIN_DURATION) {
    const p = t / SPIN_DURATION
    const eased = 1 - Math.pow(1 - p, 3)
    group.rotation.y = SPIN_ANGLE * eased
    rafId = requestAnimationFrame(tick)
  } else {
    stopSpin()
  }
}

// モードが bulk 以外に切り替わった瞬間にスピンを止める。
// これにより、スピン中の mode 変更でブラシ側に回転が波及する問題を防ぐ。
watch(() => props.mode, (next) => {
  if (next !== 'bulk') stopSpin()
})

onBeforeUnmount(() => {
  // アンマウント時点のアングルを保存し、次回マウント時に復元する
  if (props.persistCamera) {
    const controls = controlsRef.value?.instance
    if (controls) saveGamutCamera(controls.object.position, controls.target)
  }
  if (rafId) cancelAnimationFrame(rafId)
})
</script>
