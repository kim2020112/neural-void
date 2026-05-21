import type { ParticleShape } from './types'

const TAU = Math.PI * 2
const PHI = (1 + Math.sqrt(5)) / 2

function fract(value: number): number {
  return value - Math.floor(value)
}

function hash(index: number, seed: number): number {
  return fract(Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453123)
}

function hashSigned(index: number, seed: number): number {
  return hash(index, seed) * 2 - 1
}

function setPoint(buffer: Float32Array, index: number, x: number, y: number, z: number) {
  const offset = index * 3
  buffer[offset] = x
  buffer[offset + 1] = y
  buffer[offset + 2] = z
}

function rotateXPoint(x: number, y: number, z: number, angle: number) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return { x, y: y * c - z * s, z: y * s + z * c }
}

function rotateYPoint(x: number, y: number, z: number, angle: number) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return { x: x * c + z * s, y, z: -x * s + z * c }
}

function rotateZPoint(x: number, y: number, z: number, angle: number) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return { x: x * c - y * s, y: x * s + y * c, z }
}

function sampleSphere(index: number, count: number) {
  const t = (index + 0.5) / count
  const theta = TAU * index / PHI
  const phi = Math.acos(1 - 2 * t)
  return { theta, phi }
}

function sampleRadiusBand(index: number, inner: number, outer: number, power = 1) {
  const radial = Math.pow(hash(index, 4.13), power)
  return inner + (outer - inner) * radial
}

function generateQuantumSphere(count: number): Float32Array {
  const positions = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const region = hash(i, 1.7)

    if (region < 0.14) {
      const radius = sampleRadiusBand(i, 0.2, 1.55, 1.8)
      const theta = TAU * hash(i, 10.2)
      const phi = Math.acos(1 - 2 * hash(i, 10.8))
      setPoint(
        positions,
        i,
        Math.sin(phi) * Math.cos(theta) * radius,
        Math.cos(phi) * radius,
        Math.sin(phi) * Math.sin(theta) * radius,
      )
      continue
    }

    if (region < 0.48) {
      const { theta, phi } = sampleSphere(i, count)
      const shellRadius = 4.9 + hash(i, 11.4) * 1.7
      const shellRipple = Math.sin(theta * 6.0 + phi * 4.0 + hash(i, 12.2) * TAU) * 0.16
      const radius = shellRadius + shellRipple
      setPoint(
        positions,
        i,
        Math.sin(phi) * Math.cos(theta) * radius,
        Math.cos(phi) * radius * (0.96 + hash(i, 12.8) * 0.08),
        Math.sin(phi) * Math.sin(theta) * radius,
      )
      continue
    }

    const orbitLane = Math.floor(hash(i, 13.3) * 3)
    const theta = TAU * hash(i, 13.9)
    const orbitRadius = 7.2 + hash(i, 14.6) * 1.7
    const eccentricity = orbitLane === 0 ? 0.78 : orbitLane === 1 ? 0.9 : 0.68
    const bandThickness = hashSigned(i, 15.2) * (0.08 + hash(i, 15.8) * 0.16)

    let x = Math.cos(theta) * orbitRadius
    let y = bandThickness
    let z = Math.sin(theta) * orbitRadius * eccentricity

    const tiltX = orbitLane === 0 ? 0.16 : orbitLane === 1 ? 1.08 : 0.78
    const tiltY = orbitLane === 0 ? 0.28 : orbitLane === 1 ? -0.22 : 0.54
    const tiltZ = orbitLane === 0 ? 0.0 : orbitLane === 1 ? 0.74 : -0.7

    const rx = rotateXPoint(x, y, z, tiltX)
    const ry = rotateYPoint(rx.x, rx.y, rx.z, tiltY)
    const rz = rotateZPoint(ry.x, ry.y, ry.z, tiltZ)
    setPoint(positions, i, rz.x, rz.y, rz.z)
  }

  return positions
}

function generateKnotTorus(count: number): Float32Array {
  const positions = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const loop = Math.floor(hash(i, 30.4) * 3)
    const theta = TAU * hash(i, 30.9)
    const tubeAngle = TAU * hash(i, 31.6)
    const major = 4.6 + Math.sin(theta * 3.0 + loop * 1.7) * 0.48
    const tube = 0.18 + Math.pow(hash(i, 32.2), 0.7) * 0.92
    const knotBreath = 1.0 + Math.sin(theta * 2.0 + tubeAngle * 2.0) * 0.08

    let x = Math.cos(theta) * (major + Math.cos(tubeAngle) * tube * knotBreath)
    let y = Math.sin(tubeAngle) * tube * (0.92 + hash(i, 32.8) * 0.28)
    let z = Math.sin(theta) * (major + Math.cos(tubeAngle) * tube * knotBreath)

    if (loop === 0) {
      const rx = rotateXPoint(x, y, z, 1.1)
      const rz = rotateZPoint(rx.x, rx.y, rx.z, 0.22)
      x = rz.x
      y = rz.y
      z = rz.z
    } else if (loop === 1) {
      const ry = rotateYPoint(x, y, z, 0.86)
      const rx = rotateXPoint(ry.x, ry.y, ry.z, -0.42)
      x = rx.x
      y = rx.y
      z = rx.z
    } else {
      const rz = rotateZPoint(x, y, z, 0.94)
      const ry = rotateYPoint(rz.x, rz.y, rz.z, -0.38)
      x = ry.x
      y = ry.y
      z = ry.z
    }

    setPoint(positions, i, x, y, z)
  }

  return positions
}

