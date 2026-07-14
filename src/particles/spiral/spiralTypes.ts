export type SpiralParticleRole = 0 | 1 | 2 | 3

export const SPIRAL_ROLE = {
  CORE: 0,
  FILAMENT: 1,
  FRONT: 2,
  DUST: 3,
} as const

export const SPIRAL_COUNTS = {
  total: 15000,
  core: 1800,
  filament: 10400,
  front: 1400,
  dust: 1400,
  filamentCount: 4,
  particlesPerFilament: 2600,
  scaleNodeCount: 13,
} as const

export const SPIRAL_STRUCTURE = {
  phi: (1 + Math.sqrt(5)) * 0.5,
  turns: 1.5,
  maxRadius: 5.2,
} as const

export const SPIRAL_GESTURE = {
  fallbackFactor: 0.65,
  fistRewind: 0.88,
  dualMinScale: 0.68,
  dualMaxScale: 1.24,
  growthDuration: 1.85,
  pointDuration: 1.5,
  explosionDuration: 2.95,
} as const

export const SPIRAL_CAMERA = {
  position: [0.45, 1.55, 12.9] as const,
  lookAt: [0.2, 0.05, 0] as const,
  fov: 37,
  driftX: 0.04,
  driftY: 0.025,
  driftZ: 0.035,
} as const

export const SPIRAL_BLOOM = {
  threshold: 0.46,
  smoothing: 0.18,
  intensity: 1.32,
  radius: 0.26,
} as const

export interface SpiralGeometryData {
  count: number
  basePositions: Float32Array
  roles: Float32Array
  filaments: Float32Array
  progress: Float32Array
  nodes: Float32Array
  seeds: Float32Array
  sizes: Float32Array
}
