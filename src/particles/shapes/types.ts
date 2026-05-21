export type ParticleShape =
  | 'quantum_sphere'
  | 'knot_torus'
  | 'saturn_ring'
  | 'dna_helix'
  | 'golden_spiral'
  | 'hypercube'
  | 'galaxy'
  | 'singularity'

export interface ShapeOption {
  id: ParticleShape
  label: string
  hint: string
  accent: string
}