import {
  SINGULARITY_COUNTS,
  SINGULARITY_TYPE,
  type SingularityGeometryData,
} from './singularityTypes'

const TAU = Math.PI * 2

function fract(value: number) {
  return value - Math.floor(value)
}

function hash(index: number, seed: number) {
  return fract(Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453123)
}

function signedHash(index: number, seed: number) {
  return hash(index, seed) * 2 - 1
}

function bellNoise(index: number, seed: number) {
  return (
    signedHash(index, seed) +
    signedHash(index, seed + 1.73) +
    signedHash(index, seed + 3.46)
  ) / 3
}

export function generateSingularityGeometry(
  total = SINGULARITY_COUNTS.total,
): SingularityGeometryData {
  const basePositions = new Float32Array(total * 3)
  const types = new Float32Array(total)
  const seeds = new Float32Array(total)
  const sizes = new Float32Array(total)
  const brightness = new Float32Array(total)
  const angularSpeeds = new Float32Array(total)
  const specifiedTotal = SINGULARITY_COUNTS.total
  const diskCount = Math.round(total * SINGULARITY_COUNTS.disk / specifiedTotal)
  const hotspotCount = Math.round(total * SINGULARITY_COUNTS.hotspot / specifiedTotal)
  const haloCount = Math.round(total * SINGULARITY_COUNTS.halo / specifiedTotal)
  const jetCount = total - diskCount - hotspotCount - haloCount
  let write = 0

  const add = (
    x: number,
    y: number,
    z: number,
    type: number,
    seed: number,
    size: number,
    bright: number,
    speed: number,
  ) => {
    const offset = write * 3
    basePositions[offset] = x
    basePositions[offset + 1] = y
    basePositions[offset + 2] = z
    types[write] = type
    seeds[write] = seed
    sizes[write] = size
    brightness[write] = bright
    angularSpeeds[write] = speed
    write += 1
  }

  for (let i = 0; i < diskCount; i++) {
    const radialT = Math.pow(hash(i, 1.2), 1.55)
    const radius = 1.48 + radialT * 4.65
    const arm = Math.floor(hash(i, 1.7) * 9)
    let angle = TAU * hash(i, 2.1)
    if (hash(i, 2.4) < 0.72) {
      angle = arm / 9 * TAU + Math.log(radius) * 1.85 + bellNoise(i, 2.8) * 0.8
    }
    const seed = hash(i, 3.2)
    const heat = 1 - Math.min(1, (radius - 1.48) / 4.65)
    const thickness = 0.025 + radialT * radialT * 0.16
    add(
      Math.cos(angle) * radius,
      bellNoise(i, 3.8) * thickness,
      Math.sin(angle) * radius,
      SINGULARITY_TYPE.DISK,
      seed,
      0.2 + seed * 0.5 + heat * 0.16,
      0.34 + heat * 0.92 + seed * 0.2,
      0.075 + heat * 0.29,
    )
  }

  for (let i = 0; i < hotspotCount; i++) {
    const index = 30000 + i
    const radius = 1.5 + Math.pow(hash(index, 4.1), 1.8) * 2.55
    const arc = Math.floor(hash(index, 4.5) * 11)
    const angle = arc / 11 * TAU + Math.log(radius) * 1.7 + bellNoise(index, 4.9) * 0.36
    const seed = hash(index, 5.3)
    add(
      Math.cos(angle) * radius,
      bellNoise(index, 5.7) * 0.055,
      Math.sin(angle) * radius,
      SINGULARITY_TYPE.HOTSPOT,
      seed,
      0.48 + seed * 0.72,
      1.28 + seed * 0.72,
      0.2 + (1 - (radius - 1.5) / 2.55) * 0.32,
    )
  }

  for (let i = 0; i < haloCount; i++) {
    const index = 50000 + i
    const radius = 2.05 + Math.pow(hash(index, 6.1), 0.8) * 4.3
    const theta = TAU * hash(index, 6.5)
    const latitude = signedHash(index, 6.9) * 0.82
    const radial = Math.sqrt(Math.max(0, 1 - latitude * latitude)) * radius
    const seed = hash(index, 7.3)
    add(
      Math.cos(theta) * radial,
      latitude * radius * 0.7,
      Math.sin(theta) * radial,
      SINGULARITY_TYPE.HALO,
      seed,
      0.14 + seed * 0.34,
      0.18 + seed * 0.3,
      0.025 + seed * 0.04,
    )
  }

  for (let i = 0; i < jetCount; i++) {
    const index = 70000 + i
    const side = i % 2 === 0 ? 1 : -1
    const travel = Math.pow(hash(index, 8.1), 0.72)
    const y = side * (0.72 + travel * 6.15)
    const width = 0.06 + travel * 0.52
    const angle = TAU * hash(index, 8.5) + travel * 12
    const seed = hash(index, 8.9)
    add(
      Math.cos(angle) * width * (0.35 + seed * 0.65),
      y,
      Math.sin(angle) * width * (0.35 + seed * 0.65),
      SINGULARITY_TYPE.JET,
      seed,
      0.26 + seed * 0.56,
      0.38 + (1 - travel) * 0.9 + seed * 0.22,
      0.22 + seed * 0.18,
    )
  }

  return {
    count: total,
    basePositions,
    types,
    seeds,
    sizes,
    brightness,
    angularSpeeds,
  }
}
