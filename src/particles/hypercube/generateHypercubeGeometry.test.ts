import { describe, expect, it } from 'vitest'
import {
  generateHypercubeGeometry,
  projectHypercubePoint,
} from './generateHypercubeGeometry'
import {
  HYPERCUBE_COUNTS,
  HYPERCUBE_EDGES_4D,
  HYPERCUBE_ROLE,
  HYPERCUBE_VERTICES_4D,
} from './hypercubeTypes'

describe('hypercube geometry', () => {
  it('builds the required vertices, edges, particles, and attribute lengths', () => {
    const geometry = generateHypercubeGeometry()

    expect(HYPERCUBE_VERTICES_4D).toHaveLength(16)
    expect(HYPERCUBE_EDGES_4D).toHaveLength(32)
    expect(geometry.count).toBe(14400)
    expect(geometry.vertexCount).toBe(16)
    expect(geometry.edgeCount).toBe(32)
    expect(geometry.coordinates4d).toHaveLength(HYPERCUBE_COUNTS.total * 4)
    expect(geometry.initialProjection).toHaveLength(HYPERCUBE_COUNTS.total * 3)

    for (const attribute of [
      geometry.roles,
      geometry.axes,
      geometry.seeds,
      geometry.sizes,
      geometry.vertexA,
      geometry.vertexB,
      geometry.edgeProgress,
    ]) {
      expect(attribute).toHaveLength(HYPERCUBE_COUNTS.total)
    }

    expect(Array.from(geometry.roles).filter((role) => role === HYPERCUBE_ROLE.EDGE)).toHaveLength(10240)
    expect(Array.from(geometry.roles).filter((role) => role === HYPERCUBE_ROLE.VERTEX)).toHaveLength(2560)
    expect(Array.from(geometry.roles).filter((role) => role === HYPERCUBE_ROLE.DUST)).toHaveLength(1600)
  })

  it('creates only four-dimensional unit-cube edges', () => {
    for (const [startIndex, endIndex, axis] of HYPERCUBE_EDGES_4D) {
      const start = HYPERCUBE_VERTICES_4D[startIndex]
      const end = HYPERCUBE_VERTICES_4D[endIndex]
      const changedAxes = start
        .map((value, index) => Number(value !== end[index]))
        .reduce((sum, value) => sum + value, 0)
      expect(changedAxes).toBe(1)
      expect(start[axis]).not.toBe(end[axis])
    }
  })

  it('is deterministic and finite', () => {
    const first = generateHypercubeGeometry()
    const second = generateHypercubeGeometry()

    expect(second.coordinates4d).toEqual(first.coordinates4d)
    expect(second.initialProjection).toEqual(first.initialProjection)
    for (const attribute of [
      first.coordinates4d,
      first.initialProjection,
      first.roles,
      first.axes,
      first.seeds,
      first.sizes,
    ]) {
      expect(Array.from(attribute).every(Number.isFinite)).toBe(true)
    }
  })

  it('projects finite coordinates across configured angles and fourth-dimension scales', () => {
    const output = { x: 0, y: 0, z: 0 }
    const angles = [-Math.PI, -0.42, 0, 0.67, Math.PI]
    const scales = [0.25, 0.35, 1, 1.25, 1.35]

    for (const vertex of HYPERCUBE_VERTICES_4D) {
      for (const angleXW of angles) {
        for (const angleYW of angles) {
          for (const scale of scales) {
            projectHypercubePoint(vertex, angleXW, angleYW, scale, output)
            expect([output.x, output.y, output.z].every(Number.isFinite)).toBe(true)
          }
        }
      }
    }
  })
})
