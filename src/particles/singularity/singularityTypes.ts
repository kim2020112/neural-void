export type SingularityParticleType = 0 | 1 | 2 | 3

export const SINGULARITY_TYPE = {
  DISK: 0,
  HOTSPOT: 1,
  HALO: 2,
  JET: 3,
} as const

export interface SingularityGeometryData {
  count: number
  basePositions: Float32Array
  types: Float32Array
  seeds: Float32Array
  sizes: Float32Array
  brightness: Float32Array
  angularSpeeds: Float32Array
}

export const SINGULARITY_COUNTS = {
  total: 16000,
  disk: 11200,
  hotspot: 1600,
  halo: 1800,
  jet: 1400,
} as const

export const SINGULARITY_CORE = {
  radius: 1.12,
  photonRadius: 1.42,
} as const

export const SINGULARITY_POSE = {
  rotationX: 0.3,
  rotationZ: -0.1,
  positionY: -0.18,
} as const

export const SINGULARITY_CAMERA = {
  position: [0, 0.72, 12.8] as const,
  lookAt: [0, -0.12, 0] as const,
  fov: 36,
  driftX: 0.035,
  driftY: 0.025,
  driftZ: 0.035,
} as const

export const SINGULARITY_GESTURE = {
  fistScale: 0.9,
  openScale: 1.1,
  dualCompressedScale: 0.82,
  dualOpenScale: 1.06,
  fallbackScale: 0.9,
  fallbackFactor: 0.65,
  pointRadius: 1.8,
  pointMaxDisplace: 0.65,
  shockDuration: 1.15,
  explosionDuration: 2.2,
} as const

export const SINGULARITY_BLOOM = {
  threshold: 0.45,
  smoothing: 0.24,
  intensity: 1.65,
  radius: 0.32,
} as const
