import {
  HYPERCUBE_COUNTS,
  HYPERCUBE_EDGES_4D,
  HYPERCUBE_ROLE,
  HYPERCUBE_ROTATION,
  HYPERCUBE_STRUCTURE,
  HYPERCUBE_VERTICES_4D,
  type HypercubeGeometryData,
  type HypercubePoint4,
} from './hypercubeTypes'

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

export function projectHypercubePoint(
  point: HypercubePoint4,
  angleXW: number,
  angleYW: number,
  wScale: number,
  output: MutablePoint3,
) {
  const scaledW = point[3] * wScale
  const cosXW = Math.cos(angleXW)
  const sinXW = Math.sin(angleXW)
  const x = point[0] * cosXW - scaledW * sinXW
  const wAfterXW = point[0] * sinXW + scaledW * cosXW
  const cosYW = Math.cos(angleYW)
  const sinYW = Math.sin(angleYW)
  const y = point[1] * cosYW - wAfterXW * sinYW
  const w = point[1] * sinYW + wAfterXW * cosYW
  const perspective = HYPERCUBE_STRUCTURE.projectionDistance /
    (HYPERCUBE_STRUCTURE.projectionDistance - w)

  output.x = x * perspective * HYPERCUBE_STRUCTURE.extent
  output.y = y * perspective * HYPERCUBE_STRUCTURE.extent
  output.z = point[2] * perspective * HYPERCUBE_STRUCTURE.extent
  return output
}

function writeProjection(
  coordinates: Float32Array,
  coordinateOffset: number,
  projection: Float32Array,
  projectionOffset: number,
) {
  const x = coordinates[coordinateOffset]
  const y = coordinates[coordinateOffset + 1]
  const z = coordinates[coordinateOffset + 2]
  const w = coordinates[coordinateOffset + 3]
  const cosXW = Math.cos(HYPERCUBE_ROTATION.initialXW)
  const sinXW = Math.sin(HYPERCUBE_ROTATION.initialXW)
  const xRotated = x * cosXW - w * sinXW
  const wAfterXW = x * sinXW + w * cosXW
  const cosYW = Math.cos(HYPERCUBE_ROTATION.initialYW)
  const sinYW = Math.sin(HYPERCUBE_ROTATION.initialYW)
  const yRotated = y * cosYW - wAfterXW * sinYW
  const wRotated = y * sinYW + wAfterXW * cosYW
  const perspective = HYPERCUBE_STRUCTURE.projectionDistance /
    (HYPERCUBE_STRUCTURE.projectionDistance - wRotated)

  projection[projectionOffset] = xRotated * perspective * HYPERCUBE_STRUCTURE.extent
  projection[projectionOffset + 1] = yRotated * perspective * HYPERCUBE_STRUCTURE.extent
  projection[projectionOffset + 2] = z * perspective * HYPERCUBE_STRUCTURE.extent
}

export function generateHypercubeGeometry(): HypercubeGeometryData {
  const { total } = HYPERCUBE_COUNTS
  const coordinates4d = new Float32Array(total * 4)
  const initialProjection = new Float32Array(total * 3)
  const roles = new Float32Array(total)
  const axes = new Float32Array(total)
  const seeds = new Float32Array(total)
  const sizes = new Float32Array(total)
  const vertexA = new Float32Array(total)
  const vertexB = new Float32Array(total)
  const edgeProgress = new Float32Array(total)
  let write = 0

  const add = (
    x: number,
    y: number,
    z: number,
    w: number,
    role: number,
    axis: number,
    seed: number,
    size: number,
    startVertex: number,
    endVertex: number,
    progress: number,
  ) => {
    const coordinateOffset = write * 4
    const projectionOffset = write * 3
    coordinates4d.set([x, y, z, w], coordinateOffset)
    writeProjection(coordinates4d, coordinateOffset, initialProjection, projectionOffset)
    roles[write] = role
    axes[write] = axis
    seeds[write] = seed
    sizes[write] = size
    vertexA[write] = startVertex
    vertexB[write] = endVertex
    edgeProgress[write] = progress
    write += 1
  }

  HYPERCUBE_EDGES_4D.forEach(([startIndex, endIndex, axis], edgeIndex) => {
    const start = HYPERCUBE_VERTICES_4D[startIndex]
    const end = HYPERCUBE_VERTICES_4D[endIndex]
    for (let i = 0; i < HYPERCUBE_COUNTS.particlesPerEdge; i++) {
      const index = edgeIndex * HYPERCUBE_COUNTS.particlesPerEdge + i
      const seed = hash(index, 1.7)
      const progress = Math.max(0, Math.min(
        1,
        (i + 0.5 + signedHash(index, 2.3) * 0.28) / HYPERCUBE_COUNTS.particlesPerEdge,
      ))
      const jitter = 0.012
      const point = [0, 0, 0, 0]
      for (let dimension = 0; dimension < 4; dimension++) {
        point[dimension] = start[dimension] + (end[dimension] - start[dimension]) * progress
        if (dimension !== axis) point[dimension] += signedHash(index, 3.1 + dimension * 0.73) * jitter
      }
      add(
        point[0], point[1], point[2], point[3],
        HYPERCUBE_ROLE.EDGE, axis, seed, 0.15 + seed * 0.16,
        startIndex, endIndex, progress,
      )
    }
  })

  HYPERCUBE_VERTICES_4D.forEach((vertex, vertexIndex) => {
    for (let i = 0; i < HYPERCUBE_COUNTS.particlesPerVertex; i++) {
      const index = HYPERCUBE_COUNTS.edge + vertexIndex * HYPERCUBE_COUNTS.particlesPerVertex + i
      const seed = hash(index, 7.1)
      const radius = Math.pow(hash(index, 7.7), 1.8) * 0.085
      add(
        vertex[0] + signedHash(index, 8.3) * radius,
        vertex[1] + signedHash(index, 8.9) * radius,
        vertex[2] + signedHash(index, 9.5) * radius,
        vertex[3] + signedHash(index, 10.1) * radius,
        HYPERCUBE_ROLE.VERTEX,
        -1,
        seed,
        0.48 + seed * 0.62,
        vertexIndex,
        vertexIndex,
        0,
      )
    }
  })

  for (let i = 0; i < HYPERCUBE_COUNTS.dust; i++) {
    const index = HYPERCUBE_COUNTS.edge + HYPERCUBE_COUNTS.vertex + i
    const seed = hash(index, 11.3)
    const radius = 0.78 + hash(index, 11.9) * 0.18
    add(
      signedHash(index, 12.5) * radius,
      signedHash(index, 13.1) * radius,
      signedHash(index, 13.7) * radius,
      signedHash(index, 14.3) * radius,
      HYPERCUBE_ROLE.DUST,
      4,
      seed,
      0.12 + seed * 0.2,
      -1,
      -1,
      seed,
    )
  }

  return {
    count: write,
    vertexCount: HYPERCUBE_VERTICES_4D.length,
    edgeCount: HYPERCUBE_EDGES_4D.length,
    coordinates4d,
    initialProjection,
    roles,
    axes,
    seeds,
    sizes,
    vertexA,
    vertexB,
    edgeProgress,
  }
}
