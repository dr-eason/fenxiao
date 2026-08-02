import * as THREE from 'three'
import type { Obstacle } from './world'

const WALK_SPEED = 3.4
const RUN_SPEED = 6.4
const ACCELERATION = 14
const TURN_SPEED = 12
const GRAVITY = 20
const JUMP_SPEED = 7.2

export interface PlayerInput {
  /** 摇杆 / 键盘的移动向量，相机坐标系下：x 右、y 前 */
  moveX: number
  moveY: number
  /** 相机水平朝向，移动方向以它为参照 */
  cameraYaw: number
  running: boolean
  jump: boolean
}

/** 角色移动、跳跃与碰撞 */
export class Player {
  /** 出生点在广场外侧，正对中央喷泉 */
  readonly position = new THREE.Vector3(0, 0, 16)
  /** 模型朝向（弧度），PI 表示面向 -Z */
  yaw = Math.PI
  /** 当前速度占最大速度的比例，交给动画用 */
  speed01 = 0
  grounded = true

  private readonly velocity = new THREE.Vector3()
  private verticalSpeed = 0
  private readonly radius: number
  private readonly desired = new THREE.Vector3()

  constructor(radius: number) {
    this.radius = radius
  }

  update(dt: number, input: PlayerInput, obstacles: Obstacle[], bounds: number) {
    const { moveX, moveY, cameraYaw } = input

    // 相机朝向下的前 / 右向量
    const forwardX = -Math.sin(cameraYaw)
    const forwardZ = -Math.cos(cameraYaw)
    const rightX = Math.cos(cameraYaw)
    const rightZ = -Math.sin(cameraYaw)

    const inputLength = Math.min(1, Math.hypot(moveX, moveY))
    const maxSpeed = input.running ? RUN_SPEED : WALK_SPEED

    this.desired.set(
      (rightX * moveX + forwardX * moveY) * maxSpeed,
      0,
      (rightZ * moveX + forwardZ * moveY) * maxSpeed,
    )
    if (inputLength > 0) {
      // 摇杆推得越少走得越慢
      this.desired.setLength(maxSpeed * inputLength)
    }

    // 平滑加减速，避免起步和急停太生硬
    const blend = 1 - Math.exp(-ACCELERATION * dt)
    this.velocity.x += (this.desired.x - this.velocity.x) * blend
    this.velocity.z += (this.desired.z - this.velocity.z) * blend

    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z)
    this.speed01 = Math.min(1, horizontalSpeed / RUN_SPEED)

    // 转向：朝着移动方向平滑旋转
    if (horizontalSpeed > 0.15) {
      const targetYaw = Math.atan2(this.velocity.x, this.velocity.z)
      let diff = targetYaw - this.yaw
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      this.yaw += diff * Math.min(1, TURN_SPEED * dt)
    }

    // 跳跃与重力
    if (input.jump && this.grounded) {
      this.verticalSpeed = JUMP_SPEED
      this.grounded = false
    }
    this.verticalSpeed -= GRAVITY * dt
    this.position.y += this.verticalSpeed * dt
    if (this.position.y <= 0) {
      this.position.y = 0
      this.verticalSpeed = 0
      this.grounded = true
    }

    this.position.x += this.velocity.x * dt
    this.position.z += this.velocity.z * dt

    this.resolveCollisions(obstacles)
    this.clampToBounds(bounds)
  }

  /** 把角色当成圆，从最浅的一侧推出障碍盒 */
  private resolveCollisions(obstacles: Obstacle[]) {
    const r = this.radius
    for (const box of obstacles) {
      const minX = box.minX - r
      const maxX = box.maxX + r
      const minZ = box.minZ - r
      const maxZ = box.maxZ + r

      if (
        this.position.x <= minX ||
        this.position.x >= maxX ||
        this.position.z <= minZ ||
        this.position.z >= maxZ
      ) {
        continue
      }

      const left = this.position.x - minX
      const right = maxX - this.position.x
      const back = this.position.z - minZ
      const front = maxZ - this.position.z
      const min = Math.min(left, right, back, front)

      if (min === left) {
        this.position.x = minX
        this.velocity.x = Math.min(0, this.velocity.x)
      } else if (min === right) {
        this.position.x = maxX
        this.velocity.x = Math.max(0, this.velocity.x)
      } else if (min === back) {
        this.position.z = minZ
        this.velocity.z = Math.min(0, this.velocity.z)
      } else {
        this.position.z = maxZ
        this.velocity.z = Math.max(0, this.velocity.z)
      }
    }
  }

  private clampToBounds(bounds: number) {
    const limit = bounds - this.radius - 0.4
    const distance = Math.hypot(this.position.x, this.position.z)
    if (distance > limit) {
      const scale = limit / distance
      this.position.x *= scale
      this.position.z *= scale
      this.velocity.multiplyScalar(0.5)
    }
  }
}
