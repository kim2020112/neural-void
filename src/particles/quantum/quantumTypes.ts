export type QuantumParticleRole = 0 | 1 | 2 | 3 | 4

export const QUANTUM_ROLE = {
  CORE: 0,
  INNER_SHELL: 1,
  OUTER_SHELL: 2,
  ORBIT: 3,
  PULSE: 4,
} as const

export const QUANTUM_COUNTS = {
  total: 15000,
  core: 3000,
  innerShell: 4200,
  outerShell: 4200,
  orbit: 2400,
  pulse: 1200,
} as const

export const QUANTUM_STRUCTURE = {
  coreRadius: 1.18,
  innerShellRadius: 2.58,
  outerShellRadius: 3.62,
  orbitRadius: 4.55,
  orbitLanes: 3,
} as const

export const QUANTUM_GESTURE = {
  fallbackFactor: 0.65,
  fistScale: 0.72,
  dualMinScale: 0.76,
  dualMaxScale: 1.24,
  pulseDuration: 1.45,
  lensRadius: 2.3,
  explosionDuration: 2.85,
} as const

export const QUANTUM_CAMERA = {
  position: [0.35, 0.8, 12.8] as const,
  lookAt: [0, 0.2, 0] as const,
  fov: 38,
  driftX: 0.04,
  driftY: 0.025,
  driftZ: 0.035,
} as const

export const QUANTUM_BLOOM = {
  threshold: 0.38,
  smoothing: 0.24,
  intensity: 1.45,
  radius: 0.34,
} as const

export interface QuantumGeometryData {
  count: number
  basePositions: Float32Array
  roles: Float32Array
  layers: Float32Array
  seeds: Float32Array
  sizes: Float32Array
  progress: Float32Array
}
