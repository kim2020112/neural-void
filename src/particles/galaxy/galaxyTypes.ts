export type GalaxyParticleRole = 0 | 1 | 2 | 3 | 4

export const GALAXY_ROLE = {
  BULGE: 0,
  DISK: 1,
  ARM: 2,
  DUST: 3,
  HALO: 4,
} as const

export const GALAXY_COUNTS = {
  total: 18000,
  bulge: 3000,
  disk: 3000,
  arm: 8400,
  dust: 2400,
  halo: 1200,
  armCount: 2,
  particlesPerArm: 4200,
} as const

export const GALAXY_STRUCTURE = {
  coreRadius: 1.45,
  armInnerRadius: 0.72,
  armOuterRadius: 6.35,
  haloRadius: 7.15,
  pitch: 2.42,
} as const

export const GALAXY_GESTURE = {
  fallbackFactor: 0.65,
  fistTightness: 0.78,
  dualMinScale: 0.72,
  dualMaxScale: 1.2,
  waveDuration: 1.75,
  pointRadius: 2.1,
  explosionDuration: 3.15,
} as const

export const GALAXY_CAMERA = {
  position: [0.4, 5.2, 14.6] as const,
  lookAt: [0, 0.05, 0] as const,
  fov: 36,
  driftX: 0.045,
  driftY: 0.035,
  driftZ: 0.04,
} as const

export const GALAXY_BLOOM = {
  threshold: 0.48,
  smoothing: 0.2,
  intensity: 1.28,
  radius: 0.3,
} as const

export interface GalaxyGeometryData {
  count: number
  basePositions: Float32Array
  roles: Float32Array
  arms: Float32Array
  radii: Float32Array
  seeds: Float32Array
  sizes: Float32Array
  temperatures: Float32Array
}
