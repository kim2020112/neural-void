import { describe, expect, it } from 'vitest'
import { galaxyArmAngle, generateGalaxyGeometry } from './generateGalaxyGeometry'
import { GALAXY_COUNTS, GALAXY_ROLE } from './galaxyTypes'

function wrappedAngleDifference(first: number, second: number) {
  const difference = Math.abs(first - second) % (Math.PI * 2)
  return Math.min(difference, Math.PI * 2 - difference)
}

describe('galaxy geometry', () => {
  it('builds the bulge, disk, two arms, dust bands, and halo', () => {
    const geometry = generateGalaxyGeometry()
    expect(geometry.count).toBe(GALAXY_COUNTS.total)
    expect(geometry.basePositions).toHaveLength(GALAXY_COUNTS.total * 3)
    for (const attribute of [geometry.roles, geometry.arms, geometry.radii, geometry.seeds, geometry.sizes, geometry.temperatures]) {
      expect(attribute).toHaveLength(GALAXY_COUNTS.total)
    }
    expect(Array.from(geometry.roles).filter((role) => role === GALAXY_ROLE.BULGE)).toHaveLength(GALAXY_COUNTS.bulge)
    expect(Array.from(geometry.roles).filter((role) => role === GALAXY_ROLE.DISK)).toHaveLength(GALAXY_COUNTS.disk)
    expect(Array.from(geometry.roles).filter((role) => role === GALAXY_ROLE.ARM)).toHaveLength(GALAXY_COUNTS.arm)
    expect(Array.from(geometry.roles).filter((role) => role === GALAXY_ROLE.DUST)).toHaveLength(GALAXY_COUNTS.dust)
    expect(Array.from(geometry.roles).filter((role) => role === GALAXY_ROLE.HALO)).toHaveLength(GALAXY_COUNTS.halo)
  })

  it('keeps the logarithmic arms phase-separated by pi', () => {
    for (const radius of [0, 0.1, 0.35, 0.72, 1]) {
      expect(wrappedAngleDifference(galaxyArmAngle(radius, 0), galaxyArmAngle(radius, 1))).toBeCloseTo(Math.PI, 10)
    }
  })

  it('is deterministic and finite', () => {
    const first = generateGalaxyGeometry()
    const second = generateGalaxyGeometry()
    expect(second.basePositions).toEqual(first.basePositions)
    expect(second.arms).toEqual(first.arms)
    for (const attribute of [first.basePositions, first.roles, first.arms, first.radii, first.seeds, first.sizes, first.temperatures]) {
      expect(Array.from(attribute).every(Number.isFinite)).toBe(true)
    }
  })
})
