import * as THREE from 'three'

const MIN_PITCH = -0.25
const MAX_PITCH = 1.15
const MIN_DISTANCE = 1.6
const LOOK_SENSITIVITY = 0.005

/** 跟在角色身后的第三人称相机，会自动躲开挡在中间的物体 */
export class ThirdPersonCamera {
  /** 0 表示相机在角色 +Z 一侧，视线朝 -Z，也就是开局望向广场 */
  yaw = 0
  pitch = 0.32
  /** 期望距离，滚轮 / 双指可以调 */
  distance = 7

  private readonly camera: THREE.PerspectiveCamera
  private readonly target = new THREE.Vector3()
  private readonly desiredPosition = new THREE.Vector3()
  private readonly offset = new THREE.Vector3()
  private readonly raycaster = new THREE.Raycaster()
  private currentDistance = 7
  private initialized = false

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera
  }

  /** 屏幕拖动量转成视角旋转 */
  rotate(deltaX: number, deltaY: number) {
    this.yaw -= deltaX * LOOK_SENSITIVITY
    this.pitch = THREE.MathUtils.clamp(this.pitch + deltaY * LOOK_SENSITIVITY, MIN_PITCH, MAX_PITCH)
  }

  zoom(delta: number) {
    this.distance = THREE.MathUtils.clamp(this.distance + delta, 3, 14)
  }

  update(dt: number, focus: THREE.Vector3, colliders: THREE.Object3D[]) {
    // 焦点平滑跟随，跳跃时纵向跟得更慢一点，画面不会跳
    const follow = 1 - Math.exp(-12 * dt)
    if (!this.initialized) {
      this.target.copy(focus)
      this.initialized = true
    } else {
      this.target.x += (focus.x - this.target.x) * follow
      this.target.z += (focus.z - this.target.z) * follow
      this.target.y += (focus.y - this.target.y) * (1 - Math.exp(-6 * dt))
    }

    const cosPitch = Math.cos(this.pitch)
    this.offset.set(
      Math.sin(this.yaw) * cosPitch,
      Math.sin(this.pitch),
      Math.cos(this.yaw) * cosPitch,
    )

    // 从角色往相机方向打一条射线，被挡住就把相机拉近
    let distance = this.distance
    this.raycaster.set(this.target, this.offset)
    this.raycaster.far = this.distance
    const hits = this.raycaster.intersectObjects(colliders, false)
    if (hits.length > 0) {
      distance = Math.max(MIN_DISTANCE, hits[0].distance - 0.4)
    }

    // 拉近要快（否则会穿墙），推远要慢（避免抖动）
    const smoothing = distance < this.currentDistance ? 1 : 1 - Math.exp(-6 * dt)
    this.currentDistance += (distance - this.currentDistance) * smoothing

    this.desiredPosition.copy(this.target).addScaledVector(this.offset, this.currentDistance)
    // 别让相机钻到地面以下
    this.desiredPosition.y = Math.max(this.desiredPosition.y, 0.6)

    this.camera.position.copy(this.desiredPosition)
    this.camera.lookAt(this.target)
  }
}
