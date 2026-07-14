export type KnotParticleRole = 0 | 1 | 2

export const KNOT_ROLE = {
  STRAND: 0,
  HOTSPOT: 1,
  SPARK: 2,
} as const

export const KNOT_COUNTS = {
  total: 15600,
  strand: 12600,
  hotspot: 1800,
  spark: 1200,
  strandCount: 3,
  particlesPerStrand: 4200,
  crossingCount: 6,
} as const

export const KNOT_STRUCTURE = {
  p: 2,
  q: 3,
  majorRadius: 3.55,
  tubeRadius: 0.82,
} as const

export const KNOT_GESTURE = {
  fallbackFactor: 0.65,
  fistTightness: 0.82,
  openSpread: 0.92,
  dualMinSpread: 0.42,
  dualMaxSpread: 1.18,
  pointDuration: 1.65,
  explosionDuration: 2.65,
} as const

export const KNOT_CAMERA = {
  position: [0.8, 1.05, 12.7] as const,
  lookAt: [0, 0.1, 0] as const,
  fov: 38,
  driftX: 0.045,
  driftY: 0.03,
  driftZ: 0.04,
} as const

export const KNOT_BLOOM = {
  threshold: 0.42,
  smoothing: 0.2,
  intensity: 1.38,
  radius: 0.28,
} as const

export interface KnotGeometryData {
  count: number
  basePositions: Float32Array
  offsets: Float32Array
  roles: Float32Array
  strands: Float32Array
  parameters: Float32Array
  seeds: Float32Array
  sizes: Float32Array
}
