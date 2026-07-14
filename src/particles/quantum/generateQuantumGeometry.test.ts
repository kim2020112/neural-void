import { describe, expect, it } from 'vitest'
import { generateQuantumGeometry } from './generateQuantumGeometry'
import { QUANTUM_COUNTS, QUANTUM_ROLE } from './quantumTypes'

function radiusAt(positions: Float32Array, index: number) {
  const offset = index * 3
  return Math.hypot(positions[offset], positions[offset + 1], positions[offset + 2])
}

describe('quantum geometry', () => {
  it('builds the exact role distribution and attribute lengths', () => {
    const geometry = generateQuantumGeometry()
    expect(geometry.count).toBe(QUANTUM_COUNTS.total)
    expect(geometry.basePositions).toHaveLength(QUANTUM_COUNTS.total * 3)
    for (const attribute of [geometry.roles, geometry.layers, geometry.seeds, geometry.sizes, geometry.progress]) {
      expect(attribute).toHaveLength(QUANTUM_COUNTS.total)
    }
    expect(Array.from(geometry.roles).filter((role) => role === QUANTUM_ROLE.CORE)).toHaveLength(QUANTUM_COUNTS.core)
    expect(Array.from(geometry.roles).filter((role) => role === QUANTUM_ROLE.INNER_SHELL)).toHaveLength(QUANTUM_COUNTS.innerShell)
    expect(Array.from(geometry.roles).filter((role) => role === QUANTUM_ROLE.OUTER_SHELL)).toHaveLength(QUANTUM_COUNTS.outerShell)
    expect(Array.from(geometry.roles).filter((role) => role === QUANTUM_ROLE.ORBIT)).toHaveLength(QUANTUM_COUNTS.orbit)
    expect(Array.from(geometry.roles).filter((role) => role === QUANTUM_ROLE.PULSE)).toHaveLength(QUANTUM_COUNTS.pulse)
  })

  it('keeps the core, Fibonacci shells, and orbit planes radially separated', () => {
    const geometry = generateQuantumGeometry()
    const radii: Record<number, number[]> = {}
    for (let index = 0; index < geometry.count; index++) {
      const role = geometry.roles[index]
      ;(radii[role] ??= []).push(radiusAt(geometry.basePositions, index))
    }
    expect(Math.max(...radii[QUANTUM_ROLE.CORE])).toBeLessThan(1.19)
    expect(Math.min(...radii[QUANTUM_ROLE.INNER_SHELL])).toBeGreaterThan(2.47)
    expect(Math.max(...radii[QUANTUM_ROLE.INNER_SHELL])).toBeLessThan(2.69)
    expect(Math.min(...radii[QUANTUM_ROLE.OUTER_SHELL])).toBeGreaterThan(3.47)
    expect(Math.max(...radii[QUANTUM_ROLE.OUTER_SHELL])).toBeLessThan(3.77)
    expect(Math.min(...radii[QUANTUM_ROLE.ORBIT])).toBeGreaterThan(3.7)
    expect(new Set(Array.from(geometry.layers).slice(-QUANTUM_COUNTS.pulse - QUANTUM_COUNTS.orbit, -QUANTUM_COUNTS.pulse))).toEqual(new Set([0, 1, 2]))
  })

  it('is deterministic and finite', () => {
    const first = generateQuantumGeometry()
    const second = generateQuantumGeometry()
    expect(second.basePositions).toEqual(first.basePositions)
    expect(second.roles).toEqual(first.roles)
    for (const attribute of [
      first.basePositions,
      first.roles,
      first.layers,
      first.seeds,
      first.sizes,
      first.progress,
    ]) {
      expect(Array.from(attribute).every(Number.isFinite)).toBe(true)
    }
  })
})
