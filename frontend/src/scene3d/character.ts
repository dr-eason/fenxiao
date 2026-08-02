import * as THREE from 'three'

export interface Character {
  root: THREE.Group
  /** 胶囊碰撞半径 */
  radius: number
  /** 视线高度，第三人称相机围绕这个点旋转 */
  eyeHeight: number
  /**
   * @param dt      帧间隔（秒）
   * @param speed01 当前速度占最大速度的比例，0 表示站立
   * @param grounded 是否踩在地面上
   */
  update(dt: number, speed01: number, grounded: boolean): void
  dispose(): void
}

/** 用基础几何体拼一个小人，不需要加载任何模型文件 */
export function createCharacter(): Character {
  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body)

  const disposables: Array<THREE.BufferGeometry | THREE.Material> = []
  const track = <T extends THREE.BufferGeometry | THREE.Material>(item: T): T => {
    disposables.push(item)
    return item
  }

  const skin = track(new THREE.MeshStandardMaterial({ color: '#f2c9a0', roughness: 0.8 }))
  const shirt = track(new THREE.MeshStandardMaterial({ color: '#2f7ee0', roughness: 0.7 }))
  const pants = track(new THREE.MeshStandardMaterial({ color: '#37415a', roughness: 0.8 }))
  const shoe = track(new THREE.MeshStandardMaterial({ color: '#2a2a30', roughness: 0.9 }))
  const hair = track(new THREE.MeshStandardMaterial({ color: '#3a2b22', roughness: 0.9 }))

  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material) => {
    const m = new THREE.Mesh(track(geometry), material)
    m.castShadow = true
    return m
  }

  // 躯干
  const torso = mesh(new THREE.CapsuleGeometry(0.3, 0.5, 6, 12), shirt)
  torso.position.y = 1.05
  torso.scale.set(1, 1, 0.75)
  body.add(torso)

  // 头 + 头发
  const head = mesh(new THREE.SphereGeometry(0.26, 20, 16), skin)
  head.position.y = 1.66
  body.add(head)

  const hairMesh = mesh(new THREE.SphereGeometry(0.27, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), hair)
  hairMesh.position.y = 1.68
  body.add(hairMesh)

  // 鼻子，用来一眼看出角色朝向
  const nose = mesh(new THREE.ConeGeometry(0.055, 0.14, 8), skin)
  nose.position.set(0, 1.63, 0.25)
  nose.rotation.x = Math.PI / 2
  body.add(nose)

  const armGeometry = new THREE.CapsuleGeometry(0.095, 0.42, 5, 10)
  const legGeometry = new THREE.CapsuleGeometry(0.12, 0.46, 5, 10)

  /** 手脚都挂在一个 pivot 上，转 pivot 就等于绕肩/胯摆动 */
  const makeLimb = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    pivotY: number,
    x: number,
    limbLength: number,
  ) => {
    const pivot = new THREE.Group()
    pivot.position.set(x, pivotY, 0)
    const limb = mesh(geometry, material)
    limb.position.y = -limbLength / 2
    pivot.add(limb)
    body.add(pivot)
    return pivot
  }

  const leftArm = makeLimb(armGeometry, shirt, 1.35, -0.36, 0.62)
  const rightArm = makeLimb(armGeometry, shirt, 1.35, 0.36, 0.62)
  const leftLeg = makeLimb(legGeometry, pants, 0.78, -0.15, 0.7)
  const rightLeg = makeLimb(legGeometry, pants, 0.78, 0.15, 0.7)

  // 手掌
  for (const pivot of [leftArm, rightArm]) {
    const hand = mesh(new THREE.SphereGeometry(0.1, 12, 10), skin)
    hand.position.y = -0.66
    pivot.add(hand)
  }

  // 鞋子
  for (const pivot of [leftLeg, rightLeg]) {
    const foot = mesh(new THREE.BoxGeometry(0.2, 0.11, 0.32), shoe)
    foot.position.set(0, -0.74, 0.06)
    pivot.add(foot)
  }

  let phase = 0

  return {
    root,
    radius: 0.42,
    eyeHeight: 1.5,
    update(dt: number, speed01: number, grounded: boolean) {
      if (!grounded) {
        // 空中收腿抬手，落地前保持这个姿势
        const target = 0.6
        leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, -target, 1 - Math.pow(0.001, dt))
        rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, target * 0.5, 1 - Math.pow(0.001, dt))
        leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -1.4, 1 - Math.pow(0.001, dt))
        rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -1.4, 1 - Math.pow(0.001, dt))
        body.position.y = 0
        return
      }

      if (speed01 > 0.02) {
        phase += dt * (5 + speed01 * 7)
        const swing = Math.sin(phase) * (0.35 + speed01 * 0.5)

        leftLeg.rotation.x = swing
        rightLeg.rotation.x = -swing
        leftArm.rotation.x = -swing * 0.85
        rightArm.rotation.x = swing * 0.85
        leftArm.rotation.z = 0.08
        rightArm.rotation.z = -0.08

        // 迈步时身体上下起伏
        body.position.y = Math.abs(Math.sin(phase)) * 0.06 * (0.4 + speed01)
      } else {
        // 站立：手脚归位 + 轻微呼吸
        phase += dt * 1.6
        const ease = 1 - Math.pow(0.002, dt)
        leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0, ease)
        rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0, ease)
        leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, 0, ease)
        rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, 0, ease)
        leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0.12, ease)
        rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, -0.12, ease)
        body.position.y = Math.sin(phase) * 0.015
      }
    },
    dispose() {
      for (const item of disposables) item.dispose()
    },
  }
}
