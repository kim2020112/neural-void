import { DUAL_HAND_SPAN } from '../hand/gestureEngine'
import type {
  GestureType,
  InteractionMode,
  InteractionState,
  Vec3,
  VoidCorePhase,
} from '../store/appStore'

export interface SceneInteractionInput {
  gestureType: GestureType
  gestureScore: number
  forceStrength: number
  handDetected: boolean
  handPosition: Vec3
  hand2GestureType: GestureType
  hand2GestureScore: number
  hand2Detected: boolean
  hand2Position: Vec3
  interactionState: InteractionState
  voidCorePhase: VoidCorePhase
  voidCoreStrength: number
}

export interface SceneInteractionFrame {
  mode: InteractionMode
  voidPhase: VoidCorePhase
  voidStrength: number
  primaryGesture: GestureType
  primaryStrength: number
  secondaryGesture: GestureType
  secondaryStrength: number
  handCount: number
  dualActive: boolean
  bothFists: boolean
  singleFistFallback: boolean
  dualDistance: number
  dualSpan: number
  dualCompression: number
  midpoint: Vec3
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

export function createSceneInteractionFrame(): SceneInteractionFrame {
  return {
    mode: 'idle',
    voidPhase: 'idle',
    voidStrength: 0,
    primaryGesture: 'none',
    primaryStrength: 0,
    secondaryGesture: 'none',
    secondaryStrength: 0,
    handCount: 0,
    dualActive: false,
    bothFists: false,
    singleFistFallback: false,
    dualDistance: DUAL_HAND_SPAN.open,
    dualSpan: 1,
    dualCompression: 0,
    midpoint: { x: 0, y: 0, z: 0 },
  }
}

export function resolveSceneInteractionFrame(
  input: SceneInteractionInput,
  output: SceneInteractionFrame,
) {
  const dualActive = input.handDetected && input.hand2Detected
  const dx = input.handPosition.x - input.hand2Position.x
  const dy = input.handPosition.y - input.hand2Position.y
  const dz = input.handPosition.z - input.hand2Position.z
  const dualDistance = dualActive ? Math.sqrt(dx * dx + dy * dy + dz * dz) : DUAL_HAND_SPAN.open
  const dualSpan = clamp01(
    (dualDistance - DUAL_HAND_SPAN.compressed) /
      (DUAL_HAND_SPAN.open - DUAL_HAND_SPAN.compressed),
  )

  output.mode = input.interactionState.mode
  output.voidPhase = input.voidCorePhase
  output.voidStrength = clamp01(input.voidCoreStrength)
  output.primaryGesture = input.handDetected ? input.gestureType : 'none'
  output.primaryStrength = input.handDetected ? clamp01(input.forceStrength) : 0
  output.secondaryGesture = input.hand2Detected ? input.hand2GestureType : 'none'
  output.secondaryStrength = input.hand2Detected ? clamp01(input.hand2GestureScore) : 0
  output.handCount = Number(input.handDetected) + Number(input.hand2Detected)
  output.dualActive = dualActive
  output.bothFists =
    dualActive && input.gestureType === 'fist' && input.hand2GestureType === 'fist'
  output.singleFistFallback =
    input.voidCorePhase !== 'idle' && !dualActive &&
    ((input.handDetected && input.gestureType === 'fist') ||
      (input.hand2Detected && input.hand2GestureType === 'fist'))
  output.dualDistance = dualDistance
  output.dualSpan = dualActive ? dualSpan : 1
  output.dualCompression = dualActive ? 1 - dualSpan : 0
  output.midpoint.x = (input.handPosition.x + input.hand2Position.x) * 0.5
  output.midpoint.y = (input.handPosition.y + input.hand2Position.y) * 0.5
  output.midpoint.z = (input.handPosition.z + input.hand2Position.z) * 0.5

  return output
}