function generateSaturnRing(count: number): Float32Array {
  const positions = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const region = hash(i, 40.1)

    if (region < 0.12) {
      const radius = sampleRadiusBand(i, 0.06, 2.25, 1.85)
      const theta = TAU * hash(i, 40.8)
      const phi = Math.acos(1 - 2 * hash(i, 41.3))
      const squash = 0.86 + hash(i, 41.9) * 0.18
      const shimmer = Math.sin(theta * 2.0 + phi * 3.0) * 0.08
      setPoint(
        positions,
        i,
        Math.sin(phi) * Math.cos(theta) * (radius + shimmer * 0.18),
        Math.cos(phi) * radius * squash,
        Math.sin(phi) * Math.sin(theta) * (radius + shimmer * 0.18),
      )
      continue
    }

    if (region < 0.24) {
      const radius = sampleRadiusBand(i, 2.0, 3.8, 1.25)
      const theta = TAU * hash(i, 42.0)
      const phi = Math.acos(1 - 2 * hash(i, 42.5))
      const flatten = 0.42 + hash(i, 42.9) * 0.18
      const bridge = Math.sin(theta * 4.0 + phi * 2.2 + hash(i, 43.2) * TAU) * 0.1
      setPoint(
        positions,
        i,
        Math.sin(phi) * Math.cos(theta) * (radius + bridge * 0.2),
        Math.cos(phi) * radius * flatten,
        Math.sin(phi) * Math.sin(theta) * (radius + bridge * 0.2),
      )
      continue
    }

    if (region < 0.9) {
      const theta = TAU * hash(i, 43.8)
      const lane = hash(i, 44.1)
      const density =
        lane < 0.58
          ? Math.pow(hash(i, 44.5), 1.9)
          : lane < 0.85
            ? Math.pow(hash(i, 44.9), 1.45)
            : Math.pow(hash(i, 45.3), 1.2)
      const bandBase =
        lane < 0.58
          ? 4.9 + density * 2.6
          : lane < 0.85
            ? 7.5 + density * 2.6
            : 10.2 + density * 2.0
      const bandThickness = lane < 0.58 ? 0.018 : lane < 0.85 ? 0.028 : 0.048
      const ripple = Math.sin(theta * 2.8 + bandBase * 0.85) * 0.06
      const spokeNoise = hashSigned(i, 45.7) * (0.024 + density * 0.095)
      const verticalDust = hashSigned(i, 46.1) * (bandThickness + Math.pow(hash(i, 46.4), 3.1) * 0.08)
      const drift = Math.sin(theta * 6.2 + hash(i, 46.8) * TAU) * 0.02

      setPoint(
        positions,
        i,
        Math.cos(theta) * (bandBase + ripple + spokeNoise),
        verticalDust + drift,
        Math.sin(theta) * (bandBase + ripple + spokeNoise),
      )
      continue
    }

    const theta = TAU * hash(i, 47.2)
    const outerDensity = Math.pow(hash(i, 47.7), 2.8)
    const radius = 12.4 + outerDensity * 4.8
    const lift = hashSigned(i, 48.1) * (0.04 + hash(i, 48.5) * 0.14)
    const drift = hashSigned(i, 48.9) * 0.16
    const veil = Math.sin(theta * 1.8 + hash(i, 49.5) * TAU) * 0.025
    setPoint(positions, i, Math.cos(theta) * (radius + drift), lift + veil, Math.sin(theta) * (radius + drift))
  }

  return positions
}

