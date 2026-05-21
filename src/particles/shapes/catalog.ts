import type { ParticleShape, ShapeOption } from './types'

export const DEFAULT_PARTICLE_SHAPE: ParticleShape = 'saturn_ring'

export const SHAPE_OPTIONS: ShapeOption[] = [
  { id: 'quantum_sphere', label: '量子球', hint: '多层量子壳与呼吸核', accent: '#d8f3ff' },
  { id: 'knot_torus', label: '纽结环', hint: '自缠绕能量环流', accent: '#f3d27a' },
  { id: 'saturn_ring', label: '土星环', hint: '暖金主环与冷核尘带', accent: '#ffcc55' },
  { id: 'dna_helix', label: 'DNA 链', hint: '双链结构与桥接粒子', accent: '#8de7ff' },
  { id: 'golden_spiral', label: '黄金螺旋', hint: '对数生长的星际流', accent: '#ffd36b' },
  { id: 'hypercube', label: '超立方', hint: '四维投影骨架', accent: '#7dc9ff' },
  { id: 'galaxy', label: '银河旋臂', hint: '核团、旋臂与外晕', accent: '#7ae0ff' },
  { id: 'singularity', label: '奇点核心', hint: '吸积盘、喷流与事件核', accent: '#f9fbff' },
]