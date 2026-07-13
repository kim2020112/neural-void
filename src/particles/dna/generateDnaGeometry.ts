import {
  DNA_COUNTS,
  DNA_STRUCTURE,
  DNA_TYPE,
  type DnaGeometryData,
} from './dnaTypes'

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

function helixPoint(progress: number, side: number, radius: number = DNA_STRUCTURE.radius) {
  const angle = progress * DNA_STRUCTURE.turns * TAU + (side < 0 ? Math.PI : 0)
  return {
    x: Math.cos(angle) * radius,
    y: (progress - 0.5) * DNA_STRUCTURE.height,
    z: Math.sin(angle) * radius,
  }
}

export function generateDnaGeometry(total = DNA_COUNTS.total): DnaGeometryData {
  const basePositions = new Float32Array(total * 3)
  const types = new Float32Array(total)
  const seeds = new Float32Array(total)
  const sizes = new Float32Array(total)
  const brightness = new Float32Array(total)
  const progress = new Float32Array(total)
  const pairClasses = new Float32Array(total)
  const strandSides = new Float32Array(total)
  const specifiedTotal = DNA_COUNTS.total
  const backboneACount = Math.round(total * DNA_COUNTS.backboneA / specifiedTotal)
  const backboneBCount = Math.round(total * DNA_COUNTS.backboneB / specifiedTotal)
  const baseCount = Math.round(total * DNA_COUNTS.base / specifiedTotal)
  const markerCount = Math.round(total * DNA_COUNTS.marker / specifiedTotal)
  const replicaCount = total - backboneACount - backboneBCount - baseCount - markerCount
  let write = 0

  const add = (
    x: number,
    y: number,
    z: number,
    type: number,
    seed: number,
    size: number,
    bright: number,
    sequenceProgress: number,
    pairClass: number,
    side: number,
  ) => {
    const offset = write * 3
    basePositions[offset] = x
    basePositions[offset + 1] = y
    basePositions[offset + 2] = z
    types[write] = type
    seeds[write] = seed
    sizes[write] = size
    brightness[write] = bright
    progress[write] = sequenceProgress
    pairClasses[write] = pairClass
    strandSides[write] = side
    write += 1
  }

  const addBackbone = (count: number, side: number, type: number, offset: number) => {
    for (let i = 0; i < count; i++) {
      const index = offset + i
      const sequenceProgress = (i + hash(index, 1.3)) / count
      const seed = hash(index, 1.9)
      const radius = DNA_STRUCTURE.radius + bellNoise(index, 2.5) * 0.13
      const point = helixPoint(sequenceProgress, side, radius)
      add(
        point.x + bellNoise(index, 3.1) * 0.055,
        point.y + bellNoise(index, 3.7) * 0.07,
        point.z + bellNoise(index, 4.3) * 0.055,
        type,
        seed,
        0.32 + seed * 0.72,
        0.72 + seed * 0.38,
        sequenceProgress,
        Math.floor(sequenceProgress * DNA_STRUCTURE.pairCount) % 2,
        side,
      )
    }
  }

  addBackbone(backboneACount, 1, DNA_TYPE.BACKBONE_A, 0)
  addBackbone(backboneBCount, -1, DNA_TYPE.BACKBONE_B, 20000)

  for (let i = 0; i < baseCount; i++) {
    const index = 40000 + i
    const pairIndex = Math.floor(hash(index, 5.1) * DNA_STRUCTURE.pairCount)
    const sequenceProgress = (pairIndex + 0.5) / DNA_STRUCTURE.pairCount
    const mixValue = 0.08 + hash(index, 5.7) * 0.84
    const side = mixValue < 0.5 ? 1 : -1
    const strandA = helixPoint(sequenceProgress, 1, DNA_STRUCTURE.radius * 0.93)
    const strandB = helixPoint(sequenceProgress, -1, DNA_STRUCTURE.radius * 0.93)
    const seed = hash(index, 6.3)
    add(
      strandA.x + (strandB.x - strandA.x) * mixValue + bellNoise(index, 6.9) * 0.035,
      strandA.y + bellNoise(index, 7.5) * 0.05,
      strandA.z + (strandB.z - strandA.z) * mixValue + bellNoise(index, 8.1) * 0.035,
      DNA_TYPE.BASE,
      seed,
      0.22 + seed * 0.52,
      0.52 + seed * 0.42,
      sequenceProgress,
      pairIndex % 2,
      side,
    )
  }

  for (let i = 0; i < markerCount; i++) {
    const index = 60000 + i
    const pairIndex = Math.floor(hash(index, 8.7) * DNA_STRUCTURE.pairCount)
    const sequenceProgress = (pairIndex + 0.5) / DNA_STRUCTURE.pairCount
    const side = i % 2 === 0 ? 1 : -1
    const seed = hash(index, 9.3)
    const point = helixPoint(sequenceProgress, side, DNA_STRUCTURE.radius * (1.02 + seed * 0.035))
    add(
      point.x,
      point.y + bellNoise(index, 9.9) * 0.045,
      point.z,
      DNA_TYPE.MARKER,
      seed,
      0.56 + seed * 0.82,
      1.15 + seed * 0.52,
      sequenceProgress,
      pairIndex % 2,
      side,
    )
  }

  for (let i = 0; i < replicaCount; i++) {
    const index = 80000 + i
    const side = i % 2 === 0 ? 1 : -1
    const sequenceProgress = (i + hash(index, 10.5)) / replicaCount
    const seed = hash(index, 11.1)
    const point = helixPoint(sequenceProgress, side, DNA_STRUCTURE.radius * 0.96)
    add(
      point.x + bellNoise(index, 11.7) * 0.08,
      point.y + bellNoise(index, 12.3) * 0.08,
      point.z + bellNoise(index, 12.9) * 0.08,
      DNA_TYPE.REPLICA,
      seed,
      0.28 + seed * 0.58,
      0.72 + seed * 0.42,
      sequenceProgress,
      Math.floor(sequenceProgress * DNA_STRUCTURE.pairCount) % 2,
      side,
    )
  }

  const bondVertexCount = DNA_STRUCTURE.pairCount * 2
  const bondPositions = new Float32Array(bondVertexCount * 3)
  const bondProgress = new Float32Array(bondVertexCount)
  const bondPairClasses = new Float32Array(bondVertexCount)
  const bondSides = new Float32Array(bondVertexCount)

  for (let pairIndex = 0; pairIndex < DNA_STRUCTURE.pairCount; pairIndex++) {
    const sequenceProgress = (pairIndex + 0.5) / DNA_STRUCTURE.pairCount
    const strandA = helixPoint(sequenceProgress, 1, DNA_STRUCTURE.radius * 0.9)
    const strandB = helixPoint(sequenceProgress, -1, DNA_STRUCTURE.radius * 0.9)
    const vertexA = pairIndex * 2
    const vertexB = vertexA + 1

    bondPositions.set([strandA.x, strandA.y, strandA.z], vertexA * 3)
    bondPositions.set([strandB.x, strandB.y, strandB.z], vertexB * 3)
    bondProgress[vertexA] = sequenceProgress
    bondProgress[vertexB] = sequenceProgress
    bondPairClasses[vertexA] = pairIndex % 2
    bondPairClasses[vertexB] = pairIndex % 2
    bondSides[vertexA] = 1
    bondSides[vertexB] = -1
  }

  return {
    count: total,
    basePositions,
    types,
    seeds,
    sizes,
    brightness,
    progress,
    pairClasses,
    strandSides,
    bondPositions,
    bondProgress,
    bondPairClasses,
    bondSides,
  }
}
