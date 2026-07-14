import { describe, expect, it } from 'vitest'
import { generateKnotGeometry, sampleKnotPoint } from './generateKnotGeometry'
import { KNOT_COUNTS, KNOT_ROLE } from './knotTypes'

describe('knot geometry', () => {
  it('builds three strands, crossing hotspots, and propagation sparks', () => {
    const geometry = generateKnotGeometry()
    expect(geometry.count).toBe(KNOT_COUNTS.total)
    expect(geometry.basePositions).toHaveLength(KNOT_COUNTS.total * 3)
    expect(geometry.offsets).toHaveLength(KNOT_COUNTS.total * 3)
    for (const attribute of [geometry.roles, geometry.strands, geometry.parameters, geometry.seeds, geometry.sizes]) {
      expect(attribute).toHaveLength(KNOT_COUNTS.total)
    }
    expect(Array.from(geometry.roles).filter((role) => role === KNOT_ROLE.STRAND)).toHaveLength(KNOT_COUNTS.strand)
    expect(Array.from(geometry.roles).filter((role) => role === KNOT_ROLE.HOTSPOT)).toHaveLength(KNOT_COUNTS.hotspot)
    expect(Array.from(geometry.roles).filter((role) => role === KNOT_ROLE.SPARK)).toHaveLength(KNOT_COUNTS.spark)
    expect(new Set(Array.from(geometry.strands))).toEqual(new Set([0, 1, 2]))
  })

  it('closes every p=2 q=3 phase-offset strand', () => {
    for (let strand = 0; strand < KNOT_COUNTS.strandCount; strand++) {
      const start = { x: 0, y: 0, z: 0 }
      const end = { x: 0, y: 0, z: 0 }
      sampleKnotPoint(0, strand, 1, start)
      sampleKnotPoint(1, strand, 1, end)
      expect(Math.hypot(start.x - end.x, start.y - end.y, start.z - end.z)).toBeLessThan(1e-10)
    }
  })

  it('is deterministic and finite', () => {
    const first = generateKnotGeometry()
    const second = generateKnotGeometry()
    expect(second.basePositions).toEqual(first.basePositions)
    expect(second.parameters).toEqual(first.parameters)
    for (const attribute of [
      first.basePositions,
      first.offsets,
      first.roles,
      first.strands,
      first.parameters,
      first.seeds,
      first.sizes,
    ]) {
      expect(Array.from(attribute).every(Number.isFinite)).toBe(true)
    }
  })
})
