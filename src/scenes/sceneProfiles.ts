import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import { SATURN_BLOOM, SATURN_CAMERA, SATURN_COUNTS } from '../particles/saturn/saturnTypes'
import { DNA_BLOOM, DNA_CAMERA, DNA_COUNTS } from '../particles/dna/dnaTypes'
import {
  SINGULARITY_BLOOM,
  SINGULARITY_CAMERA,
  SINGULARITY_COUNTS,
} from '../particles/singularity/singularityTypes'
import {
  HYPERCUBE_BLOOM,
  HYPERCUBE_CAMERA,
  HYPERCUBE_COUNTS,
} from '../particles/hypercube/hypercubeTypes'
import { QUANTUM_BLOOM, QUANTUM_CAMERA, QUANTUM_COUNTS } from '../particles/quantum/quantumTypes'
import { KNOT_BLOOM, KNOT_CAMERA, KNOT_COUNTS } from '../particles/knot/knotTypes'
import { SPIRAL_BLOOM, SPIRAL_CAMERA, SPIRAL_COUNTS } from '../particles/spiral/spiralTypes'
import { GALAXY_BLOOM, GALAXY_CAMERA, GALAXY_COUNTS } from '../particles/galaxy/galaxyTypes'
import type { ParticleShape } from '../particles/shapes/types'
import type { InteractionMode } from '../store/appStore'

interface LazySceneRenderer {
  Renderer: LazyExoticComponent<ComponentType>
  preload: () => Promise<void>
}

function defineLazyRenderer<TModule>(
  loadModule: () => Promise<TModule>,
  select: (module: TModule) => ComponentType,
): LazySceneRenderer {
  let promise: Promise<{ default: ComponentType }> | undefined
  const load = () => {
    promise ??= loadModule()
      .then((module) => ({ default: select(module) }))
      .catch((error: unknown) => {
        promise = undefined
        throw error
      })
    return promise
  }

  return {
    Renderer: lazy(load),
    preload: async () => { await load() },
  }
}

const saturnRenderer = defineLazyRenderer(
  () => import('../particles/saturn/SaturnSystem'),
  (module) => module.SaturnSystem,
)
const dnaRenderer = defineLazyRenderer(
  () => import('../particles/dna/DnaSystem'),
  (module) => module.DnaSystem,
)
const singularityRenderer = defineLazyRenderer(
  () => import('../particles/singularity/SingularitySystem'),
  (module) => module.SingularitySystem,
)
const hypercubeRenderer = defineLazyRenderer(
  () => import('../particles/hypercube/HypercubeSystem'),
  (module) => module.HypercubeSystem,
)
const quantumRenderer = defineLazyRenderer(
  () => import('../particles/quantum/QuantumSystem'),
  (module) => module.QuantumSystem,
)
const knotRenderer = defineLazyRenderer(
  () => import('../particles/knot/KnotSystem'),
  (module) => module.KnotSystem,
)
const spiralRenderer = defineLazyRenderer(
  () => import('../particles/spiral/SpiralSystem'),
  (module) => module.SpiralSystem,
)
const galaxyRenderer = defineLazyRenderer(
  () => import('../particles/galaxy/GalaxySystem'),
  (module) => module.GalaxySystem,
)

const SCENE_PRELOADERS: Record<ParticleShape, () => Promise<void>> = {
  saturn_ring: saturnRenderer.preload,
  dna_helix: dnaRenderer.preload,
  hypercube: hypercubeRenderer.preload,
  singularity: singularityRenderer.preload,
  quantum_sphere: quantumRenderer.preload,
  knot_torus: knotRenderer.preload,
  golden_spiral: spiralRenderer.preload,
  galaxy: galaxyRenderer.preload,
}

export interface CameraPose {
  position: readonly [number, number, number]
  lookAt: readonly [number, number, number]
  fov: number
  sway: number
  lift: number
  depth: number
}

export interface BloomProfile {
  threshold: number
  smoothing: number
  intensity: number
  radius: number
}

export interface AtmosphereProfile {
  focus: number
  count: number
  pulseScale: number
  energyBase: number
  energyScale: number
  turbulenceBase: number
  turbulenceScale: number
  rotationSpeed: number
  rotationTilt: number
  verticalDrift: number
}

interface PostProfile {
  bloom?: BloomProfile
  bloomBias: number
  contrastBias: number
  brightnessBias: number
  vignetteBias: number
}

