<template>
  <canvas
    ref="canvasRef"
    class="pointer-events-none absolute inset-0 z-10 h-full w-full"
  />
</template>

<script setup lang="ts">
/**
 * 親要素の上にスキャンパーティクルを描画するオーバーレイ。
 * マウント中はアニメーションが走り続ける。v-if で制御してアンマウントで停止。
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)

let animFrame = 0
let startTime = 0
let prevTimestamp = 0
let displayW = 0
let displayH = 0
let canvasReady = false

const SCAN_DURATION = 1500

interface Particle {
  x: number
  y: number
  opacity: number
  life: number
  maxLife: number
  size: number
}

const particles: Particle[] = []

function animate(timestamp: number) {
  if (!startTime) {
    startTime = timestamp
    prevTimestamp = timestamp
  }
  const elapsed = timestamp - startTime
  const dt = timestamp - prevTimestamp
  prevTimestamp = timestamp

  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 初回にキャンバス解像度を確定
  if (!canvasReady) {
    const rect = canvas.getBoundingClientRect()
    displayW = rect.width
    displayH = rect.height
    const dpr = window.devicePixelRatio
    canvas.width = Math.floor(displayW * dpr)
    canvas.height = Math.floor(displayH * dpr)
    ctx.scale(dpr, dpr)
    canvasReady = true
  }

  const scanProgress = Math.min(elapsed / SCAN_DURATION, 1)
  const scanY = scanProgress * displayH

  // スキャン中はパーティクルを生成
  if (scanProgress < 1) {
    const count = 6 + Math.floor(Math.random() * 5)
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * displayW,
        y: scanY + (Math.random() - 0.5) * displayH * 0.12,
        opacity: 0.5 + Math.random() * 0.5,
        life: 1,
        maxLife: 150 + Math.random() * 250,
        size: 1.2 + Math.random() * 1.8,
      })
    }
  }

  // 描画
  ctx.clearRect(0, 0, displayW, displayH)

  // スキャンラインのグロー
  if (scanProgress < 1) {
    const grad = ctx.createLinearGradient(0, scanY - 25, 0, scanY + 25)
    grad.addColorStop(0, 'rgba(200, 230, 255, 0)')
    grad.addColorStop(0.5, 'rgba(200, 230, 255, 0.12)')
    grad.addColorStop(1, 'rgba(200, 230, 255, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, scanY - 25, displayW, 50)
  }

  // パーティクル
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.life -= dt / p.maxLife
    if (p.life <= 0) {
      particles.splice(i, 1)
      continue
    }
    ctx.globalAlpha = p.opacity * p.life
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  animFrame = requestAnimationFrame(animate)
}

onMounted(() => {
  animFrame = requestAnimationFrame(animate)
})

onBeforeUnmount(() => {
  if (animFrame) cancelAnimationFrame(animFrame)
  particles.length = 0
})
</script>
