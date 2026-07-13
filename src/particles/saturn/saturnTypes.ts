export type SaturnParticleType = 0 | 1 | 2 | 3 | 4

export const SATURN_TYPE = {
  CORE: 0,
  SURFACE: 1,
  RING: 2,
  DEBRIS: 3,
  HOTSPOT: 4,
} as const

export interface SaturnBand {
  lane: number
  inner: number
  outer: number
  count: number
  angularSpeed: number
  brightness: number
  role: 'inner' | 'main' | 'outer' | 'edge'
}

export interface SaturnGeometryData {
  count: number
  basePositions: Float32Array
  types: Float32Array
  lanes: Float32Array
  seeds: Float32Array
  sizes: Float32Array
  brightness: Float32Array
  angularSpeeds: Float32Array
}

export const SATURN_COLORS = {
  bg: '#02050D',
  planetDeep: '#041B3A',
  planetBright: '#17B8FF',
  coreIce: '#DDF8FF',
  ringPale: '#FFE5A3',
  ringGold: '#FFB22E',
  ringOrange: '#FF6D16',
  hotWhite: '#FFF6D6',
} as const

export const SATURN_COUNTS = {
  total: 18000,
  planet: 2200,
  ring: 13500,
  debris: 2300,
  coreShare: 0.25,
} as const

export const SATURN_PLANET = {
  radius: 1.16,
  yScale: 0.82,
} as const

export const SATURN_BANDS: readonly SaturnBand[] = [
  { lane: 0, inner: 1.48, outer: 2.02, count: 1100, angularSpeed: 0.16, brightness: 0.85, role: 'inner' },
  { lane: 1, inner: 2.1, outer: 2.66, count: 1700, angularSpeed: 0.13, brightness: 0.92, role: 'inner' },
  { lane: 2, inner: 2.78, outer: 4.34, count: 5200, angularSpeed: 0.1, brightness: 0.98, role: 'main' },
  { lane: 3, inner: 4.46, outer: 5.04, count: 1700, angularSpeed: 0.07, brightness: 0.72, role: 'outer' },
  { lane: 4, inner: 5.14, outer: 5.7, count: 800, angularSpeed: 0.045, brightness: 0.52, role: 'edge' },
] as const

export const SATURN_POSE = {
  rotationX: 0.3,
  rotationZ: -0.12,
  positionY: -0.28,
} as const

export const SATURN_MOTION = {
  planetSpin: 0.025,
  breathPeriod: 4.0,
  breathMin: 0.98,
  breathMax: 1.02,
} as const

export const SATURN_CAMERA = {
  position: [0, 0.85, 13.5] as const,
  lookAt: [0, -0.2, 0] as const,
  fov: 36,
  driftX: 0.05,
  driftY: 0.03,
  driftZ: 0.05,
} as const

export const SATURN_GESTURE = {
  fistTighten: 0.1,
  fistSpinBoost: 0.78,
  openExpand: 0.1,
  openMaxExpand: 0.14,
  dualCompressedScale: 0.86,
  dualOpenScale: 1.04,
  fallbackCoreScale: 0.92,
  fallbackCoreFactor: 0.65,
  explosionExpand: 0.18,
  pointRadius: 1.65,
  pointMaxDisplace: 0.58,
  releaseSeconds: 1.05,
  handYaw: 0.09,
  recoverSeconds: 0.82,
} as const

export const SATURN_BLOOM = {
  threshold: 0.42,
  smoothing: 0.22,
  intensity: 1.85,
  radius: 0.35,
} as const
