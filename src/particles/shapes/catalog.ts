import type { ParticleShape, ShapeOption } from './types'

export const DEFAULT_PARTICLE_SHAPE: ParticleShape = 'saturn_ring'

export const SHAPE_OPTIONS: ShapeOption[] = [
  { id: 'saturn_ring', label: '土星环', hint: '蓝色星体与多层金色环带', accent: '#ffb21c' },
  { id: 'quantum_sphere', label: '能量球', hint: '致密中心与环形粒子层', accent: '#d8f3ff' },
  { id: 'knot_torus', label: '能量纽结', hint: '彼此缠绕的环形粒子流', accent: '#f3d27a' },
  { id: 'dna_helix', label: '双螺旋', hint: '两条相互缠绕的粒子链', accent: '#8de7ff' },
  { id: 'golden_spiral', label: '黄金螺旋', hint: '沿对数曲线生长的粒子流', accent: '#ffd36b' },
  { id: 'hypercube', label: '四维立方', hint: '高维结构的三维投影', accent: '#7dc9ff' },
  { id: 'galaxy', label: '旋臂星系', hint: '明亮中心与双旋臂结构', accent: '#7ae0ff' },
  { id: 'singularity', label: '引力奇点', hint: '吸积盘与双向粒子喷流', accent: '#f9fbff' },
]
