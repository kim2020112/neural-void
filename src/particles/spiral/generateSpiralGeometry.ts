import {
  SPIRAL_COUNTS,
  SPIRAL_ROLE,
  SPIRAL_STRUCTURE,
  type SpiralGeometryData,
} from './spiralTypes'

const TAU = Math.PI * 2
const THETA_MAX = SPIRAL_STRUCTURE.turns * TAU
const GOLDEN_GROWTH = Math.log(SPIRAL_STRUCTURE.phi) / (Math.PI * 0.5)

interface MutablePoint3 {
  x: number
  y: number
  z: number
}

function fract(value: number) {
  return value - Math.floor(value)
}

function hash(index: number, seed: number) {
  return fract(Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453123)
}

function signedHash(index: number, seed: number) {
  return hash(index, seed) * 2 - 1
}

export function goldenSpiralRadius(progress: number) {
  const clamped = Math.max(0, Math.min(1, progress))
  return SPIRAL_STRUCTURE.maxRadius * Math.exp(GOLDEN_GROWTH * THETA_MAX * (clamped - 1))
}

export function sampleGoldenSpiralPoint(progress: number, filament: number, output: MutablePoint3) {
  const clamped = Math.max(0, Math.min(1, progress))
  const filamentOffset = (filament - (SPIRAL_COUNTS.filamentCount - 1) * 0.5) * 0.045
  const angle = -THETA_MAX * 0.5 + clamped * THETA_MAX + filamentOffset
  const radius = goldenSpiralRadius(clamped)
  output.x = Math.cos(angle) * radius
  output.y = Math.sin(clamped * Math.PI * 4 + filament * 1.4) * (0.035 + clamped * 0.1) + filamentOffset * 0.55
  output.z = Math.sin(angle) * radius
  return output
}

export function generateSpiralGeometry(): SpiralGeometryData {
  const { total } = SPIRAL_COUNTS
  const basePositions = new Float32Array(total * 3)
  const roles = new Float32Array(total)
  const filaments = new Float32Array(total)
  const progress = new Float32Array(total)
  const nodes = new Float32Array(total).fill(-1)
  const seeds = new Float32Array(total)
  const sizes = new Float32Array(total)
  const point = { x: 0, y: 0, z: 0 }
  let write = 0

  const add = (
    x: number,
    y: number,
    z: number,
    role: number,
    filament: number,
    pathProgress: number,
    node: number,
    seed: number,
    size: number,
  ) => {
    const offset = write * 3
    basePositions[offset] = x
    basePositions[offset + 1] = y
    basePositions[offset + 2] = z
    roles[write] = role
    filaments[write] = filament
    progress[write] = pathProgress
    nodes[write] = node
    seeds[write] = seed
    sizes[write] = size
    write += 1
  }

  for (let i = 0; i < SPIRAL_COUNTS.core; i++) {
    const seed = hash(i, 1.3)
    const radius = Math.cbrt(hash(i, 1.9)) * 0.72
    const angle = TAU * hash(i, 2.5)
    const cosPhi = 1 - 2 * hash(i, 3.1)
    const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi))
    add(
      Math.cos(angle) * sinPhi * radius,
      cosPhi * radius * 0.42,
      Math.sin(angle) * sinPhi * radius,
      SPIRAL_ROLE.CORE,
      -1,
      0,
      -1,
      seed,
      0.34 + seed * 0.58,
    )
  }

  for (let filament = 0; filament < SPIRAL_COUNTS.filamentCount; filament++) {
    for (let i = 0; i < SPIRAL_COUNTS.particlesPerFilament; i++) {
      const index = SPIRAL_COUNTS.core + filament * SPIRAL_COUNTS.particlesPerFilament + i
      const seed = hash(index, 3.7)
      const pathProgress = (i + 0.5 + signedHash(index, 4.3) * 0.3) / SPIRAL_COUNTS.particlesPerFilament
      sampleGoldenSpiralPoint(pathProgress, filament, point)
      const thickness = 0.018 + pathProgress * 0.055
      add(
        point.x + signedHash(index, 4.9) * thickness,
        point.y + signedHash(index, 5.5) * thickness * 0.7,
        point.z + signedHash(index, 6.1) * thickness,
        SPIRAL_ROLE.FILAMENT,
        filament,
        pathProgress,
        -1,
        seed,
        0.2 + seed * 0.38,
      )
    }
  }

  const frontStart = SPIRAL_COUNTS.core + SPIRAL_COUNTS.filament
  for (let i = 0; i < SPIRAL_COUNTS.front; i++) {
    const index = frontStart + i
    const filament = i % SPIRAL_COUNTS.filamentCount
    const seed = hash(index, 6.7)
    const pathProgress = 0.84 + hash(index, 7.3) * 0.16
    sampleGoldenSpiralPoint(pathProgress, filament, point)
    const scatter = 0.035 + seed * 0.1
    add(
      point.x + signedHash(index, 7.9) * scatter,
      point.y + signedHash(index, 8.5) * scatter,
      point.z + signedHash(index, 9.1) * scatter,
      SPIRAL_ROLE.FRONT,
      filament,
      pathProgress,
      -1,
      seed,
      0.4 + seed * 0.72,
    )
  }

  const dustStart = frontStart + SPIRAL_COUNTS.front
  for (let i = 0; i < SPIRAL_COUNTS.dust; i++) {
    const index = dustStart + i
    const node = i % SPIRAL_COUNTS.scaleNodeCount
    const filament = i % SPIRAL_COUNTS.filamentCount
    const seed = hash(index, 9.7)
    const nodeProgress = node / (SPIRAL_COUNTS.scaleNodeCount - 1)
    const pathProgress = Math.max(0, Math.min(1, nodeProgress + signedHash(index, 10.3) * 0.008))
    sampleGoldenSpiralPoint(pathProgress, filament, point)
    const scatter = 0.08 + seed * 0.16
    add(
      point.x + signedHash(index, 10.9) * scatter,
      point.y + signedHash(index, 11.5) * scatter * 0.72,
      point.z + signedHash(index, 12.1) * scatter,
      SPIRAL_ROLE.DUST,
      filament,
      pathProgress,
      node,
      seed,
      0.22 + seed * 0.44,
    )
  }

  return { count: write, basePositions, roles, filaments, progress, nodes, seeds, sizes }
}
