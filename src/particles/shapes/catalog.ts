import type { ParticleShape, ShapeOption } from './types'

export const DEFAULT_PARTICLE_SHAPE: ParticleShape = 'saturn_ring'

export const SHAPE_OPTIONS: readonly ShapeOption[] = [
  { id: 'saturn_ring', label: '土星环', hint: '蓝色星体与多层金色环带', accent: '#ffb21c', tier: 'featured', featuredOrder: 1 },
  { id: 'dna_helix', label: '双螺旋', hint: '配对序列与复制解旋光带', accent: '#8de7ff', tier: 'featured', featuredOrder: 2 },
  { id: 'hypercube', label: '四维立方', hint: '高维结构的三维投影', accent: '#7dc9ff', tier: 'featured', featuredOrder: 3 },
  { id: 'singularity', label: '引力奇点', hint: '吸积盘与双向粒子喷流', accent: '#f9fbff', tier: 'featured', featuredOrder: 4 },
  { id: 'quantum_sphere', label: '能量球', hint: '致密中心与环形粒子层', accent: '#d8f3ff', tier: 'lab' },
  { id: 'knot_torus', label: '能量纽结', hint: '彼此缠绕的环形粒子流', accent: '#f3d27a', tier: 'lab' },
  { id: 'golden_spiral', label: '黄金螺旋', hint: '沿对数曲线生长的粒子流', accent: '#ffd36b', tier: 'lab' },
  { id: 'galaxy', label: '旋臂星系', hint: '明亮中心与双旋臂结构', accent: '#7ae0ff', tier: 'lab' },
]

export const FEATURED_SHAPE_OPTIONS = SHAPE_OPTIONS
  .filter((shape) => shape.tier === 'featured')
  .sort((a, b) => (a.featuredOrder ?? 0) - (b.featuredOrder ?? 0))

export const LAB_SHAPE_OPTIONS = SHAPE_OPTIONS.filter((shape) => shape.tier === 'lab')