export interface GestureHudProfile {
  cn: string
  en: string
  color: string
}

export interface SceneHudProfile {
  index: string
  code: string
  title: string
  titleEn: string
  particleCount: number
  controlLabel: string
  structureCount: number
  structureLabel: string
  diagram: 'orbit' | 'dna' | 'hypercube' | 'singularity' | 'quantum' | 'knot' | 'spiral' | 'galaxy'
  description: readonly string[]
  interactions: Record<InteractionMode, GestureHudProfile>
}

export interface SceneProfile {
  id: ParticleShape
  Renderer: ComponentType | LazyExoticComponent<ComponentType>
  camera: CameraPose
  heroCamera?: CameraPose
  fogDensity: number
  post: PostProfile
  atmosphere: AtmosphereProfile
  hud?: SceneHudProfile
}

const saturnCamera: CameraPose = {
  position: SATURN_CAMERA.position,
  lookAt: SATURN_CAMERA.lookAt,
  fov: SATURN_CAMERA.fov,
  sway: SATURN_CAMERA.driftX,
  lift: SATURN_CAMERA.driftY,
  depth: SATURN_CAMERA.driftZ,
}

const singularityCamera: CameraPose = {
  position: SINGULARITY_CAMERA.position,
  lookAt: SINGULARITY_CAMERA.lookAt,
  fov: SINGULARITY_CAMERA.fov,
  sway: SINGULARITY_CAMERA.driftX,
  lift: SINGULARITY_CAMERA.driftY,
  depth: SINGULARITY_CAMERA.driftZ,
}

const hypercubeCamera: CameraPose = {
  position: HYPERCUBE_CAMERA.position,
  lookAt: HYPERCUBE_CAMERA.lookAt,
  fov: HYPERCUBE_CAMERA.fov,
  sway: HYPERCUBE_CAMERA.driftX,
  lift: HYPERCUBE_CAMERA.driftY,
  depth: HYPERCUBE_CAMERA.driftZ,
}

const quantumCamera: CameraPose = {
  position: QUANTUM_CAMERA.position,
  lookAt: QUANTUM_CAMERA.lookAt,
  fov: QUANTUM_CAMERA.fov,
  sway: QUANTUM_CAMERA.driftX,
  lift: QUANTUM_CAMERA.driftY,
  depth: QUANTUM_CAMERA.driftZ,
}

const knotCamera: CameraPose = {
  position: KNOT_CAMERA.position,
  lookAt: KNOT_CAMERA.lookAt,
  fov: KNOT_CAMERA.fov,
  sway: KNOT_CAMERA.driftX,
  lift: KNOT_CAMERA.driftY,
  depth: KNOT_CAMERA.driftZ,
}

const spiralCamera: CameraPose = {
  position: SPIRAL_CAMERA.position,
  lookAt: SPIRAL_CAMERA.lookAt,
  fov: SPIRAL_CAMERA.fov,
  sway: SPIRAL_CAMERA.driftX,
  lift: SPIRAL_CAMERA.driftY,
  depth: SPIRAL_CAMERA.driftZ,
}

const galaxyCamera: CameraPose = {
  position: GALAXY_CAMERA.position,
  lookAt: GALAXY_CAMERA.lookAt,
  fov: GALAXY_CAMERA.fov,
  sway: GALAXY_CAMERA.driftX,
  lift: GALAXY_CAMERA.driftY,
  depth: GALAXY_CAMERA.driftZ,
}

