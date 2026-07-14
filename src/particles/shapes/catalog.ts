import type { ParticleShape, ShapeOption } from './types'

export const DEFAULT_PARTICLE_SHAPE: ParticleShape = 'saturn_ring'

export const SHAPE_OPTIONS: readonly ShapeOption[] = [
  { id: 'saturn_ring', label: '土星环', hint: '蓝色星体与多层金色环带', accent: '#ffb21c', featuredOrder: 1 },
  { id: 'dna_helix', label: '双螺旋', hint: '配对序列与复制解旋光带', accent: '#8de7ff', featuredOrder: 2 },
  { id: 'hypercube', label: '四维立方', hint: '高维结构的三维投影', accent: '#7dc9ff', featuredOrder: 3 },
  { id: 'singularity', label: '引力奇点', hint: '吸积盘与双向粒子喷流', accent: '#f9fbff', featuredOrder: 4 },
  { id: 'quantum_sphere', label: '能量球', hint: '双层球壳与交错能量轨道', accent: '#42ddff', featuredOrder: 5 },
  { id: 'knot_torus', label: '能量纽结', hint: '三股闭合纽结与传播热点', accent: '#ff9f45', featuredOrder: 6 },
  { id: 'golden_spiral', label: '黄金螺旋', hint: '黄金比例生长与尺度节点', accent: '#d9ff47', featuredOrder: 7 },
  { id: 'galaxy', label: '旋臂星系', hint: '差速旋转的双臂与尘埃带', accent: '#ff6f78', featuredOrder: 8 },
]
