import { describe, expect, it } from 'vitest'
import * as catalog from './catalog'
import { SHAPE_OPTIONS } from './catalog'

describe('scene catalog', () => {
  it('contains eight official scenes without derived lab exports', () => {
    expect(SHAPE_OPTIONS).toHaveLength(8)
    expect('FEATURED_SHAPE_OPTIONS' in catalog).toBe(false)
    expect('LAB_SHAPE_OPTIONS' in catalog).toBe(false)
    expect(SHAPE_OPTIONS.every((shape) => !('tier' in shape))).toBe(true)
  })

  it('keeps the S-01 through S-08 order stable', () => {
    expect(SHAPE_OPTIONS.map((shape) => shape.id)).toEqual([
      'saturn_ring',
      'dna_helix',
      'hypercube',
      'singularity',
      'quantum_sphere',
      'knot_torus',
      'golden_spiral',
      'galaxy',
    ])
    expect(SHAPE_OPTIONS.map((shape) => shape.featuredOrder)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })
})
