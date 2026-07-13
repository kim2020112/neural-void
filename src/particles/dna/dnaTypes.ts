export type DnaParticleType = 0 | 1 | 2 | 3 | 4

export const DNA_TYPE = {
  BACKBONE_A: 0,
  BACKBONE_B: 1,
  BASE: 2,
  MARKER: 3,
  REPLICA: 4,
} as const

export interface DnaGeometryData {
  count: number
  basePositions: Float32Array
  types: Float32Array
  seeds: Float32Array
  sizes: Float32Array
  brightness: Float32Array
  progress: Float32Array
  pairClasses: Float32Array
  strandSides: Float32Array
  bondPositions: Float32Array
  bondProgress: Float32Array
  bondPairClasses: Float32Array
  bondSides: Float32Array
}

export const DNA_COUNTS = {
  total: 14000,
  backboneA: 4000,
  backboneB: 4000,
  base: 3000,
  marker: 1000,
  replica: 2000,
} as const

export const DNA_STRUCTURE = {
  turns: 5.2,
  radius: 2.6,
  height: 11.4,
  pairCount: 144,
} as const

export const DNA_POSE = {
  rotationX: 0.08,
  rotationZ: 0.14,
  positionY: 0,
} as const

export const DNA_CAMERA = {
  position: [1.6, 0.8, 18.2] as const,
  lookAt: [0, 0, 0] as const,
  fov: 36,
  driftX: 0.04,
  driftY: 0.03,
  driftZ: 0.04,
} as const

export const DNA_GESTURE = {
  fistRadiusScale: 0.84,
  fistHeightScale: 0.92,
  fistTwist: 0.72,
  openRadiusScale: 1.1,
  openHeightScale: 1.02,
  openUnzip: 1,
  dualCompressedHeight: 0.88,
  dualOpenHeight: 1.14,
  dualCompressedRadius: 1.06,
  dualOpenRadius: 0.95,
  fallbackFactor: 0.65,
  scanDuration: 1.4,
  scanRestartDistance: 0.08,
  replicationFrontSeconds: 2.2,
  replicationHoldSeconds: 2.5,
} as const

export const DNA_BLOOM = {
  threshold: 0.5,
  smoothing: 0.22,
  intensity: 1.5,
  radius: 0.3,
} as const
