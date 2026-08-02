<template>
  <div ref="containerRef" class="scene3d">
    <canvas ref="canvasRef" class="scene3d-canvas" />

    <!-- 顶部信息条 -->
    <div class="top-bar">
      <div class="back-btn" data-ui @click="goBack">
        <van-icon name="arrow-left" size="18" />
      </div>
      <div class="hud">
        <span>{{ fps }} FPS</span>
        <span class="divider">|</span>
        <span>X {{ coords.x }} · Z {{ coords.z }}</span>
      </div>
    </div>

    <!-- 首次进入的操作提示 -->
    <transition name="fade">
      <div v-if="showHint" class="hint" data-ui @click="showHint = false">
        <p class="hint-title">第三人称漫游</p>
        <p>左半屏按住 —— 虚拟摇杆控制移动</p>
        <p>右半屏拖动 —— 环绕视角</p>
        <p>右下按钮 / 空格 —— 跳跃</p>
        <p class="hint-tip">电脑上可用 WASD 移动、Shift 加速</p>
        <div class="hint-close">点击开始</div>
      </div>
    </transition>

    <!-- 虚拟摇杆 -->
    <div
      v-show="joystick.active"
      class="joystick-base"
      :style="{ transform: `translate3d(${joystick.baseX}px, ${joystick.baseY}px, 0)` }"
    >
      <div class="joystick-ring" />
    </div>
    <div
      v-show="joystick.active"
      class="joystick-knob"
      :style="{ transform: `translate3d(${joystick.knobX}px, ${joystick.knobY}px, 0)` }"
    />

    <!-- 跳跃按钮 -->
    <div class="jump-btn" data-ui @pointerdown.stop="onJump">
      <van-icon name="upgrade" size="24" />
      <span>跳跃</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as THREE from 'three'
import { createWorld, type World } from '../scene3d/world'
import { createCharacter, type Character } from '../scene3d/character'
import { InputControls, JOYSTICK_RADIUS } from '../scene3d/controls'
import { Player } from '../scene3d/player'
import { ThirdPersonCamera } from '../scene3d/thirdPersonCamera'

const router = useRouter()

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const showHint = ref(true)
const fps = ref(0)
const coords = reactive({ x: '0', z: '0' })
const joystick = reactive({
  active: false,
  baseX: 0,
  baseY: 0,
  knobX: 0,
  knobY: 0,
})

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let world: World | null = null
let character: Character | null = null
let controls: InputControls | null = null
let player: Player | null = null
let cameraRig: ThirdPersonCamera | null = null
let frameId = 0
let resizeObserver: ResizeObserver | null = null

const clock = new THREE.Clock()
const focusPoint = new THREE.Vector3()
let fpsSampleStart = 0
let fpsFrames = 0

function onJump() {
  controls?.requestJump()
  showHint.value = false
}

function goBack() {
  // history.state.back 为空说明是直接打开 /scene 的，退回去会离开站点
  if (router.options.history.state.back) router.back()
  else router.push('/')
}

function onWheel(event: WheelEvent) {
  event.preventDefault()
  cameraRig?.zoom(event.deltaY * 0.01)
}

function resize() {
  const container = containerRef.value
  if (!container || !renderer || !camera) return
  const width = container.clientWidth
  const height = container.clientHeight
  if (width === 0 || height === 0) return

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
}