function generateDnaHelix(count: number): Float32Array {
  const positions = new Float32Array(count * 3)
  const turns = 5.4
  const radius = 4.2
  const height = 19.6

  for (let i = 0; i < count; i++) {
    const progress = i / count
    const y = (progress - 0.5) * height
    const angle = progress * turns * TAU
    const bridge = i % 7 === 0 || hash(i, 51.3) > 0.9

    if (bridge) {
      const mixValue = 0.15 + hash(i, 51.8) * 0.7
      const leftX = Math.cos(angle) * radius
      const leftZ = Math.sin(angle) * radius
      const rightX = Math.cos(angle + Math.PI) * radius
      const rightZ = Math.sin(angle + Math.PI) * radius
      const bow = Math.sin(mixValue * Math.PI) * (0.26 + hash(i, 52.5) * 0.22)
      setPoint(
        positions,
        i,
        leftX + (rightX - leftX) * mixValue,
        y + bow,
        leftZ + (rightZ - leftZ) * mixValue,
      )
      continue
    }

    const strand = i % 2
    const strandAngle = angle + strand * Math.PI
    const localRadius = radius + hashSigned(i, 53.1) * 0.26
    const ribbon = 1.0 + Math.sin(progress * TAU * 2.0 + strand * Math.PI) * 0.06

    setPoint(
      positions,
      i,
      Math.cos(strandAngle) * localRadius * ribbon,
      y + hashSigned(i, 53.9) * 0.16,
      Math.sin(strandAngle) * localRadius * ribbon,
    )
  }

  return positions
}

function generateGoldenSpiral(count: number): Float32Array {
  const positions = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const region = hash(i, 61.1)

    if (region < 0.16) {
      const radius = sampleRadiusBand(i, 0.08, 1.4, 1.9)
      const theta = TAU * hash(i, 61.6)
      const phi = Math.acos(1 - 2 * hash(i, 62.0))
      setPoint(
        positions,
        i,
        Math.sin(phi) * Math.cos(theta) * radius,
        Math.cos(phi) * radius * 0.34,
        Math.sin(phi) * Math.sin(theta) * radius,
      )
      continue
    }

    const arm = i % 2
    const progress = (i + 1) / count
    const growth = Math.pow(progress, 0.56)
    const radius = 0.6 + growth * 12.6
    const angle = arm * Math.PI + growth * 11.4 + growth * growth * 8.6 + hashSigned(i, 62.7) * 0.08
    const plume = hashSigned(i, 63.1) * (0.05 + growth * 0.85)
    const spread = hashSigned(i, 63.6) * (0.08 + growth * 0.5)

    setPoint(
      positions,
      i,
      Math.cos(angle) * (radius + spread),
      plume,
      Math.sin(angle) * (radius + spread),
    )
  }

  return positions
}

const HYPERCUBE_VERTICES = Array.from({ length: 16 }, (_, index) => {
  const x = index & 1 ? 1 : -1
  const y = index & 2 ? 1 : -1
  const z = index & 4 ? 1 : -1
  const w = index & 8 ? 1 : -1
  return [x, y, z, w] as const
})

const HYPERCUBE_EDGES = HYPERCUBE_VERTICES.flatMap((_, from) =>
  [0, 1, 2, 3]
    .map((bit) => from ^ (1 << bit))
    .filter((to) => to > from)
    .map((to) => [from, to] as const),
)

function project4D([x, y, z, w]: readonly [number, number, number, number]) {
  const rotA = 0.65
  const rotB = 0.4
  const x1 = x * Math.cos(rotA) - w * Math.sin(rotA)
  const w1 = x * Math.sin(rotA) + w * Math.cos(rotA)
  const y1 = y * Math.cos(rotB) - z * Math.sin(rotB)
  const z1 = y * Math.sin(rotB) + z * Math.cos(rotB)
  const perspective = 5.2 / (5.2 - w1)

  return {
    x: x1 * perspective * 3.0,
    y: y1 * perspective * 3.0,
    z: z1 * perspective * 3.0,
  }
}

function generateHypercube(count: number): Float32Array {
  const positions = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const region = hash(i, 71.0)

    if (region < 0.18) {
      const vertex = HYPERCUBE_VERTICES[i % HYPERCUBE_VERTICES.length]
      const projected = project4D(vertex)
      const burst = 0.08 + hash(i, 71.6) * 0.22
      setPoint(
        positions,
        i,
        projected.x + hashSigned(i, 72.1) * burst,
        projected.y + hashSigned(i, 72.7) * burst,
        projected.z + hashSigned(i, 73.3) * burst,
      )
      continue
    }

    if (region < 0.86) {
      const edge = HYPERCUBE_EDGES[i % HYPERCUBE_EDGES.length]
      const from = HYPERCUBE_VERTICES[edge[0]]
      const to = HYPERCUBE_VERTICES[edge[1]]
      const mix = hash(i, 73.9)

      const point4D = [
        from[0] + (to[0] - from[0]) * mix,
        from[1] + (to[1] - from[1]) * mix,
        from[2] + (to[2] - from[2]) * mix,
        from[3] + (to[3] - from[3]) * mix,
      ] as const

      const projected = project4D(point4D)
      const thickness = 0.04 + hash(i, 74.5) * 0.14
      setPoint(
        positions,
        i,
        projected.x + hashSigned(i, 75.1) * thickness,
        projected.y + hashSigned(i, 75.6) * thickness,
        projected.z + hashSigned(i, 76.2) * thickness,
      )
      continue
    }

    const vertex = HYPERCUBE_VERTICES[i % HYPERCUBE_VERTICES.length]
    const inset = 0.45 + hash(i, 76.8) * 0.35
    const projected = project4D([
      vertex[0] * inset,
      vertex[1] * inset,
      vertex[2] * inset,
      vertex[3] * inset,
    ])
    const dust = 0.06 + hash(i, 77.3) * 0.16
    setPoint(
      positions,
      i,
      projected.x + hashSigned(i, 77.9) * dust,
      projected.y + hashSigned(i, 78.4) * dust,
      projected.z + hashSigned(i, 79.0) * dust,
    )
  }

  return positions
}

