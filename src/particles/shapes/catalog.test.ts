import { describe, expect, it } from 'vitest'
import {
  FEATURED_SHAPE_OPTIONS,
  LAB_SHAPE_OPTIONS,
  SHAPE_OPTIONS,
} from './catalog'

describe('scene catalog', () => {
  it('contains four featured scenes and four lab scenes', () => {
    expect(SHAPE_OPTIONS).toHaveLength(8)
    expect(FEATURED_SHAPE_OPTIONS).toHaveLength(4)
    expect(LAB_SHAPE_OPTIONS).toHaveLength(4)
  })

  it('keeps the featured order stable', () => {
    expect(FEATURED_SHAPE_OPTIONS.map((shape) => shape.id)).toEqual([
      'saturn_ring',
      'dna_helix',
      'hypercube',
      'singularity',
    ])
    expect(FEATURED_SHAPE_OPTIONS.map((shape) => shape.featuredOrder)).toEqual([1, 2, 3, 4])
  })
})
