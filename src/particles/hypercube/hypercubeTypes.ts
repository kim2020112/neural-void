export type HypercubeParticleRole = 0 | 1 | 2
export type HypercubePoint4 = readonly [number, number, number, number]
export type HypercubeEdge = readonly [number, number, number]

export const HYPERCUBE_ROLE = {
  EDGE: 0,
  VERTEX: 1,
  DUST: 2,
} as const

export const HYPERCUBE_COUNTS = {
  total: 14400,
  edge: 10240,
  vertex: 2560,
  dust: 1600,
  vertexCount: 16,
  edgeCount: 32,
  particlesPerEdge: 320,
  particlesPerVertex: 160,
} as const

export const HYPERCUBE_STRUCTURE = {
  extent: 1.62,
  projectionDistance: 4.4,
} as const

export const HYPERCUBE_ROTATION = {
  initialXW: 0.42,
  initialYW: -0.3,
  idleXW: 0.085,
  idleYW: 0.058,
} as const

export const HYPERCUBE_GESTURE = {
  fistWScale: 0.25,
  openWScale: 1.25,
  dualMinWScale: 0.35,
  dualMaxWScale: 1.35,
  fallbackFactor: 0.65,
  expansionDuration: 1.1,
  pointDuration: 1.4,
  fractureDuration: 0.45,
  rebuildDuration: 2.4,
} as const

export const HYPERCUBE_CAMERA = {
  position: [0, 0.65, 13.2] as const,
  lookAt: [0, 0.2, 0] as const,
  fov: 35,
  driftX: 0.035,
  driftY: 0.025,
  driftZ: 0.035,
} as const

export const HYPERCUBE_BLOOM = {
  threshold: 0.44,
  smoothing: 0.2,
  intensity: 1.55,
  radius: 0.3,
} as const

export interface HypercubeGeometryData {
  count: number
  vertexCount: number
  edgeCount: number
  coordinates4d: Float32Array
  initialProjection: Float32Array
  roles: Float32Array
  axes: Float32Array
  seeds: Float32Array
  sizes: Float32Array
  vertexA: Float32Array
  vertexB: Float32Array
  edgeProgress: Float32Array
}

export const HYPERCUBE_VERTICES_4D: readonly HypercubePoint4[] = Array.from(
  { length: HYPERCUBE_COUNTS.vertexCount },
  (_, index) => [
    index & 1 ? 1 : -1,
    index & 2 ? 1 : -1,
    index & 4 ? 1 : -1,
    index & 8 ? 1 : -1,
  ] as const,
)

export const HYPERCUBE_EDGES_4D: readonly HypercubeEdge[] = HYPERCUBE_VERTICES_4D
  .flatMap((_, vertex) => [0, 1, 2, 3].map((axis) => [vertex, vertex ^ (1 << axis), axis] as const))
  .filter(([start, end]) => start < end)
