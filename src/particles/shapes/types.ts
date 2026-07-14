export type ParticleShape =
  | 'quantum_sphere'
  | 'knot_torus'
  | 'saturn_ring'
  | 'dna_helix'
  | 'golden_spiral'
  | 'hypercube'
  | 'galaxy'
  | 'singularity'

export type SceneTier = 'featured' | 'lab'

export interface ShapeOption {
  id: ParticleShape
  label: string
  hint: string
  accent: string
  tier: SceneTier
  featuredOrder?: 1 | 2 | 3 | 4
}
