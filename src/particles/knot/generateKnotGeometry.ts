import {
  KNOT_COUNTS,
  KNOT_ROLE,
  KNOT_STRUCTURE,
  type KnotGeometryData,
} from './knotTypes'

const TAU = Math.PI * 2

interface MutablePoint3 {
  x: number
  y: number
  z: number
}

function fract(value: number) {
  return value - Math.floor(value)
}

function hash(index: number, seed: number) {
  return fract(Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453123)
}

function signedHash(index: number, seed: number) {
  return hash(index, seed) * 2 - 1
}

export function sampleKnotPoint(
  progress: number,
  strand: number,
  spread: number,
  output: MutablePoint3,
) {
  const angle = progress * TAU
  const strandPhase = strand * TAU / KNOT_COUNTS.strandCount
  const tubeAngle = KNOT_STRUCTURE.q * angle + strandPhase
  const tubeRadius = KNOT_STRUCTURE.tubeRadius * spread
  const radial = KNOT_STRUCTURE.majorRadius + Math.cos(tubeAngle) * tubeRadius
  const pathAngle = KNOT_STRUCTURE.p * angle
  output.x = Math.cos(pathAngle) * radial
  output.y = Math.sin(tubeAngle) * tubeRadius * 1.08
  output.z = Math.sin(pathAngle) * radial
  return output
}

export function generateKnotGeometry(): KnotGeometryData {
  const { total } = KNOT_COUNTS
  const basePositions = new Float32Array(total * 3)
  const offsets = new Float32Array(total * 3)
  const roles = new Float32Array(total)
  const strands = new Float32Array(total)
  const parameters = new Float32Array(total)
  const seeds = new Float32Array(total)
  const sizes = new Float32Array(total)
  const point = { x: 0, y: 0, z: 0 }
  let write = 0

  const add = (
    progress: number,
    strand: number,
    role: number,
    jitter: number,
    seed: number,
    size: number,
  ) => {
    sampleKnotPoint(progress, strand, 1, point)
    const offset = write * 3
    const jitterX = signedHash(write, 2.1) * jitter
    const jitterY = signedHash(write, 2.7) * jitter
    const jitterZ = signedHash(write, 3.3) * jitter
    basePositions[offset] = point.x + jitterX
    basePositions[offset + 1] = point.y + jitterY
    basePositions[offset + 2] = point.z + jitterZ
    offsets[offset] = jitterX
    offsets[offset + 1] = jitterY
    offsets[offset + 2] = jitterZ
    roles[write] = role
    strands[write] = strand
    parameters[write] = fract(progress)
    seeds[write] = seed
    sizes[write] = size
    write += 1
  }

  for (let strand = 0; strand < KNOT_COUNTS.strandCount; strand++) {
    for (let i = 0; i < KNOT_COUNTS.particlesPerStrand; i++) {
      const index = strand * KNOT_COUNTS.particlesPerStrand + i
      const seed = hash(index, 4.1)
      const progress = (i + 0.5 + signedHash(index, 4.7) * 0.28) / KNOT_COUNTS.particlesPerStrand
      add(progress, strand, KNOT_ROLE.STRAND, 0.018 + seed * 0.026, seed, 0.18 + seed * 0.32)
    }
  }

  const hotspotStart = KNOT_COUNTS.strand
  const particlesPerCrossing = KNOT_COUNTS.hotspot / KNOT_COUNTS.crossingCount
  for (let i = 0; i < KNOT_COUNTS.hotspot; i++) {
    const index = hotspotStart + i
    const crossing = Math.floor(i / particlesPerCrossing)
    const strand = i % KNOT_COUNTS.strandCount
    const seed = hash(index, 5.3)
    const progress = (crossing + 0.5) / KNOT_COUNTS.crossingCount + signedHash(index, 5.9) * 0.006
    add(progress, strand, KNOT_ROLE.HOTSPOT, 0.035 + seed * 0.045, seed, 0.46 + seed * 0.7)
  }

  const sparkStart = hotspotStart + KNOT_COUNTS.hotspot
  for (let i = 0; i < KNOT_COUNTS.spark; i++) {
    const index = sparkStart + i
    const strand = i % KNOT_COUNTS.strandCount
    const seed = hash(index, 6.5)
    add(hash(index, 7.1), strand, KNOT_ROLE.SPARK, 0.02 + seed * 0.04, seed, 0.34 + seed * 0.62)
  }

  return { count: write, basePositions, offsets, roles, strands, parameters, seeds, sizes }
}
