import { describe, expect, it } from 'vitest'
import { generateSpiralGeometry, goldenSpiralRadius } from './generateSpiralGeometry'
import { SPIRAL_COUNTS, SPIRAL_ROLE, SPIRAL_STRUCTURE } from './spiralTypes'

describe('golden spiral geometry', () => {
  it('builds the core, four filaments, growth front, and scale dust', () => {
    const geometry = generateSpiralGeometry()
    expect(geometry.count).toBe(SPIRAL_COUNTS.total)
    expect(geometry.basePositions).toHaveLength(SPIRAL_COUNTS.total * 3)
    for (const attribute of [geometry.roles, geometry.filaments, geometry.progress, geometry.nodes, geometry.seeds, geometry.sizes]) {
      expect(attribute).toHaveLength(SPIRAL_COUNTS.total)
    }
    expect(Array.from(geometry.roles).filter((role) => role === SPIRAL_ROLE.CORE)).toHaveLength(SPIRAL_COUNTS.core)
    expect(Array.from(geometry.roles).filter((role) => role === SPIRAL_ROLE.FILAMENT)).toHaveLength(SPIRAL_COUNTS.filament)
    expect(Array.from(geometry.roles).filter((role) => role === SPIRAL_ROLE.FRONT)).toHaveLength(SPIRAL_COUNTS.front)
    expect(Array.from(geometry.roles).filter((role) => role === SPIRAL_ROLE.DUST)).toHaveLength(SPIRAL_COUNTS.dust)
    expect(new Set(Array.from(geometry.filaments).filter((filament) => filament >= 0))).toEqual(new Set([0, 1, 2, 3]))
    expect(new Set(Array.from(geometry.nodes).filter((node) => node >= 0)).size).toBe(SPIRAL_COUNTS.scaleNodeCount)
  })

  it('uses a monotonic normalized golden logarithmic radius', () => {
    let previous = goldenSpiralRadius(0)
    for (let step = 1; step <= 100; step++) {
      const radius = goldenSpiralRadius(step / 100)
      expect(radius).toBeGreaterThan(previous)
      previous = radius
    }
    expect(goldenSpiralRadius(1)).toBeCloseTo(SPIRAL_STRUCTURE.maxRadius, 8)
    const quarterTurnProgress = 1 / (SPIRAL_STRUCTURE.turns * 4)
    expect(goldenSpiralRadius(0.5 + quarterTurnProgress) / goldenSpiralRadius(0.5)).toBeCloseTo(SPIRAL_STRUCTURE.phi, 8)
  })

  it('is deterministic and finite', () => {
    const first = generateSpiralGeometry()
    const second = generateSpiralGeometry()
    expect(second.basePositions).toEqual(first.basePositions)
    expect(second.progress).toEqual(first.progress)
    for (const attribute of [first.basePositions, first.roles, first.filaments, first.progress, first.nodes, first.seeds, first.sizes]) {
      expect(Array.from(attribute).every(Number.isFinite)).toBe(true)
    }
  })
})