function animate() {
  frameId = requestAnimationFrame(animate)
  if (!renderer || !scene || !camera || !world || !character || !controls || !player || !cameraRig) {
    return
  }

  // 卡顿时限制单帧步长，避免角色瞬移穿墙
  const dt = Math.min(clock.getDelta(), 0.05)
  const elapsed = clock.elapsedTime

  const look = controls.consumeLook()
  if (look.x !== 0 || look.y !== 0) {
    cameraRig.rotate(look.x, look.y)
    showHint.value = false
  }

  const jump = controls.consumeJump()
  if (controls.move.x !== 0 || controls.move.y !== 0) showHint.value = false

  player.update(
    dt,
    {
      moveX: controls.move.x,
      moveY: controls.move.y,
      cameraYaw: cameraRig.yaw,
      running: controls.running,
      jump,
    },
    world.obstacles,
    world.bounds,
  )

  character.root.position.copy(player.position)
  character.root.rotation.y = player.yaw
  character.update(dt, player.speed01, player.grounded)

  focusPoint.set(player.position.x, player.position.y + character.eyeHeight, player.position.z)
  cameraRig.update(dt, focusPoint, world.colliders)

  world.update(dt, elapsed)
  renderer.render(scene, camera)

  // 摇杆位置同步给 UI
  joystick.active = controls.joystickActive
  if (controls.joystickActive) {
    joystick.baseX = controls.joystickBase.x - JOYSTICK_RADIUS
    joystick.baseY = controls.joystickBase.y - JOYSTICK_RADIUS
    joystick.knobX = controls.joystickKnob.x - 26
    joystick.knobY = controls.joystickKnob.y - 26
  }

  // FPS 与坐标每半秒刷新一次，别让 DOM 更新拖慢渲染。
  // 这里用真实时间统计，dt 被上面截断过，拿它算出来的帧率是假的。
  const now = performance.now()
  fpsFrames++
  if (now - fpsSampleStart >= 500) {
    fps.value = Math.round((fpsFrames * 1000) / (now - fpsSampleStart))
    coords.x = player.position.x.toFixed(0)
    coords.z = player.position.z.toFixed(0)
    fpsSampleStart = now
    fpsFrames = 0
  }
}

function onVisibilityChange() {
  if (document.hidden) {
    cancelAnimationFrame(frameId)
    frameId = 0
  } else if (frameId === 0) {
    clock.getDelta() // 丢掉切后台期间累积的时间
    fpsSampleStart = performance.now()
    fpsFrames = 0
    animate()
  }
}

onMounted(() => {
  const container = containerRef.value
  const canvas = canvasRef.value
  if (!container || !canvas) return

  // 高分屏本身就够细腻，再开抗锯齿只是白白多一份开销
  const pixelRatio = Math.min(window.devicePixelRatio, 1.5)
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: pixelRatio < 1.5,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(pixelRatio)
  renderer.setSize(container.clientWidth, container.clientHeight, false)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 400)

  world = createWorld(scene)
  character = createCharacter()
  scene.add(character.root)

  player = new Player(character.radius)
  character.root.position.copy(player.position)
  character.root.rotation.y = player.yaw

  cameraRig = new ThirdPersonCamera(camera)
  controls = new InputControls(container)

  container.addEventListener('wheel', onWheel, { passive: false })
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('resize', resize)
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container)

  clock.start()
  fpsSampleStart = performance.now()
  animate()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frameId)
  frameId = 0

  containerRef.value?.removeEventListener('wheel', onWheel)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('resize', resize)
  resizeObserver?.disconnect()
  resizeObserver = null

  controls?.dispose()
  character?.dispose()
  world?.dispose()
  renderer?.dispose()

  controls = null
  character = null
  world = null
  player = null
  cameraRig = null
  camera = null
  scene = null
  renderer = null
})
</script>

<style scoped>
.scene3d {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #bcd9ee;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.scene3d-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.top-bar {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top));
  left: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  pointer-events: none;
}

.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(6px);
  pointer-events: auto;
}

.hud {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  color: #fff;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(6px);
  font-variant-numeric: tabular-nums;
}

.hud .divider {
  opacity: 0.4;
}

.hint {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 78%;
  max-width: 320px;
  padding: 22px 20px 16px;
  border-radius: 16px;
  background: rgba(16, 20, 28, 0.72);
  backdrop-filter: blur(10px);
  color: rgba(255, 255, 255, 0.86);
  font-size: 13px;
  line-height: 2;
  text-align: center;
}

.hint-title {
  font-size: 17px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 8px;
}

.hint-tip {
  margin-top: 6px;
  font-size: 12px;
  opacity: 0.6;
}

.hint-close {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  font-size: 13px;
  color: #6ab7ff;
}

.joystick-base,
.joystick-knob {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  will-change: transform;
}

.joystick-base {
  width: 112px;
  height: 112px;
}

.joystick-ring {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.12);
}

.joystick-knob {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
}

.jump-btn {
  position: absolute;
  right: 28px;
  bottom: calc(48px + env(safe-area-inset-bottom));
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 12px;
  color: #fff;
  background: rgba(255, 255, 255, 0.22);
  border: 2px solid rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(6px);
}

.jump-btn:active {
  background: rgba(255, 255, 255, 0.4);
  transform: scale(0.94);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.35s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