export const SCENE_PROFILES: Record<ParticleShape, SceneProfile> = {
  saturn_ring: {
    id: 'saturn_ring',
    Renderer: saturnRenderer.Renderer,
    camera: saturnCamera,
    heroCamera: saturnCamera,
    fogDensity: 0.012,
    post: {
      bloom: SATURN_BLOOM,
      bloomBias: 0,
      contrastBias: 0.05,
      brightnessBias: -0.015,
      vignetteBias: 0.06,
    },
    atmosphere: {
      focus: 1,
      count: 220,
      pulseScale: 0.35,
      energyBase: 0.06,
      energyScale: 0.04,
      turbulenceBase: 0.04,
      turbulenceScale: 0,
      rotationSpeed: 0.004,
      rotationTilt: 0.01,
      verticalDrift: 0.05,
    },
    hud: {
      index: '01',
      code: 'S-01 / ORBITAL FORGE',
      title: '土星环',
      titleEn: 'SATURN RING',
      particleCount: SATURN_COUNTS.total,
      controlLabel: 'RING CONTROL',
      structureCount: 5,
      structureLabel: 'RING BANDS',
      diagram: 'orbit',
      description: ['环绕旋转的粒子带', '模拟土星环的引力结构', '与带状物质分布'],
      interactions: {
        idle: { cn: '待机', en: 'STABLE ORBIT', color: '#9bdfff' },
        attract: { cn: '握拳压缩', en: 'ORBITAL COMPRESS', color: '#ffb21c' },
        repel: { cn: '掌心扩张', en: 'ORBITAL BLOOM', color: '#72e6ff' },
        point: { cn: '指尖牵引', en: 'LOCAL TRACTOR', color: '#ffe07d' },
        duality: { cn: '双手联动', en: 'DUAL FIELD', color: '#ffd36b' },
        forming_void: { cn: '核心聚能', en: 'CORE CHARGING', color: '#ffb21c' },
        void_core: { cn: '核心稳定', en: 'CORE LOCKED', color: '#e8faff' },
        exploding: { cn: '轨道爆发', en: 'ORBITAL DISCHARGE', color: '#ff7d3d' },
      },
    },
  },
  quantum_sphere: {
    id: 'quantum_sphere',
    Renderer: quantumRenderer.Renderer,
    camera: quantumCamera,
    heroCamera: quantumCamera,
    fogDensity: 0.0075,
    post: {
      bloom: QUANTUM_BLOOM,
      bloomBias: 0,
      contrastBias: 0.052,
      brightnessBias: -0.022,
      vignetteBias: 0.05,
    },
    atmosphere: {
      focus: 0.86,
      count: 150,
      pulseScale: 0.42,
      energyBase: 0.03,
      energyScale: 0.05,
      turbulenceBase: 0.022,
      turbulenceScale: 0.035,
      rotationSpeed: 0.003,
      rotationTilt: 0.008,
      verticalDrift: 0.03,
    },
    hud: {
      index: '05',
      code: 'S-05 / QUANTUM CORE',
      title: '能量球',
      titleEn: 'QUANTUM SPHERE',
      particleCount: QUANTUM_COUNTS.total,
      controlLabel: 'FIELD CONTROL',
      structureCount: 5,
      structureLabel: 'ENERGY LAYERS',
      diagram: 'quantum',
      description: ['致密核心被双层 Fibonacci 球壳包围', '三组轨道沿交错平面持续旋进', '能量波由核心穿过壳层向外传播'],
      interactions: {
        idle: { cn: '稳定振荡', en: 'FIELD EQUILIBRIUM', color: '#42ddff' },
        attract: { cn: '握拳压缩', en: 'SHELL COMPRESSION', color: '#9a7dff' },
        repel: { cn: '掌心脉冲', en: 'RADIAL PULSE', color: '#65ffbd' },
        point: { cn: '局部透镜', en: 'LOCAL LENS', color: '#ff706a' },
        duality: { cn: '双手定标', en: 'DUAL SCALE FIELD', color: '#c7f6ff' },
        forming_void: { cn: '核心聚能', en: 'CORE CHARGING', color: '#9a7dff' },
        void_core: { cn: '量子锁定', en: 'QUANTUM LOCKED', color: '#f6fdff' },
        exploding: { cn: '壳层爆发', en: 'SHELL DISCHARGE', color: '#ff706a' },
      },
    },
  },
  knot_torus: {
    id: 'knot_torus',
    Renderer: knotRenderer.Renderer,
    camera: knotCamera,
    heroCamera: knotCamera,
    fogDensity: 0.007,
    post: {
      bloom: KNOT_BLOOM,
      bloomBias: 0,
      contrastBias: 0.06,
      brightnessBias: -0.024,
      vignetteBias: 0.052,
    },
    atmosphere: {
      focus: 0.8,
      count: 135,
      pulseScale: 0.35,
      energyBase: 0.025,
      energyScale: 0.042,
      turbulenceBase: 0.028,
      turbulenceScale: 0.05,
      rotationSpeed: 0.0026,
      rotationTilt: 0.007,
      verticalDrift: 0.026,
    },
    hud: {
      index: '06',
      code: 'S-06 / ENTANGLED FLOW',
      title: '能量纽结',
      titleEn: 'TORUS KNOT',
      particleCount: KNOT_COUNTS.total,
      controlLabel: 'FLOW CONTROL',
      structureCount: 3,
      structureLabel: 'PHASE STRANDS',
      diagram: 'knot',
      description: ['三股相位错位轨迹形成闭合纽结', '六处投影交叉点保持高能亮度', '传播火花沿曲线参数双向推进'],
      interactions: {
        idle: { cn: '相位巡航', en: 'PHASE DRIFT', color: '#ffae45' },
        attract: { cn: '握拳收紧', en: 'KNOT TIGHTEN', color: '#ff7b3d' },
        repel: { cn: '掌心展开', en: 'STRAND UNFOLD', color: '#27e5ff' },
        point: { cn: '曲线传播', en: 'PATH PROPAGATION', color: '#ff63bd' },
        duality: { cn: '双手展幅', en: 'DUAL SPAN', color: '#ffd071' },
        forming_void: { cn: '流场聚能', en: 'FLOW CHARGING', color: '#ff8f45' },
        void_core: { cn: '纽结锁定', en: 'KNOT LOCKED', color: '#fff8e5' },
        exploding: { cn: '拓扑释放', en: 'TOPOLOGY BURST', color: '#ff63bd' },
      },
    },
  },
  dna_helix: {
    id: 'dna_helix',
    Renderer: dnaRenderer.Renderer,
    camera: {
      position: DNA_CAMERA.position,
      lookAt: DNA_CAMERA.lookAt,
      fov: DNA_CAMERA.fov,
      sway: DNA_CAMERA.driftX,
      lift: DNA_CAMERA.driftY,
      depth: DNA_CAMERA.driftZ,
    },
    heroCamera: {
      position: DNA_CAMERA.position,
      lookAt: DNA_CAMERA.lookAt,
      fov: DNA_CAMERA.fov,
      sway: DNA_CAMERA.driftX,
      lift: DNA_CAMERA.driftY,
      depth: DNA_CAMERA.driftZ,
    },
    fogDensity: 0.008,
    post: {
      bloom: DNA_BLOOM,
      bloomBias: 0,
      contrastBias: 0.055,
      brightnessBias: -0.024,
      vignetteBias: 0.055,
    },
    atmosphere: {
      focus: 0.75,
      count: 180,
      pulseScale: 0.4,
      energyBase: 0.035,
      energyScale: 0.06,
      turbulenceBase: 0.025,
      turbulenceScale: 0.04,
      rotationSpeed: 0.003,
      rotationTilt: 0.008,
      verticalDrift: 0.03,
    },
    hud: {
      index: '02',
      code: 'S-02 / GENETIC LATTICE',
      title: '双螺旋',
      titleEn: 'DOUBLE HELIX',
      particleCount: DNA_COUNTS.total,
      controlLabel: 'SEQUENCE CONTROL',
      structureCount: 144,
      structureLabel: 'BASE PAIRS',
      diagram: 'dna',
      description: ['双链骨架携带配对序列', '碱基横梁沿螺旋周期排列', '复制光带由激活位点向两端推进'],
      interactions: {
        idle: { cn: '稳定编码', en: 'SEQUENCE STABLE', color: '#8de7ff' },
        attract: { cn: '握拳收束', en: 'HELIX COMPRESSION', color: '#ffc857' },
        repel: { cn: '掌心解旋', en: 'STRAND UNZIP', color: '#ff7a6b' },
        point: { cn: '序列扫描', en: 'LOCUS SCAN', color: '#72e7ff' },
        duality: { cn: '双手拉伸', en: 'DUAL STRAND CONTROL', color: '#a88bff' },
        forming_void: { cn: '复制聚能', en: 'REPLICATION CHARGING', color: '#ffc857' },
        void_core: { cn: '复制锁定', en: 'REPLICATION LOCKED', color: '#f4fbff' },
        exploding: { cn: '复制推进', en: 'REPLICATION WAVE', color: '#ff7a6b' },
      },
    },
  },
  golden_spiral: {
    id: 'golden_spiral',
    Renderer: spiralRenderer.Renderer,
    camera: spiralCamera,
    heroCamera: spiralCamera,
    fogDensity: 0.0072,
    post: {
      bloom: SPIRAL_BLOOM,
      bloomBias: 0,
      contrastBias: 0.058,
      brightnessBias: -0.026,
      vignetteBias: 0.05,
    },
    atmosphere: {
      focus: 0.78,
      count: 145,
      pulseScale: 0.34,
      energyBase: 0.026,
      energyScale: 0.044,
      turbulenceBase: 0.02,
      turbulenceScale: 0.032,
      rotationSpeed: 0.0024,
      rotationTilt: 0.006,
      verticalDrift: 0.024,
    },
    hud: {
      index: '07',
      code: 'S-07 / PHI GROWTH',
      title: '黄金螺旋',
      titleEn: 'GOLDEN SPIRAL',
      particleCount: SPIRAL_COUNTS.total,
      controlLabel: 'GROWTH CONTROL',
      structureCount: SPIRAL_COUNTS.scaleNodeCount,
      structureLabel: 'SCALE NODES',
      diagram: 'spiral',
      description: ['黄金对数半径沿四条伴生丝增长', '十三个尺度节点标记连续比例变化', '增长前沿从种子向外依次点亮'],
      interactions: {
        idle: { cn: '比例生长', en: 'PHI EVOLUTION', color: '#d9ff47' },
        attract: { cn: '握拳回卷', en: 'SEED REWIND', color: '#ffad32' },
        repel: { cn: '掌心推进', en: 'GROWTH FRONT', color: '#52ff9b' },
        point: { cn: '尺度扫描', en: 'SCALE SCAN', color: '#59e4ff' },
        duality: { cn: '双手定标', en: 'DUAL SCALING', color: '#efff9c' },
        forming_void: { cn: '种子聚能', en: 'SEED CHARGING', color: '#ffbd42' },
        void_core: { cn: '比例锁定', en: 'PHI LOCKED', color: '#fffce8' },
        exploding: { cn: '生长释放', en: 'GROWTH RELEASE', color: '#52ff9b' },
      },
    },
  },
  hypercube: {
    id: 'hypercube',
    Renderer: hypercubeRenderer.Renderer,
    camera: hypercubeCamera,
    heroCamera: hypercubeCamera,
    fogDensity: 0.007,
    post: {
      bloom: HYPERCUBE_BLOOM,
      bloomBias: 0,
      contrastBias: 0.06,
      brightnessBias: -0.024,
      vignetteBias: 0.055,
    },
    atmosphere: {
      focus: 0.82,
      count: 140,
      pulseScale: 0.32,
      energyBase: 0.025,
      energyScale: 0.045,
      turbulenceBase: 0.02,
      turbulenceScale: 0.025,
      rotationSpeed: 0.0025,
      rotationTilt: 0.006,
      verticalDrift: 0.025,
    },
    hud: {
      index: '03',
      code: 'S-03 / DIMENSIONAL LATTICE',
      title: '四维立方',
      titleEn: 'HYPERCUBE',
      particleCount: HYPERCUBE_COUNTS.total,
      controlLabel: 'DIMENSION CONTROL',
      structureCount: HYPERCUBE_COUNTS.edgeCount,
      structureLabel: '4D EDGES',
      diagram: 'hypercube',
      description: ['十六个节点构成四维晶格', '三十二条边投影为嵌套立方', '第四维沿投影轴持续旋转'],
      interactions: {
        idle: { cn: '维度巡航', en: '4D DRIFT', color: '#9bdfff' },
        attract: { cn: '握拳折叠', en: 'DIMENSION FOLD', color: '#ff8a3d' },
        repel: { cn: '掌心展开', en: 'LATTICE EXPANSION', color: '#9beaff' },
        point: { cn: '节点锁定', en: 'VERTEX TRACE', color: '#ff9b52' },
        duality: { cn: '双手投影', en: 'DUAL PROJECTION', color: '#ffd06a' },
        forming_void: { cn: '核心压缩', en: 'CORE COLLAPSE', color: '#ff8a3d' },
        void_core: { cn: '超核稳定', en: 'HYPERCORE LOCKED', color: '#f5fbff' },
        exploding: { cn: '维度重组', en: 'LATTICE REASSEMBLY', color: '#ff6b32' },
      },
    },
  },
  galaxy: {
    id: 'galaxy',
    Renderer: galaxyRenderer.Renderer,
    camera: galaxyCamera,
    heroCamera: galaxyCamera,
    fogDensity: 0.0055,
    post: {
      bloom: GALAXY_BLOOM,
      bloomBias: 0,
      contrastBias: 0.068,
      brightnessBias: -0.032,
      vignetteBias: 0.065,
    },
    atmosphere: {
      focus: 0.92,
      count: 120,
      pulseScale: 0.24,
      energyBase: 0.02,
      energyScale: 0.03,
      turbulenceBase: 0.018,
      turbulenceScale: 0.02,
      rotationSpeed: 0.0018,
      rotationTilt: 0.005,
      verticalDrift: 0.018,
    },
    hud: {
      index: '08',
      code: 'S-08 / GALACTIC WAVE',
      title: '旋臂星系',
      titleEn: 'SPIRAL GALAXY',
      particleCount: GALAXY_COUNTS.total,
      controlLabel: 'GRAVITY CONTROL',
      structureCount: GALAXY_COUNTS.armCount,
      structureLabel: 'LOGARITHMIC ARMS',
      diagram: 'galaxy',
      description: ['核球与盘面在差速旋转中保持分层', '双对数旋臂维持半周相位差', '暗尘带沿密度波前缘切过星光'],
      interactions: {
        idle: { cn: '差速巡航', en: 'DIFFERENTIAL DRIFT', color: '#77ddff' },
        attract: { cn: '握拳收臂', en: 'ARM TIGHTEN', color: '#ff747d' },
        repel: { cn: '掌心释波', en: 'DENSITY WAVE', color: '#ffd27a' },
        point: { cn: '局部引力', en: 'GRAVITY PERTURBATION', color: '#54e8ff' },
        duality: { cn: '双手定盘', en: 'DUAL DISK FIELD', color: '#c8b7ff' },
        forming_void: { cn: '核球聚能', en: 'BULGE CHARGING', color: '#ff8a6b' },
        void_core: { cn: '星核锁定', en: 'GALACTIC CORE LOCKED', color: '#fff4dc' },
        exploding: { cn: '旋臂爆发', en: 'GALACTIC BURST', color: '#ff747d' },
      },
    },
  },
  singularity: {
    id: 'singularity',
    Renderer: singularityRenderer.Renderer,
    camera: singularityCamera,
    heroCamera: singularityCamera,
    fogDensity: 0.006,
    post: {
      bloom: SINGULARITY_BLOOM,
      bloomBias: 0,
      contrastBias: 0.075,
      brightnessBias: -0.035,
      vignetteBias: 0.075,
    },
    atmosphere: {
      focus: 1,
      count: 110,
      pulseScale: 0.18,
      energyBase: 0.018,
      energyScale: 0.015,
      turbulenceBase: 0.018,
      turbulenceScale: 0,
      rotationSpeed: 0.002,
      rotationTilt: 0.006,
      verticalDrift: 0.02,
    },
    hud: {
      index: '04',
      code: 'S-04 / GRAVITY WELL',
      title: '引力奇点',
      titleEn: 'SINGULARITY',
      particleCount: SINGULARITY_COUNTS.total,
      controlLabel: 'GRAVITY CONTROL',
      structureCount: 4,
      structureLabel: 'FIELD LAYERS',
      diagram: 'singularity',
      description: ['事件视界吞没所有可见光', '高温物质沿吸积盘加速旋入', '极向喷流穿过引力场'],
      interactions: {
        idle: { cn: '稳定吸积', en: 'STABLE ACCRETION', color: '#d9f7ff' },
        attract: { cn: '握拳坍缩', en: 'GRAVITY COLLAPSE', color: '#ffad45' },
        repel: { cn: '掌心冲击', en: 'RADIAL SHOCK', color: '#fff0ba' },
        point: { cn: '指尖透镜', en: 'LOCAL LENSING', color: '#82ebff' },
        duality: { cn: '双手聚能', en: 'BINARY COMPRESSION', color: '#ffd06a' },
        forming_void: { cn: '核心聚能', en: 'CORE CHARGING', color: '#ff9d36' },
        void_core: { cn: '奇点稳定', en: 'SINGULARITY LOCKED', color: '#f3fbff' },
        exploding: { cn: '中心爆发', en: 'RELATIVISTIC BURST', color: '#ff6b36' },
      },
    },
  },
}

export function getSceneProfile(id: ParticleShape): SceneProfile {
  return SCENE_PROFILES[id]
}

export function preloadSceneRenderer(id: ParticleShape): Promise<void> {
  return SCENE_PRELOADERS[id]()
}