function generateGalaxy(count: number): Float32Array {
  const positions = new Float32Array(count * 3)
  const armCount = 2

  for (let i = 0; i < count; i++) {
    const region = hash(i, 81.1)

    if (region < 0.18) {
      const radius = sampleRadiusBand(i, 0.18, 2.8, 1.4)
      const theta = TAU * hash(i, 81.7)
      const phi = Math.acos(1 - 2 * hash(i, 82.2))
      setPoint(
        positions,
        i,
        Math.sin(phi) * Math.cos(theta) * radius,
        Math.cos(phi) * radius * 0.42,
        Math.sin(phi) * Math.sin(theta) * radius,
      )
      continue
    }

    if (region < 0.9) {
      const arm = i % armCount
      const radius = sampleRadiusBand(i, 3.0, 17.2, 0.82)
      const spin = arm * Math.PI + radius * 0.56 + hashSigned(i, 82.9) * (0.12 + radius * 0.03)
      const sweep = Math.sin(radius * 0.24 + arm * 1.7) * 0.22
      const lift = hashSigned(i, 83.6) * (0.12 + radius * 0.08)
      setPoint(
        positions,
        i,
        Math.cos(spin) * radius,
        lift + sweep,
        Math.sin(spin) * radius,
      )
      continue
    }

    const haloRadius = sampleRadiusBand(i, 17.5, 24.0, 1.08)
    const theta = TAU * hash(i, 84.1)
    const lift = hashSigned(i, 84.6) * (0.55 + hash(i, 85.2) * 1.2)
    setPoint(
      positions,
      i,
      Math.cos(theta) * haloRadius,
      lift,
      Math.sin(theta) * haloRadius,
    )
  }

  return positions
}

function generateSingularity(count: number): Float32Array {
  const positions = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const region = hash(i, 91.4)

    if (region < 0.16) {
      const radius = sampleRadiusBand(i, 0.08, 1.1, 2.2)
      const theta = TAU * hash(i, 91.9)
      const phi = Math.acos(1 - 2 * hash(i, 92.5))
      setPoint(
        positions,
        i,
        Math.sin(phi) * Math.cos(theta) * radius,
        Math.cos(phi) * radius * 0.8,
        Math.sin(phi) * Math.sin(theta) * radius,
      )
      continue
    }

    if (region < 0.9) {
      const radius = 2.2 + Math.pow(hash(i, 93.2), 0.78) * 8.6
      const theta = TAU * hash(i, 93.8) + radius * 1.04
      const band = 0.035 + Math.pow(hash(i, 94.4), 2.8) * 0.26
      const warp = Math.sin(theta * 2.2 + radius * 0.8) * 0.08
      setPoint(
        positions,
        i,
        Math.cos(theta) * (radius + warp),
        hashSigned(i, 95.0) * band,
        Math.sin(theta) * (radius + warp),
      )
      continue
    }

    const jetSide = hash(i, 95.6) > 0.5 ? 1 : -1
    const height = 4.8 + Math.pow(hash(i, 96.1), 0.56) * 8.8
    const radius = hash(i, 96.7) * 0.9
    const theta = TAU * hash(i, 97.2)
    setPoint(
      positions,
      i,
      Math.cos(theta) * radius,
      jetSide * height,
      Math.sin(theta) * radius,
    )
  }

  return positions
}

export const SHAPE_GENERATORS: Record<ParticleShape, (count: number) => Float32Array> = {
  quantum_sphere: generateQuantumSphere,
  knot_torus: generateKnotTorus,
  saturn_ring: generateSaturnRing,
  dna_helix: generateDnaHelix,
  golden_spiral: generateGoldenSpiral,
  hypercube: generateHypercube,
  galaxy: generateGalaxy,
  singularity: generateSingularity,
}
