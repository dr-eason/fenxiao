import * as THREE from 'three'

/** XZ 平面上的轴对齐碰撞盒 */
export interface Obstacle {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface World {
  root: THREE.Group
  obstacles: Obstacle[]
  /** 供相机射线检测使用的实体网格 */
  colliders: THREE.Object3D[]
  /** 地图半径，角色不能走出去 */
  bounds: number
  update(dt: number, elapsed: number): void
  dispose(): void
}

/** 固定种子的随机数，保证每次进入场景布局一致 */
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 程序化生成草地贴图，避免依赖外部图片资源 */
function createGroundTexture(): THREE.Texture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#5d9c52'
  ctx.fillRect(0, 0, size, size)

  // 噪点让草地不那么死板
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const r = 1 + Math.random() * 2.5
    const shade = 60 + Math.random() * 70
    ctx.fillStyle = `rgba(${shade * 0.55}, ${shade + 40}, ${shade * 0.6}, 0.35)`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(24, 24)
  texture.anisotropy = 4
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** 程序化生成带窗户的楼体贴图 */
function createBuildingTexture(): THREE.Texture {
  const w = 128
  const h = 128
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#e8e2d6'
  ctx.fillRect(0, 0, w, h)

  const cols = 4
  const rows = 4
  const pad = 8
  const cw = (w - pad * (cols + 1)) / cols
  const ch = (h - pad * (rows + 1)) / rows
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = Math.random() > 0.3 ? '#7ea8c4' : '#3d5468'
      ctx.fillRect(pad + c * (cw + pad), pad + r * (ch + pad), cw, ch)
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** 天空渐变球，比纯色背景通透一些 */
function createSky(radius: number): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(radius, 32, 16)
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color('#3f7fd0') },
      bottomColor: { value: new THREE.Color('#cfe6f5') },
      offset: { value: 12 },
      exponent: { value: 0.7 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, pow(max(h, 0.0), exponent)), 1.0);
      }
    `,
  })
  return new THREE.Mesh(geometry, material)
}

export function createWorld(scene: THREE.Scene): World {
  const root = new THREE.Group()
  scene.add(root)

  const obstacles: Obstacle[] = []
  const colliders: THREE.Object3D[] = []
  const disposables: Array<THREE.BufferGeometry | THREE.Material | THREE.Texture> = []
  const bounds = 46
  const rand = mulberry32(20240816)

  const track = <T extends THREE.BufferGeometry | THREE.Material | THREE.Texture>(item: T): T => {
    disposables.push(item)
    return item
  }

  /** 记录一个物体在 XZ 平面上占据的方形区域 */
  const addObstacle = (x: number, z: number, halfX: number, halfZ: number) => {
    obstacles.push({ minX: x - halfX, maxX: x + halfX, minZ: z - halfZ, maxZ: z + halfZ })
  }

  // ---- 天空与雾 ----
  scene.background = new THREE.Color('#bcd9ee')
  scene.fog = new THREE.Fog('#bcd9ee', 55, 130)
  const sky = createSky(160)
  track(sky.geometry)
  track(sky.material as THREE.Material)
  root.add(sky)

  // ---- 灯光 ----
  const hemi = new THREE.HemisphereLight('#cfe6ff', '#4a6b3d', 1.1)
  root.add(hemi)

  const sun = new THREE.DirectionalLight('#fff4e0', 2.1)
  sun.position.set(28, 42, 18)
  sun.castShadow = true
  // 阴影贴图每帧都要重画，手机上 1024 是性能和精度比较平衡的档位
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 130
  sun.shadow.camera.left = -55
  sun.shadow.camera.right = 55
  sun.shadow.camera.top = 55
  sun.shadow.camera.bottom = -55
  sun.shadow.bias = -0.0005
  sun.shadow.normalBias = 0.02
  root.add(sun)
  root.add(sun.target)

  // ---- 地面 ----
  const groundTexture = track(createGroundTexture())
  const ground = new THREE.Mesh(
    track(new THREE.CircleGeometry(bounds + 14, 64)),
    track(new THREE.MeshStandardMaterial({ map: groundTexture, roughness: 1 })),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  root.add(ground)

  // ---- 中央广场与喷泉 ----
  const plaza = new THREE.Mesh(
    track(new THREE.CylinderGeometry(11, 11, 0.3, 48)),
    track(new THREE.MeshStandardMaterial({ color: '#d8cfc0', roughness: 0.9 })),
  )
  plaza.position.y = 0.15
  plaza.receiveShadow = true
  root.add(plaza)

  const fountainBase = new THREE.Mesh(
    track(new THREE.CylinderGeometry(3, 3.4, 1, 32)),
    track(new THREE.MeshStandardMaterial({ color: '#bdb4a4', roughness: 0.8 })),
  )
  fountainBase.position.y = 0.5
  fountainBase.castShadow = true
  fountainBase.receiveShadow = true
  root.add(fountainBase)
  colliders.push(fountainBase)
  addObstacle(0, 0, 3.4, 3.4)

  const waterMaterial = track(
    new THREE.MeshStandardMaterial({
      color: '#4aa3d8',
      transparent: true,
      opacity: 0.8,
      roughness: 0.15,
      metalness: 0.2,
    }),
  )
  const water = new THREE.Mesh(track(new THREE.CircleGeometry(2.9, 32)), waterMaterial)
  water.rotation.x = -Math.PI / 2
  water.position.y = 1.02
  root.add(water)

  const fountainPillar = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.35, 0.5, 2.4, 16)),
    track(new THREE.MeshStandardMaterial({ color: '#cec5b5', roughness: 0.8 })),
  )
  fountainPillar.position.y = 2.1
  fountainPillar.castShadow = true
  root.add(fountainPillar)

  const fountainTop = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.6, 20, 16)),
    track(new THREE.MeshStandardMaterial({ color: '#7fc7ee', roughness: 0.2, metalness: 0.3 })),
  )
  fountainTop.position.y = 3.5
  fountainTop.castShadow = true
  root.add(fountainTop)

  // ---- 楼房 ----
  const buildingTexture = track(createBuildingTexture())
  const buildingColors = ['#f0e4d0', '#e6d5c3', '#dcd3e8', '#d5e4dd', '#efd9d9']
  const buildingSpots: Array<[number, number]> = [
    [-24, -20], [-9, -30], [12, -27], [27, -12], [30, 10],
    [16, 26], [-6, 30], [-25, 20], [-33, 2], [22, -30],
  ]

  buildingSpots.forEach(([x, z], i) => {
    const w = 5 + rand() * 5
    const d = 5 + rand() * 5
    const h = 6 + rand() * 12

    const map = buildingTexture.clone()
    map.needsUpdate = true
    map.repeat.set(Math.max(1, Math.round(w / 3)), Math.max(1, Math.round(h / 3)))
    track(map)

    const building = new THREE.Mesh(
      track(new THREE.BoxGeometry(w, h, d)),
      track(
        new THREE.MeshStandardMaterial({
          map,
          color: buildingColors[i % buildingColors.length],
          roughness: 0.85,
        }),
      ),
    )
    building.position.set(x, h / 2, z)
    building.rotation.y = Math.round(rand() * 4) * (Math.PI / 2)
    building.castShadow = true
    building.receiveShadow = true
    root.add(building)
    colliders.push(building)

    const roof = new THREE.Mesh(
      track(new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6)),
      track(new THREE.MeshStandardMaterial({ color: '#8d5b4c', roughness: 0.9 })),
    )
    roof.position.set(x, h + 0.25, z)
    roof.rotation.y = building.rotation.y
    roof.castShadow = true
    root.add(roof)

    // 旋转过的楼体用外接半径当碰撞盒，够用且不会卡住角色
    const half = Math.max(w, d) / 2
    addObstacle(x, z, half, half)
  })

  // ---- 树木 ----
  const trunkGeometry = track(new THREE.CylinderGeometry(0.28, 0.4, 2.6, 8))
  const trunkMaterial = track(new THREE.MeshStandardMaterial({ color: '#6b4a2f', roughness: 1 }))
  const leafGeometry = track(new THREE.IcosahedronGeometry(1, 0))
  const pineGeometry = track(new THREE.ConeGeometry(1.5, 3, 8))
  const leafMaterials = [
    track(new THREE.MeshStandardMaterial({ color: '#4f8f3c', roughness: 0.95, flatShading: true })),
    track(new THREE.MeshStandardMaterial({ color: '#3f7a36', roughness: 0.95, flatShading: true })),
    track(new THREE.MeshStandardMaterial({ color: '#63a044', roughness: 0.95, flatShading: true })),
  ]

  for (let i = 0; i < 60; i++) {
    const angle = rand() * Math.PI * 2
    const radius = 13 + rand() * (bounds - 15)
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius

    // 离楼房太近就跳过，避免树穿进墙里
    if (obstacles.some((o) => x > o.minX - 2 && x < o.maxX + 2 && z > o.minZ - 2 && z < o.maxZ + 2)) {
      continue
    }

    const tree = new THREE.Group()
    const scale = 0.8 + rand() * 0.7

    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial)
    trunk.position.y = 1.3
    trunk.castShadow = true
    tree.add(trunk)
    colliders.push(trunk)

    const material = leafMaterials[Math.floor(rand() * leafMaterials.length)]
    if (rand() > 0.45) {
      for (let b = 0; b < 3; b++) {
        const blob = new THREE.Mesh(leafGeometry, material)
        blob.position.set((rand() - 0.5) * 1.2, 3 + b * 0.55, (rand() - 0.5) * 1.2)
        blob.scale.setScalar(1.4 - b * 0.28)
        blob.castShadow = true
        tree.add(blob)
      }
    } else {
      for (let b = 0; b < 3; b++) {
        const cone = new THREE.Mesh(pineGeometry, material)
        cone.position.y = 3 + b * 1.1
        cone.scale.setScalar(1 - b * 0.22)
        cone.castShadow = true
        tree.add(cone)
      }
    }

    tree.position.set(x, 0, z)
    tree.scale.setScalar(scale)
    root.add(tree)
    addObstacle(x, z, 0.55 * scale, 0.55 * scale)
  }

  // ---- 石头 ----
  const rockGeometry = track(new THREE.DodecahedronGeometry(1, 0))
  const rockMaterial = track(
    new THREE.MeshStandardMaterial({ color: '#9a9a95', roughness: 1, flatShading: true }),
  )
  for (let i = 0; i < 22; i++) {
    const angle = rand() * Math.PI * 2
    const radius = 14 + rand() * (bounds - 16)
    const scale = 0.5 + rand() * 1.1
    const rock = new THREE.Mesh(rockGeometry, rockMaterial)
    rock.position.set(Math.cos(angle) * radius, scale * 0.45, Math.sin(angle) * radius)
    rock.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI)
    rock.scale.setScalar(scale)
    rock.castShadow = true
    rock.receiveShadow = true
    root.add(rock)
    colliders.push(rock)
    if (scale > 0.8) {
      addObstacle(rock.position.x, rock.position.z, scale * 0.8, scale * 0.8)
    }
  }

  // ---- 路灯 ----
  const poleGeometry = track(new THREE.CylinderGeometry(0.12, 0.16, 4.4, 8))
  const poleMaterial = track(new THREE.MeshStandardMaterial({ color: '#41474d', roughness: 0.6, metalness: 0.4 }))
  const lampGeometry = track(new THREE.SphereGeometry(0.34, 16, 12))
  const lampMaterial = track(
    new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffd97a', emissiveIntensity: 0.9 }),
  )
  for (let i = 0; i < 8; i++) {
    // 偏移半格，让出生点正前方是灯与灯之间的空档
    const angle = (i / 8) * Math.PI * 2 + Math.PI / 8
    const x = Math.cos(angle) * 12.5
    const z = Math.sin(angle) * 12.5

    const pole = new THREE.Mesh(poleGeometry, poleMaterial)
    pole.position.set(x, 2.2, z)
    pole.castShadow = true
    root.add(pole)
    colliders.push(pole)

    const lamp = new THREE.Mesh(lampGeometry, lampMaterial)
    lamp.position.set(x, 4.6, z)
    root.add(lamp)

    addObstacle(x, z, 0.35, 0.35)
  }

  // ---- 围墙（地图边界的视觉提示）----
  const fenceMaterial = track(new THREE.MeshStandardMaterial({ color: '#7d6a52', roughness: 0.9 }))
  const fenceGeometry = track(new THREE.BoxGeometry(1.4, 1.6, 0.3))
  const fenceCount = 72
  for (let i = 0; i < fenceCount; i++) {
    const angle = (i / fenceCount) * Math.PI * 2
    const post = new THREE.Mesh(fenceGeometry, fenceMaterial)
    post.position.set(Math.cos(angle) * bounds, 0.8, Math.sin(angle) * bounds)
    post.rotation.y = -angle
    post.castShadow = true
    post.receiveShadow = true
    root.add(post)
  }

  // ---- 云 ----
  const clouds: THREE.Group[] = []
  const cloudGeometry = track(new THREE.SphereGeometry(1, 12, 10))
  const cloudMaterial = track(
    new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, roughness: 1 }),
  )
  for (let i = 0; i < 12; i++) {
    const cloud = new THREE.Group()
    const puffs = 3 + Math.floor(rand() * 3)
    for (let p = 0; p < puffs; p++) {
      const puff = new THREE.Mesh(cloudGeometry, cloudMaterial)
      puff.position.set((rand() - 0.5) * 8, (rand() - 0.5) * 1.5, (rand() - 0.5) * 4)
      puff.scale.setScalar(1.6 + rand() * 2.2)
      cloud.add(puff)
    }
    cloud.position.set((rand() - 0.5) * 150, 28 + rand() * 14, (rand() - 0.5) * 150)
    root.add(cloud)
    clouds.push(cloud)
  }

  return {
    root,
    obstacles,
    colliders,
    bounds,
    update(dt: number, elapsed: number) {
      // 水面轻微起伏 + 顶球旋转，让场景不是完全静止的
      water.position.y = 1.02 + Math.sin(elapsed * 1.6) * 0.03
      fountainTop.rotation.y = elapsed * 0.6
      fountainTop.position.y = 3.5 + Math.sin(elapsed * 1.2) * 0.12

      for (let i = 0; i < clouds.length; i++) {
        const cloud = clouds[i]
        cloud.position.x += (0.6 + (i % 3) * 0.2) * dt
        if (cloud.position.x > 85) cloud.position.x = -85
      }
    },
    dispose() {
      scene.remove(root)
      for (const item of disposables) item.dispose()
    },
  }
}
