export interface CinematicEnvelopeInput {
  time: number
  force: number
  voidStrength: number
  transition: number
  handDetected: boolean
  phase?: 'idle' | 'forming' | 'active' | 'exploding'
}

export interface CinematicEnvelope {
  breath: number
  pulse: number
  energy: number
  drift: number
  zoom: number
  atmosphere: number
  turbulence: number
  shock: number
  settle: number
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

export function computeCinematicEnvelope({
  time,
  force,
  voidStrength,
  transition,
  handDetected,
  phase = 'idle',
}: CinematicEnvelopeInput): CinematicEnvelope {
  const breathWave = 0.5 + 0.5 * Math.sin(time * 0.22 + Math.sin(time * 0.07) * 1.15)
  const pulseWave = 0.5 + 0.5 * Math.sin(time * 1.35 + Math.sin(time * 0.45) * 0.65)
  const transitionShock = Math.pow(Math.sin(clamp01(transition) * Math.PI), 1.8)

  const forming = phase === 'forming' ? clamp01(voidStrength) : 0
  const active = phase === 'active' ? clamp01(voidStrength) : 0
  const exploding = phase === 'exploding' ? clamp01(voidStrength) : 0

  const compression = Math.pow(forming, 1.35)
  const sustainedCore = Math.pow(active, 0.82)
  const release = Math.pow(exploding, 0.68)
  const afterglow = release * (0.55 + 0.45 * Math.sin(time * 6.5 + 0.9))

  const tension = clamp01(
    force * 0.44 +
      voidStrength * 0.52 +
      sustainedCore * 0.24 +
      compression * 0.34 +
      release * 0.42 +
      transition * 0.72 +
      (handDetected ? 0.08 : 0),
  )

  const breath = clamp01(0.26 + breathWave * (0.44 - compression * 0.18) + sustainedCore * 0.1 + release * 0.05)
  const pulse =
    0.46 +
    breathWave * 0.14 +
    pulseWave * 0.12 +
    compression * 0.26 +
    sustainedCore * 0.18 +
    release * 0.34 +
    afterglow * 0.12 +
    tension * 0.22
  const energy = clamp01(
    0.14 +
      breathWave * 0.08 +
      pulseWave * 0.08 +
      compression * 0.22 +
      sustainedCore * 0.3 +
      release * 0.42 +
      transitionShock * 0.14 +
      tension * 0.34,
  )

  const drift = 0.2 + breathWave * 0.16 + tension * 0.28 + release * 0.18 - compression * 0.08
  const zoom = 0.18 + breathWave * 0.22 + compression * 0.42 + sustainedCore * 0.2 + tension * 0.18
  const atmosphere = 0.36 + breathWave * 0.14 + sustainedCore * 0.14 + release * 0.24 + tension * 0.24
  const turbulence =
    0.12 +
    pulseWave * 0.12 +
    compression * 0.12 +
    sustainedCore * 0.16 +
    release * 0.44 +
    afterglow * 0.16 +
    transitionShock * 0.24 +
    tension * 0.18
  const shock = clamp01(transitionShock * 0.28 + release * 0.74 + afterglow * 0.12)
  const settle = clamp01(1 - shock * 0.88 + compression * 0.16 + sustainedCore * 0.08)

  return {
    breath,
    pulse,
    energy,
    drift,
    zoom,
    atmosphere,
    turbulence,
    shock,
    settle,
  }
}