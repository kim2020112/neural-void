import type {
  GestureType,
  InteractionMode,
  InteractionState,
  Vec3,
  VoidCorePhase,
} from '../store/appStore'
import type { ParticleShape } from './shapes/types'

export const PARTICLE_COUNT = 20000
export const SHAPE_TRANSITION_DURATION = 1.85

export const SHAPE_MODE: Record<ParticleShape, number> = {
  quantum_sphere: 1,
  knot_torus: 2,
  saturn_ring: 3,
  dna_helix: 4,
  golden_spiral: 5,
  hypercube: 6,
  galaxy: 7,
  singularity: 8,
}

const INTERACTION_MODE_INDEX: Record<InteractionMode, number> = {
  idle: 0,
  attract: 1,
  repel: 2,
  point: 3,
  duality: 4,
  forming_void: 5,
  void_core: 6,
  exploding: 7,
}

const VOID_STRENGTH_MAP: Record<VoidCorePhase, number> = {
  idle: 0,
  forming: 0.55,
  active: 0.95,
  exploding: 1,
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

export interface ParticleEngineInput {
  gestureType: GestureType
  gestureScore: number
  handDetected: boolean
  hand2Detected: boolean
  voidCorePhase: VoidCorePhase
  interactionState: InteractionState
  transition: number
}

export interface ParticleEngineFrame {
  forceType: number
  forceStrength: number
  voidStrength: number
  interactionMode: number
  interactionPresence: number
  duality: number
  depthBias: number
  flowWeight: number
  morphTension: number
}

export function getGestureForce(handDetected: boolean, gestureType: GestureType, gestureScore: number) {
  if (!handDetected) return 0
  if (gestureType === 'none') return 0.18
  return Math.max(0.38, gestureScore)
}

export function getVoidStrength(phase: VoidCorePhase) {
  return VOID_STRENGTH_MAP[phase]
}

export function gestureToForceType(gesture: GestureType) {
  switch (gesture) {
    case 'fist':
      return 1
    case 'open_palm':
      return 2
    case 'point':
      return 3
    default:
      return 0
  }
}

export function resolveInteractionMode(mode: InteractionMode) {
  return INTERACTION_MODE_INDEX[mode]
}

export function vec3ToArray(vec: Vec3): [number, number, number] {
  return [vec.x, vec.y, vec.z]
}

export function resolveParticleEngineFrame({
  gestureType,
  gestureScore,
  handDetected,
  hand2Detected,
  voidCorePhase,
  interactionState,
  transition,
}: ParticleEngineInput): ParticleEngineFrame {
  const gestureForce = getGestureForce(handDetected, gestureType, gestureScore)
  const voidStrength = getVoidStrength(voidCorePhase)
  const dualityBoost = interactionState.duality * 0.32 + interactionState.orbit * 0.18
  const depthBias = clamp01(interactionState.depth * (handDetected ? 1 : 0))
  const morphTension = clamp01(
    transition * 0.82 + interactionState.focus * 0.28 + interactionState.orbit * 0.22 + voidStrength * 0.36,
  )
  const flowWeight = clamp01(
    0.2 + interactionState.presence * 0.34 + interactionState.orbit * 0.26 + transition * 0.32 + voidStrength * 0.18,
  )

  const forceType = voidCorePhase !== 'idle' ? 4 : gestureToForceType(handDetected ? gestureType : 'none')
  const forceStrength =
    voidCorePhase !== 'idle'
      ? 0
      : clamp01(gestureForce * 0.76 + dualityBoost + depthBias * 0.14 + (hand2Detected ? 0.08 : 0))

  return {
    forceType,
    forceStrength,
    voidStrength,
    interactionMode: resolveInteractionMode(interactionState.mode),
    interactionPresence: clamp01(interactionState.presence),
    duality: clamp01(interactionState.duality),
    depthBias,
    flowWeight,
    morphTension,
  }
}