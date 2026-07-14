import {
  QUANTUM_COUNTS,
  QUANTUM_ROLE,
  QUANTUM_STRUCTURE,
  type QuantumGeometryData,
} from './quantumTypes'

const TAU = Math.PI * 2
const PHI = (1 + Math.sqrt(5)) * 0.5

function fract(value: number) {
  return value - Math.floor(value)
}

function hash(index: number, seed: number) {
  return fract(Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453123)
}

function signedHash(index: number, seed: number) {
  return hash(index, seed) * 2 - 1
}

export function generateQuantumGeometry(): QuantumGeometryData {
  const { total } = QUANTUM_COUNTS
  const basePositions = new Float32Array(total * 3)
  const roles = new Float32Array(total)
  const layers = new Float32Array(total)
  const seeds = new Float32Array(total)
  const sizes = new Float32Array(total)
  const progress = new Float32Array(total)
  let write = 0

  const add = (
    x: number,
    y: number,
    z: number,
    role: number,
    layer: number,
    seed: number,
    size: number,
    pathProgress: number,
  ) => {
    const offset = write * 3
    basePositions[offset] = x
    basePositions[offset + 1] = y
    basePositions[offset + 2] = z
    roles[write] = role
    layers[write] = layer
    seeds[write] = seed
    sizes[write] = size
    progress[write] = pathProgress
    write += 1
  }

  for (let i = 0; i < QUANTUM_COUNTS.core; i++) {
    const seed = hash(i, 1.7)
    const radius = Math.cbrt(hash(i, 2.3)) * QUANTUM_STRUCTURE.coreRadius
    const theta = TAU * hash(i, 2.9)
    const cosPhi = 1 - 2 * hash(i, 3.5)
    const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi))
    add(
      Math.cos(theta) * sinPhi * radius,
      cosPhi * radius,
      Math.sin(theta) * sinPhi * radius,
      QUANTUM_ROLE.CORE,
      0,
      seed,
      0.3 + seed * 0.58,
      radius / QUANTUM_STRUCTURE.coreRadius,
    )
  }

  const addShell = (count: number, role: number, layer: number, radius: number, startIndex: number) => {
    for (let i = 0; i < count; i++) {
      const index = startIndex + i
      const seed = hash(index, 4.1 + layer)
      const normalized = (i + 0.5) / count
      const cosPhi = 1 - 2 * normalized
      const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi))
      const theta = TAU * i / PHI + signedHash(index, 5.7) * 0.018
      const shellRadius = radius + signedHash(index, 6.3 + layer) * (layer === 0 ? 0.095 : 0.13)
      add(
        Math.cos(theta) * sinPhi * shellRadius,
        cosPhi * shellRadius,
        Math.sin(theta) * sinPhi * shellRadius,
        role,
        layer,
        seed,
        0.18 + seed * 0.34,
        normalized,
      )
    }
  }

  addShell(
    QUANTUM_COUNTS.innerShell,
    QUANTUM_ROLE.INNER_SHELL,
    0,
    QUANTUM_STRUCTURE.innerShellRadius,
    QUANTUM_COUNTS.core,
  )
  addShell(
    QUANTUM_COUNTS.outerShell,
    QUANTUM_ROLE.OUTER_SHELL,
    1,
    QUANTUM_STRUCTURE.outerShellRadius,
    QUANTUM_COUNTS.core + QUANTUM_COUNTS.innerShell,
  )

  const orbitStart = QUANTUM_COUNTS.core + QUANTUM_COUNTS.innerShell + QUANTUM_COUNTS.outerShell
  const particlesPerOrbit = QUANTUM_COUNTS.orbit / QUANTUM_STRUCTURE.orbitLanes
  for (let i = 0; i < QUANTUM_COUNTS.orbit; i++) {
    const index = orbitStart + i
    const lane = i % QUANTUM_STRUCTURE.orbitLanes
    const laneIndex = Math.floor(i / QUANTUM_STRUCTURE.orbitLanes)
    const seed = hash(index, 7.1)
    const pathProgress = (laneIndex + 0.5 + signedHash(index, 7.7) * 0.32) / particlesPerOrbit
    const theta = pathProgress * TAU
    const radius = QUANTUM_STRUCTURE.orbitRadius + lane * 0.28 + signedHash(index, 8.3) * 0.08
    const x = Math.cos(theta) * radius
    const y = signedHash(index, 8.9) * 0.055
    const z = Math.sin(theta) * radius * (0.84 - lane * 0.035)
    const tiltX = [0.22, 0.92, -0.55][lane]
    const tiltZ = [-0.08, 0.57, 0.84][lane]
    const cosX = Math.cos(tiltX)
    const sinX = Math.sin(tiltX)
    const rotatedY = y * cosX - z * sinX
    const rotatedZ = y * sinX + z * cosX
    const cosZ = Math.cos(tiltZ)
    const sinZ = Math.sin(tiltZ)
    add(
      x * cosZ - rotatedY * sinZ,
      x * sinZ + rotatedY * cosZ,
      rotatedZ,
      QUANTUM_ROLE.ORBIT,
      lane,
      seed,
      0.2 + seed * 0.38,
      pathProgress,
    )
  }

  const pulseStart = orbitStart + QUANTUM_COUNTS.orbit
  for (let i = 0; i < QUANTUM_COUNTS.pulse; i++) {
    const index = pulseStart + i
    const seed = hash(index, 9.5)
    const pathProgress = (i + 0.5) / QUANTUM_COUNTS.pulse
    const radius = 0.28 + pathProgress * 4.65
    const theta = TAU * i / PHI
    const cosPhi = 1 - 2 * fract(i * 0.754877666)
    const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi))
    add(
      Math.cos(theta) * sinPhi * radius,
      cosPhi * radius,
      Math.sin(theta) * sinPhi * radius,
      QUANTUM_ROLE.PULSE,
      0,
      seed,
      0.28 + seed * 0.42,
      pathProgress,
    )
  }

  return { count: write, basePositions, roles, layers, seeds, sizes, progress }
}
