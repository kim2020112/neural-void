import {
  SATURN_BANDS,
  SATURN_COUNTS,
  SATURN_PLANET,
  SATURN_TYPE,
  type SaturnGeometryData,
} from './saturnTypes'

const TAU = Math.PI * 2

function fract(value: number): number {
  return value - Math.floor(value)
}

function hash(index: number, seed: number): number {
  return fract(Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453123)
}

function hashSigned(index: number, seed: number): number {
  return hash(index, seed) * 2 - 1
}

function bellNoise(index: number, seed: number): number {
  return (
    hashSigned(index, seed) +
    hashSigned(index, seed + 1.7) +
    hashSigned(index, seed + 3.4)
  ) / 3
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / Math.max(0.0001, edge1 - edge0))
  return t * t * (3 - 2 * t)
}

export function generateSaturnGeometry(total = SATURN_COUNTS.total): SaturnGeometryData {
  const planetCount = Math.min(SATURN_COUNTS.planet, total)
  const debrisCount = Math.min(SATURN_COUNTS.debris, Math.max(0, total - planetCount))
  const ringCount = Math.max(0, total - planetCount - debrisCount)
  const basePositions = new Float32Array(total * 3)
  const types = new Float32Array(total)
  const lanes = new Float32Array(total)
  const seeds = new Float32Array(total)
  const sizes = new Float32Array(total)
  const brightness = new Float32Array(total)
  const angularSpeeds = new Float32Array(total)
  let write = 0

  const writeParticle = (
    x: number,
    y: number,
    z: number,
    type: number,
    lane: number,
    seed: number,
    size: number,
    bright: number,
    angularSpeed: number,
  ) => {
    const offset = write * 3
    basePositions[offset] = x
    basePositions[offset + 1] = y
    basePositions[offset + 2] = z
    types[write] = type
    lanes[write] = lane
    seeds[write] = seed
    sizes[write] = size
    brightness[write] = bright
    angularSpeeds[write] = angularSpeed
    write += 1
  }

  const coreCount = Math.round(planetCount * SATURN_COUNTS.coreShare)
  const surfaceCount = planetCount - coreCount
  const { radius, yScale } = SATURN_PLANET

  for (let i = 0; i < coreCount; i++) {
    const r = Math.pow(hash(i, 1.1), 0.46) * radius * 0.58
    const theta = TAU * hash(i, 2.2)
    const phi = Math.acos(1 - 2 * hash(i, 3.3))
    const seed = hash(i, 4.4)
    writeParticle(
      Math.sin(phi) * Math.cos(theta) * r,
      Math.cos(phi) * r * yScale,
      Math.sin(phi) * Math.sin(theta) * r,
      SATURN_TYPE.CORE,
      -1,
      seed,
      0.42 + seed * 0.62,
      0.82 + seed * 0.4,
      0.032,
    )
  }

  for (let i = 0; i < surfaceCount; i++) {
    const t = (i + 0.5) / Math.max(1, surfaceCount)
    const theta = TAU * i * 0.61803398875
    const phi = Math.acos(1 - 2 * t)
    const flow = Math.sin(theta * 3 + phi * 5) * 0.026 + Math.sin(phi * 8) * 0.015
    const shell = radius * (0.9 + hash(i, 5.5) * 0.1 + flow)
    const seed = hash(i, 6.6)
    const isSurfaceSpark = hash(i, 6.95) > 0.92
    writeParticle(
      Math.sin(phi) * Math.cos(theta) * shell,
      Math.cos(phi) * shell * yScale,
      Math.sin(phi) * Math.sin(theta) * shell,
      isSurfaceSpark ? SATURN_TYPE.CORE : SATURN_TYPE.SURFACE,
      -1,
      seed,
      isSurfaceSpark ? 0.72 + seed * 0.65 : 0.28 + seed * 0.52,
      isSurfaceSpark ? 1.35 + seed * 0.45 : 0.42 + seed * 0.38,
      0.032,
    )
  }

  const bandTotalSpec = SATURN_BANDS.reduce((sum, band) => sum + band.count, 0)
  let ringWritten = 0

  for (const band of SATURN_BANDS) {
    const bandCount = band === SATURN_BANDS[SATURN_BANDS.length - 1]
      ? ringCount - ringWritten
      : Math.round((band.count / bandTotalSpec) * ringCount)
    const isMain = band.role === 'main'
    const isOuter = band.role === 'outer' || band.role === 'edge'

    for (let i = 0; i < bandCount; i++) {
      const index = ringWritten + i
      let radialT = Math.pow(hash(index, 7.1), isOuter ? 0.72 : 0.9)
      if (isMain && hash(index, 7.25) < 0.82) {
        const ridgeIndex = Math.min(5, Math.floor(hash(index, 7.45) * 6))
        const ridgeCenters = [0.05, 0.21, 0.39, 0.58, 0.77, 0.94]
        radialT = ridgeCenters[ridgeIndex] + bellNoise(index, 7.7) * 0.052
      }
      radialT = clamp01(radialT)
      const r = band.inner + (band.outer - band.inner) * radialT

      let angle = TAU * hash(index, 8.2)
      const clusterShare = isMain ? 0.56 : isOuter ? 0.32 : 0.26
      const clustered = hash(index, 8.55) < clusterShare
      if (clustered) {
        const clusterCount = isMain ? 12 : isOuter ? 7 : 6
        const clusterIndex = Math.floor(hash(index, 8.75) * clusterCount)
        const clusterCenter = ((clusterIndex + 0.35) / clusterCount) * TAU + band.lane * 0.13
        angle = clusterCenter + bellNoise(index, 8.95) * (isMain ? 0.68 : 0.52)
      } else {
        angle += Math.sin(angle * 3 + band.lane * 1.7) * 0.08
        angle += Math.sin(angle * 7 - band.lane * 0.8) * 0.03
      }

      const yJitter = isMain ? 0.024 : isOuter ? 0.055 : 0.014
      const y = hashSigned(index, 9.3) * yJitter * (clustered ? 1.4 : 1) +
        Math.sin(angle * 4 + radialT * 9) * yJitter * 0.18
      const seed = hash(index, 10.4)
      const clusterEnergy = clustered
        ? 1.08 + smoothstep(0.15, 0.9, hash(index, 10.65)) * 0.28
        : 0.52 + (0.5 + 0.5 * Math.sin(angle * 5 + band.lane)) * 0.38
      const gapDistance = Math.min(
        Math.abs(radialT - 0.13),
        Math.abs(radialT - 0.49),
        Math.abs(radialT - 0.86),
      )
      const gapAttenuation = isMain
        ? 0.32 + smoothstep(0.012, 0.055, gapDistance) * 0.68
        : 1

      let size = isMain ? 0.24 + seed * 0.56 : 0.16 + seed * 0.42
      if (isOuter) size = 0.12 + seed * 0.36
      if (clustered) size *= 1.12
      let bright = isMain
        ? band.brightness * (0.8 + seed * 0.4)
        : band.brightness * (0.7 + seed * 0.34)
      bright *= clusterEnergy * gapAttenuation

      writeParticle(
        Math.cos(angle) * r,
        y,
        Math.sin(angle) * r,
        SATURN_TYPE.RING,
        band.lane,
        seed,
        size,
        bright,
        band.angularSpeed * (0.92 + seed * 0.16),
      )
    }
    ringWritten += bandCount
  }

  const mainBand = SATURN_BANDS[2]
  const hotspotCount = Math.round(debrisCount * 0.22)
  const scrapCount = debrisCount - hotspotCount

  for (let i = 0; i < scrapCount; i++) {
    const index = 50000 + i
    const isOuterScrap = hash(index, 10.8) > 0.68
    const r = isOuterScrap
      ? 4.7 + Math.pow(hash(index, 11.1), 0.8) * 1.25
      : mainBand.inner - 0.08 + (mainBand.outer - mainBand.inner + 0.22) * hash(index, 11.1)
    let angle = TAU * hash(index, 12.2)
    if (hash(index, 12.45) > 0.58) {
      const arc = Math.floor(hash(index, 12.7) * 8)
      angle = ((arc + 0.25) / 8) * TAU + bellNoise(index, 12.95) * 0.7
    }
    const depthLayer = hash(index, 13.05) > 0.82 ? 2.2 : 1
    const y = hashSigned(index, 13.3) * (isOuterScrap ? 0.17 : 0.075) * depthLayer
    const seed = hash(index, 14.4)
    writeParticle(
      Math.cos(angle) * r,
      y,
      Math.sin(angle) * r,
      SATURN_TYPE.DEBRIS,
      isOuterScrap ? 4 : 2,
      seed,
      0.16 + seed * 0.55,
      0.28 + seed * 0.42,
      mainBand.angularSpeed * (0.72 + seed * 0.48),
    )
  }

  for (let i = 0; i < hotspotCount; i++) {
    const index = 80000 + i
    const innerHotspot = hash(index, 14.8) > 0.74
    const r = innerHotspot
      ? 1.62 + hash(index, 15.1) * 1.1
      : mainBand.inner + (mainBand.outer - mainBand.inner) * hash(index, 15.1)
    const arc = Math.floor(hash(index, 15.7) * 12)
    const angle = ((arc + 0.18) / 12) * TAU + bellNoise(index, 16.2) * 0.46
    const seed = hash(index, 18.4)
    writeParticle(
      Math.cos(angle) * r,
      hashSigned(index, 17.3) * 0.05,
      Math.sin(angle) * r,
      SATURN_TYPE.HOTSPOT,
      innerHotspot ? 1 : 2,
      seed,
      0.46 + seed * 0.86,
      1.28 + seed * 0.58,
      mainBand.angularSpeed * (1 + seed * 0.46),
    )
  }

  while (write < total) {
    const seed = hash(write, 99.1)
    writeParticle(0, 0, 0, SATURN_TYPE.CORE, -1, seed, 0.5, 0.5, 0.025)
  }

  return {
    count: total,
    basePositions,
    types,
    lanes,
    seeds,
    sizes,
    brightness,
    angularSpeeds,
  }
}
