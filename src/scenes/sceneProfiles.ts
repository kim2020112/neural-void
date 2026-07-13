import type { ComponentType } from 'react'
import { ParticleUniverse } from '../particles/ParticleUniverse'
import { SaturnSystem } from '../particles/saturn/SaturnSystem'
import { SATURN_BLOOM, SATURN_CAMERA, SATURN_COUNTS } from '../particles/saturn/saturnTypes'
import { SingularitySystem } from '../particles/singularity/SingularitySystem'
import {
  SINGULARITY_BLOOM,
  SINGULARITY_CAMERA,
  SINGULARITY_COUNTS,
} from '../particles/singularity/singularityTypes'
import type { ParticleShape } from '../particles/shapes/types'
import type { InteractionMode } from '../store/appStore'

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
  diagram: 'orbit' | 'singularity'
  description: readonly string[]
  interactions: Record<InteractionMode, GestureHudProfile>
}

export interface SceneProfile {
  id: ParticleShape
  Renderer: ComponentType
  camera: CameraPose
  heroCamera?: CameraPose
  post: PostProfile
  atmosphere: AtmosphereProfile
  hud?: SceneHudProfile
}

const DEFAULT_ATMOSPHERE: AtmosphereProfile = {
  focus: 0,
  count: 520,
  pulseScale: 1,
  energyBase: 0,
  energyScale: 1,
  turbulenceBase: 0,
  turbulenceScale: 1,
  rotationSpeed: 0.01,
  rotationTilt: 0.03,
  verticalDrift: 0.2,
}

function particleProfile(
  id: ParticleShape,
  camera: CameraPose,
  post: Partial<PostProfile> = {},
): SceneProfile {
  return {
    id,
    Renderer: ParticleUniverse,
    camera,
    post: {
      bloomBias: 0,
      contrastBias: 0.02,
      brightnessBias: -0.012,
      vignetteBias: 0.02,
      ...post,
    },
    atmosphere: DEFAULT_ATMOSPHERE,
  }
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

export const SCENE_PROFILES: Record<ParticleShape, SceneProfile> = {
  saturn_ring: {
    id: 'saturn_ring',
    Renderer: SaturnSystem,
    camera: saturnCamera,
    heroCamera: saturnCamera,
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
  quantum_sphere: particleProfile('quantum_sphere', {
    position: [1.8, 2, 12.1], lookAt: [0, 0.52, 0], fov: 40, sway: 0.08, lift: 0.06, depth: 0.08,
  }),
  knot_torus: particleProfile('knot_torus', {
    position: [4.6, 2.4, 11.6], lookAt: [0, 0.15, 0], fov: 39, sway: 0.08, lift: 0.05, depth: 0.07,
  }, { contrastBias: 0.03 }),
  dna_helix: particleProfile('dna_helix', {
    position: [4.1, 1.9, 13.2], lookAt: [0, 0.45, 0], fov: 34, sway: 0.06, lift: 0.05, depth: 0.06,
  }),
  golden_spiral: particleProfile('golden_spiral', {
    position: [3.1, 2, 12.2], lookAt: [0.2, 0.18, 0], fov: 37, sway: 0.08, lift: 0.04, depth: 0.06,
  }, { bloomBias: -0.18, brightnessBias: -0.02 }),
  hypercube: particleProfile('hypercube', {
    position: [4.8, 3.1, 13.4], lookAt: [0, 0.3, 0], fov: 33, sway: 0.06, lift: 0.04, depth: 0.05,
  }, { bloomBias: -0.26, contrastBias: 0.08, brightnessBias: -0.03, vignetteBias: 0.03 }),
  galaxy: particleProfile('galaxy', {
    position: [2.7, 3, 14.6], lookAt: [0, 0.28, 0], fov: 32, sway: 0.08, lift: 0.05, depth: 0.08,
  }, { contrastBias: 0.04, brightnessBias: -0.028, vignetteBias: 0.04 }),
  singularity: {
    id: 'singularity',
    Renderer: SingularitySystem,
    camera: singularityCamera,
    heroCamera: singularityCamera,
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
      index: '08',
      code: 'S-08 / GRAVITY WELL',
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
