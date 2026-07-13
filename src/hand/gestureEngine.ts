import type { GestureType, Vec3 } from '../store/appStore'

export const DUAL_HAND_SPAN = {
  compressed: 3.2,
  open: 6.8,
} as const

const SCORE_THRESHOLDS: Record<Exclude<GestureType, 'none'>, number> = {
  fist: 0.52,
  open_palm: 0.52,
  point: 0.48,
}

const ACTIVATION_MS = 90
const SWITCH_MS = 110
const RELEASE_MS = 150

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function clamp01(value: number) {
  return clamp(value, 0, 1)
}

function distance(a: Vec3, b: Vec3) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export function mapGestureName(name: string): GestureType {
  switch (name) {
    case 'Closed_Fist':
      return 'fist'
    case 'Open_Palm':
      return 'open_palm'
    case 'Pointing_Up':
      return 'point'
    default:
      return 'none'
  }
}

export function toWorldSpace(mpX: number, mpY: number, mpZ: number): Vec3 {
  const x = clamp(mpX, 0.04, 0.96)
  const y = clamp(mpY, 0.04, 0.96)
  const z = clamp(mpZ, -0.35, 0.2)

  return {
    // Selfie controls should feel like a mirror: move right, cursor moves right.
    x: (0.5 - x) * 15,
    y: (0.55 - y) * 12 + 0.9,
    z: clamp((z + 0.05) * 9 - 2.8, -5.2, 2.2),
  }
}

export class AdaptiveVec3Filter {
  private value: Vec3 | null = null
  private lastTimestamp = 0

  update(target: Vec3, timestamp: number): Vec3 {
    if (!this.value || this.lastTimestamp === 0 || timestamp - this.lastTimestamp > 250) {
      this.value = { ...target }
      this.lastTimestamp = timestamp
      return this.value
    }

    const deltaSeconds = clamp((timestamp - this.lastTimestamp) / 1000, 1 / 120, 0.1)
    const speed = distance(this.value, target) / deltaSeconds
    const motion = clamp01((speed - 1.2) / 16)
    const alphaAt60Fps = 0.18 + motion * 0.5
    const alpha = 1 - Math.pow(1 - alphaAt60Fps, deltaSeconds * 60)

    this.value = {
      x: this.value.x + (target.x - this.value.x) * alpha,
      y: this.value.y + (target.y - this.value.y) * alpha,
      z: this.value.z + (target.z - this.value.z) * alpha,
    }
    this.lastTimestamp = timestamp
    return this.value
  }

  reset() {
    this.value = null
    this.lastTimestamp = 0
  }
}

export interface StableGesture {
  gesture: GestureType
  score: number
}

export class GestureStabilizer {
  private current: GestureType = 'none'
  private currentScore = 0
  private candidate: GestureType = 'none'
  private candidateSince = 0
  private noneSince = 0

  update(rawGesture: GestureType, rawScore: number, timestamp: number): StableGesture {
    const valid =
      rawGesture !== 'none' && rawScore >= SCORE_THRESHOLDS[rawGesture]

    if (valid) {
      this.noneSince = 0

      if (rawGesture === this.current) {
        this.candidate = 'none'
        this.candidateSince = 0
        this.currentScore += (rawScore - this.currentScore) * 0.35
        return { gesture: this.current, score: this.currentScore }
      }

      if (rawGesture !== this.candidate) {
        this.candidate = rawGesture
        this.candidateSince = timestamp
      }

      const requiredMs = this.current === 'none' ? ACTIVATION_MS : SWITCH_MS
      if (timestamp - this.candidateSince >= requiredMs) {
        this.current = rawGesture
        this.currentScore = rawScore
        this.candidate = 'none'
        this.candidateSince = 0
      }

      return { gesture: this.current, score: this.currentScore }
    }

    this.candidate = 'none'
    this.candidateSince = 0

    if (this.current === 'none') {
      return { gesture: 'none', score: 0 }
    }

    if (this.noneSince === 0) {
      this.noneSince = timestamp
    }

    if (timestamp - this.noneSince >= RELEASE_MS) {
      this.current = 'none'
      this.currentScore = 0
      this.noneSince = 0
    }

    return { gesture: this.current, score: this.currentScore }
  }

  reset() {
    this.current = 'none'
    this.currentScore = 0
    this.candidate = 'none'
    this.candidateSince = 0
    this.noneSince = 0
  }
}
