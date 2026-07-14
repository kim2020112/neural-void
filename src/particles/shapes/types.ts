export type ParticleShape =
  | 'saturn_ring'
  | 'dna_helix'
  | 'hypercube'
  | 'singularity'
  | 'quantum_sphere'
  | 'knot_torus'
  | 'golden_spiral'
  | 'galaxy'

export interface ShapeOption {
  id: ParticleShape
  label: string
  hint: string
  accent: string
  featuredOrder: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
}
