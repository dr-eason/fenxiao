/**
 * 触摸 / 鼠标 / 键盘输入。
 *
 * 手机：屏幕左半边按下出现虚拟摇杆控制移动，右半边拖动转视角。
 * 电脑：WASD 或方向键移动，鼠标拖动转视角，Shift 加速，空格跳跃。
 */

export interface Vec2 {
  x: number
  y: number
}

export const JOYSTICK_RADIUS = 56

export class InputControls {
  /** 移动输入，x 右为正、y 前为正，长度已归一化到 0~1 */
  readonly move: Vec2 = { x: 0, y: 0 }
  /** 摇杆是否激活，以及圆心 / 摇杆头的屏幕坐标（供 UI 绘制） */
  joystickActive = false
  readonly joystickBase: Vec2 = { x: 0, y: 0 }
  readonly joystickKnob: Vec2 = { x: 0, y: 0 }
  /** 是否处于奔跑（摇杆推到底或按住 Shift） */
  running = false

  private readonly element: HTMLElement
  private lookDelta: Vec2 = { x: 0, y: 0 }
  private jumpQueued = false

  private movePointerId: number | null = null
  private lookPointerId: number | null = null
  private lastLook: Vec2 = { x: 0, y: 0 }
  private readonly keys = new Set<string>()

  constructor(element: HTMLElement) {
    this.element = element

    element.addEventListener('pointerdown', this.onPointerDown)
    element.addEventListener('pointermove', this.onPointerMove)
    element.addEventListener('pointerup', this.onPointerUp)
    element.addEventListener('pointercancel', this.onPointerUp)
    element.addEventListener('contextmenu', this.onContextMenu)
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.reset)
  }

  /** 取出这一帧累积的视角拖动量，取完清零 */
  consumeLook(): Vec2 {
    const delta = { x: this.lookDelta.x, y: this.lookDelta.y }
    this.lookDelta.x = 0
    this.lookDelta.y = 0
    return delta
  }

  /** 取出跳跃请求，取完清零 */
  consumeJump(): boolean {
    const jump = this.jumpQueued
    this.jumpQueued = false
    return jump
  }

  /** 给屏幕上的跳跃按钮调用 */
  requestJump() {
    this.jumpQueued = true
  }

  dispose() {
    const element = this.element
    element.removeEventListener('pointerdown', this.onPointerDown)
    element.removeEventListener('pointermove', this.onPointerMove)
    element.removeEventListener('pointerup', this.onPointerUp)
    element.removeEventListener('pointercancel', this.onPointerUp)
    element.removeEventListener('contextmenu', this.onContextMenu)
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.reset)
  }

  private onContextMenu = (event: Event) => event.preventDefault()

  private onPointerDown = (event: PointerEvent) => {
    // 只接管画布上的手势，UI 按钮（跳跃、返回）不受影响
    if ((event.target as HTMLElement).closest('[data-ui]')) return
    event.preventDefault()

    const rect = this.element.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    if (x < rect.width / 2 && this.movePointerId === null) {
      this.movePointerId = event.pointerId
      this.joystickActive = true
      this.joystickBase.x = x
      this.joystickBase.y = y
      this.joystickKnob.x = x
      this.joystickKnob.y = y
    } else if (this.lookPointerId === null) {
      this.lookPointerId = event.pointerId
      this.lastLook.x = event.clientX
      this.lastLook.y = event.clientY
    }

    this.element.setPointerCapture?.(event.pointerId)
  }

  private onPointerMove = (event: PointerEvent) => {
    if (event.pointerId === this.movePointerId) {
      event.preventDefault()
      const rect = this.element.getBoundingClientRect()
      const dx = event.clientX - rect.left - this.joystickBase.x
      const dy = event.clientY - rect.top - this.joystickBase.y
      const distance = Math.hypot(dx, dy)
      const clamped = Math.min(distance, JOYSTICK_RADIUS)
      const nx = distance > 0 ? dx / distance : 0
      const ny = distance > 0 ? dy / distance : 0

      this.joystickKnob.x = this.joystickBase.x + nx * clamped
      this.joystickKnob.y = this.joystickBase.y + ny * clamped

      const strength = clamped / JOYSTICK_RADIUS
      this.move.x = nx * strength
      this.move.y = -ny * strength // 屏幕向上 = 世界向前
      this.running = strength > 0.85
    } else if (event.pointerId === this.lookPointerId) {
      event.preventDefault()
      this.lookDelta.x += event.clientX - this.lastLook.x
      this.lookDelta.y += event.clientY - this.lastLook.y
      this.lastLook.x = event.clientX
      this.lastLook.y = event.clientY
    }
  }

  private onPointerUp = (event: PointerEvent) => {
    if (event.pointerId === this.movePointerId) {
      this.movePointerId = null
      this.joystickActive = false
      this.move.x = 0
      this.move.y = 0
      this.running = false
      this.applyKeyboardMove()
    } else if (event.pointerId === this.lookPointerId) {
      this.lookPointerId = null
    }
    this.element.releasePointerCapture?.(event.pointerId)
  }

  private onKeyDown = (event: KeyboardEvent) => {
    const code = event.code
    if (code === 'Space') {
      event.preventDefault()
      this.jumpQueued = true
      return
    }
    this.keys.add(code)
    this.applyKeyboardMove()
  }

  private onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code)
    this.applyKeyboardMove()
  }

  /** 键盘输入折算成和摇杆一样的 move 向量，摇杆按下时以摇杆为准 */
  private applyKeyboardMove() {
    if (this.movePointerId !== null) return

    const forward = (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
      (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0)
    const strafe = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) -
      (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0)

    const length = Math.hypot(forward, strafe)
    if (length > 0) {
      this.move.x = strafe / length
      this.move.y = forward / length
    } else {
      this.move.x = 0
      this.move.y = 0
    }
    this.running = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')
  }

  private reset = () => {
    this.keys.clear()
    this.movePointerId = null
    this.lookPointerId = null
    this.joystickActive = false
    this.move.x = 0
    this.move.y = 0
    this.running = false
  }
}
