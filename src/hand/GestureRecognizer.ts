import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision'
import { useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '../store/appStore'
import type { GestureData, GestureType, InteractionMode, Vec3, VoidCorePhase } from '../store/appStore'

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/latest/gesture_recognizer.task'

const SMOOTHING = 0.35
const CENTER_INDICES = [0, 9]
const FINGERTIP_INDEX = 8
const VOID_FORM_MS = 820
const SINGLE_FIST_CHARGE_MS = 2200
const VOID_ACTIVE_ARM_MS = 160
const VOID_EXPLOSION_RESET_MS = 4200
const FORM_SPACING_SOFT_LIMIT = 6.8
const FORM_SPACING_IDEAL = 3.2

const HYSTERESIS = {
  activate: 4,
  release: 10,
  maxLock: 30,
}

interface HysteresisState {
  lockedGesture: GestureType
  lockCounter: number
  noneCounter: number
  candidateGesture: GestureType
  candidateCounter: number
}

interface HandSnapshot {
  detected: boolean
  gesture: GestureType
  score: number
  position: Vec3
  fingertip: Vec3
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp01((value - edge0) / (edge1 - edge0 || 1))
  return t * t * (3 - 2 * t)
}

function mapGesture(name: string): GestureType {
  switch (name) {
    case 'Closed_Fist':
      return 'fist'
    case 'Open_Palm':
      return 'open_palm'
    case 'Pointing_Up':
      return 'point'
    default:
      return 'none'
  }
}

function toWorldSpace(mpX: number, mpY: number, mpZ: number): Vec3 {
  return {
    x: (mpX - 0.5) * 16,
    y: (0.55 - mpY) * 13 + 1.0,
    z: (mpZ + 0.05) * 10 - 3,
  }
}

function computeHandCenter(landmarks: { x: number; y: number; z: number }[]): Vec3 {
  let sx = 0
  let sy = 0
  let sz = 0

  for (const index of CENTER_INDICES) {
    sx += landmarks[index].x
    sy += landmarks[index].y
    sz += landmarks[index].z
  }

  return toWorldSpace(sx / CENTER_INDICES.length, sy / CENTER_INDICES.length, sz / CENTER_INDICES.length)
}

function computeFingertip(landmarks: { x: number; y: number; z: number }[]): Vec3 {
  const tip = landmarks[FINGERTIP_INDEX]
  return toWorldSpace(tip.x, tip.y, tip.z)
}

function lerpVec3(current: Vec3, target: Vec3, factor: number): Vec3 {
  return {
    x: current.x + (target.x - current.x) * factor,
    y: current.y + (target.y - current.y) * factor,
    z: current.z + (target.z - current.z) * factor,
  }
}

function distance(a: Vec3, b: Vec3) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

function midpoint(a: Vec3, b: Vec3): Vec3 {
  return {
    x: (a.x + b.x) * 0.5,
    y: (a.y + b.y) * 0.5,
    z: (a.z + b.z) * 0.5,
  }
}

function createHysteresisState(): HysteresisState {
  return {
    lockedGesture: 'none',
    lockCounter: 0,
    noneCounter: 0,
    candidateGesture: 'none',
    candidateCounter: 0,
  }
}

function updateHysteresis(state: HysteresisState, rawGesture: GestureType, rawScore: number) {
  if (rawGesture !== 'none' && rawScore > 0.45) {
    state.noneCounter = 0

    if (rawGesture === state.candidateGesture) {
      state.candidateCounter += 1
    } else {
      state.candidateGesture = rawGesture
      state.candidateCounter = 1
    }

    if (state.candidateCounter >= HYSTERESIS.activate) {
      state.lockedGesture = rawGesture
      state.lockCounter = HYSTERESIS.maxLock
      state.candidateCounter = 0
    }
  } else {
    state.candidateCounter = Math.max(0, state.candidateCounter - 1)
    state.noneCounter += 1

    if (state.noneCounter >= HYSTERESIS.release) {
      state.lockedGesture = 'none'
      state.lockCounter = 0
    }
  }

  if (state.lockCounter > 0) {
    state.lockCounter -= 1
    return state.lockedGesture === 'none' ? state.candidateGesture || 'none' : state.lockedGesture
  }

  if (state.lockedGesture !== 'none') {
    state.lockedGesture = 'none'
  }

  return state.lockedGesture
}

function deriveMode(
  voidPhase: VoidCorePhase,
  primary: HandSnapshot,
  secondary: HandSnapshot,
  duality: number,
): InteractionMode {
  if (voidPhase === 'forming') return 'forming_void'
  if (voidPhase === 'active') return 'void_core'
  if (voidPhase === 'exploding') return 'exploding'
  if (duality > 0.16 && primary.detected && secondary.detected) return 'duality'
  if (primary.gesture === 'fist') return 'attract'
  if (primary.gesture === 'open_palm') return 'repel'
  if (primary.gesture === 'point') return 'point'
  return 'idle'
}

function buildGestureData(results: {
  gestures: { categoryName?: string; score?: number }[][]
  landmarks: { x: number; y: number; z: number }[][]
}): GestureData {
  return {
    gestures: results.gestures.map((group) => ({
      categoryName: group[0]?.categoryName ?? 'None',
      score: group[0]?.score ?? 0,
      handedness: 'unknown',
    })),
    landmarks: results.landmarks,
    handedness: results.gestures.map(() => 'unknown'),
  }
}

export function useGestureRecognizer() {
  const phase = useAppStore((state) => state.phase)
  const cameraReady = useAppStore((state) => state.cameraReady)
  const recognizerRef = useRef<GestureRecognizer | null>(null)
  const rafRef = useRef(0)
  const initializedRef = useRef(false)

  const smoothHandRef = useRef<Vec3>({ x: 0, y: 0, z: 0 })
  const smoothFingertipRef = useRef<Vec3>({ x: 0, y: 0, z: 0 })
  const hysteresisRef = useRef(createHysteresisState())

  const smoothHandRef2 = useRef<Vec3>({ x: 0, y: 0, z: 0 })
  const smoothFingertipRef2 = useRef<Vec3>({ x: 0, y: 0, z: 0 })
  const hysteresisRef2 = useRef(createHysteresisState())

  const frameCountRef = useRef(0)
  const fistHoldStartRef = useRef(0)
  const voidTriggeredRef = useRef(false)
  const formingStartRef = useRef(0)
  const activeStartRef = useRef(0)
  const explosionStartRef = useRef(0)

  const processFrame = useCallback(() => {
    const video = (window as unknown as Record<string, unknown>).__videoElement as HTMLVideoElement | undefined
    const recognizer = recognizerRef.current

    if (!video || !recognizer || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(processFrame)
      return
    }

    const results = recognizer.recognizeForVideo(video, performance.now())
    const now = performance.now()
    const store = useAppStore.getState()
    frameCountRef.current += 1

    store.setGestureData(buildGestureData(results))

    const primary: HandSnapshot = {
      detected: false,
      gesture: 'none',
      score: 0,
      position: { x: 0, y: 0, z: 0 },
      fingertip: { x: 0, y: 0, z: 0 },
    }

    const secondary: HandSnapshot = {
      detected: false,
      gesture: 'none',
      score: 0,
      position: { x: 0, y: 0, z: 0 },
      fingertip: { x: 0, y: 0, z: 0 },
    }

    const landmarks0 = results.landmarks[0]
    if (landmarks0) {
      const gesture = results.gestures[0]?.[0]
      const rawGesture = mapGesture(gesture?.categoryName ?? 'None')
      const rawScore = gesture?.score ?? 0

      const targetHand = computeHandCenter(landmarks0)
      const targetFingertip = computeFingertip(landmarks0)

      smoothHandRef.current = lerpVec3(smoothHandRef.current, targetHand, SMOOTHING)
      smoothFingertipRef.current = lerpVec3(smoothFingertipRef.current, targetFingertip, SMOOTHING)

      primary.detected = true
      primary.position = smoothHandRef.current
      primary.fingertip = smoothFingertipRef.current
      primary.gesture = updateHysteresis(hysteresisRef.current, rawGesture, rawScore)
      primary.score = rawScore

      store.setHandPosition(primary.position)
      store.setFingertipPosition(primary.fingertip)
      store.setHandDetected(true)
      store.setGestureType(primary.gesture, primary.score)
    } else {
      hysteresisRef.current.noneCounter += 1
      if (hysteresisRef.current.noneCounter >= HYSTERESIS.release) {
        hysteresisRef.current = createHysteresisState()
      }
      store.setHandDetected(false)
      store.setGestureType('none', 0)
    }

    const landmarks1 = results.landmarks[1]
    if (landmarks1) {
      const gesture = results.gestures[1]?.[0]
      const rawGesture = mapGesture(gesture?.categoryName ?? 'None')
      const rawScore = gesture?.score ?? 0

      const targetHand = computeHandCenter(landmarks1)
      const targetFingertip = computeFingertip(landmarks1)

      smoothHandRef2.current = lerpVec3(smoothHandRef2.current, targetHand, SMOOTHING)
      smoothFingertipRef2.current = lerpVec3(smoothFingertipRef2.current, targetFingertip, SMOOTHING)

      secondary.detected = true
      secondary.position = smoothHandRef2.current
      secondary.fingertip = smoothFingertipRef2.current
      secondary.gesture = updateHysteresis(hysteresisRef2.current, rawGesture, rawScore)
      secondary.score = rawScore

      store.setHand2Position(secondary.position)
      store.setHand2FingertipPosition(secondary.fingertip)
      store.setHand2Detected(true)
      store.setHand2GestureType(secondary.gesture, secondary.score)
    } else {
      hysteresisRef2.current.noneCounter += 1
      if (hysteresisRef2.current.noneCounter >= HYSTERESIS.release) {
        hysteresisRef2.current = createHysteresisState()
      }
      store.setHand2Detected(false)
      store.setHand2GestureType('none', 0)
    }

    const bothFists =
      primary.detected &&
      secondary.detected &&
      primary.gesture === 'fist' &&
      secondary.gesture === 'fist'
    const singleFist = primary.detected && primary.gesture === 'fist' && !secondary.detected

    const detectedCount = Number(primary.detected) + Number(secondary.detected)
    const averageDepth =
      detectedCount === 2
        ? (primary.position.z + secondary.position.z) * 0.5
        : primary.detected
          ? primary.position.z
          : secondary.detected
            ? secondary.position.z
            : 0
    const depth = detectedCount > 0 ? clamp01((2.5 - averageDepth) / 7.5) : 0
    const duality =
      primary.detected && secondary.detected
        ? clamp01(distance(primary.position, secondary.position) / 11) * clamp01((primary.score + secondary.score) * 0.5 + 0.2)
        : 0
    const orbit =
      primary.detected && secondary.detected
        ? clamp01(duality * (1 - Math.min(1, Math.abs(primary.position.y - secondary.position.y) / 7)))
        : 0
    const previewHoldCharge =
      singleFist && fistHoldStartRef.current > 0
        ? clamp01((now - fistHoldStartRef.current) / SINGLE_FIST_CHARGE_MS)
        : 0
    const fistDistance = bothFists ? distance(primary.position, secondary.position) : FORM_SPACING_SOFT_LIMIT
    const formationCompression = bothFists
      ? clamp01(
          (FORM_SPACING_SOFT_LIMIT - fistDistance) / (FORM_SPACING_SOFT_LIMIT - FORM_SPACING_IDEAL),
        )
      : 0
    const formationStability = bothFists
      ? clamp01(formationCompression * 0.72 + depth * 0.28)
      : clamp01(0.46 + previewHoldCharge * 0.4 + depth * 0.14)

    if (!voidTriggeredRef.current) {
      const stalePhase = store.voidCorePhase
      if (stalePhase === 'exploding') {
        if (explosionStartRef.current === 0) {
          explosionStartRef.current = store.voidExplosionTime > 0 ? store.voidExplosionTime : now
        }
        const elapsed = now - explosionStartRef.current
        const linear = clamp01(1 - elapsed / VOID_EXPLOSION_RESET_MS)
        const strength = Math.pow(linear, 0.72)
        store.setVoidCoreStrength(strength)
        if (elapsed > VOID_EXPLOSION_RESET_MS) {
          store.setVoidCorePhase('idle')
          store.setVoidCoreStrength(0)
          store.setVoidExplosionTime(-1)
          explosionStartRef.current = 0
          activeStartRef.current = 0
        }
      } else if (stalePhase !== 'idle') {
        store.setVoidCorePhase('idle')
        store.setVoidCoreStrength(0)
        store.setVoidExplosionTime(-1)
        activeStartRef.current = 0
      }

      if (bothFists) {
        voidTriggeredRef.current = true
        formingStartRef.current = now
        activeStartRef.current = 0
        store.setVoidCorePhase('forming')
        store.setVoidCoreStrength(0.06)
        store.setVoidCenter(midpoint(primary.position, secondary.position))
        fistHoldStartRef.current = 0
      } else if (singleFist) {
        if (fistHoldStartRef.current === 0) {
          fistHoldStartRef.current = now
        }
        const charge = clamp01((now - fistHoldStartRef.current) / SINGLE_FIST_CHARGE_MS)
        if (charge >= 1) {
          voidTriggeredRef.current = true
          formingStartRef.current = now
          activeStartRef.current = 0
          store.setVoidCorePhase('forming')
          store.setVoidCoreStrength(0.08)
          store.setVoidCenter({ ...primary.position })
          fistHoldStartRef.current = 0
        }
      } else {
        fistHoldStartRef.current = 0
      }
    }

    if (voidTriggeredRef.current) {
      const phaseNow = useAppStore.getState().voidCorePhase

      if (bothFists) {
        store.setVoidCenter(midpoint(primary.position, secondary.position))
      } else if (primary.detected) {
        store.setVoidCenter({ ...primary.position })
      }

      const anyOpenPalm =
        primary.gesture === 'open_palm' || (secondary.detected && secondary.gesture === 'open_palm')
      const activeElapsed = activeStartRef.current > 0 ? now - activeStartRef.current : 0
      if (anyOpenPalm && phaseNow === 'active' && activeElapsed >= VOID_ACTIVE_ARM_MS) {
        voidTriggeredRef.current = false
        explosionStartRef.current = now
        activeStartRef.current = 0
        store.setVoidCorePhase('exploding')
        store.setVoidCoreStrength(1)
        store.setVoidExplosionTime(now)
        rafRef.current = requestAnimationFrame(processFrame)
        return
      }

      const anyFist = primary.gesture === 'fist' || (secondary.detected && secondary.gesture === 'fist')
      if (!anyFist && phaseNow !== 'forming') {
        voidTriggeredRef.current = false
        activeStartRef.current = 0
        store.setVoidCorePhase('idle')
        store.setVoidCoreStrength(0)
        store.setVoidExplosionTime(-1)
      }

      if (phaseNow === 'forming') {
        const progress = clamp01((now - formingStartRef.current) / VOID_FORM_MS)
        const stability = bothFists
          ? clamp01(formationStability + duality * 0.12)
          : clamp01(0.58 + previewHoldCharge * 0.28 + depth * 0.16)
        const compressionCurve = Math.pow(progress, 1.7)
        const criticalBand = smoothstep(0.72, 1, progress) * stability
        const strength = clamp01(
          0.05 + compressionCurve * (0.5 + stability * 0.28) + criticalBand * 0.17,
        )

        if ((!bothFists && !singleFist) || (bothFists && formationStability < 0.12 && progress > 0.24)) {
          voidTriggeredRef.current = false
          activeStartRef.current = 0
          store.setVoidCorePhase('idle')
          store.setVoidCoreStrength(0)
          store.setVoidExplosionTime(-1)
        } else {
          store.setVoidCoreStrength(strength)
          if (progress >= 1 && stability >= 0.58) {
            activeStartRef.current = now
            store.setVoidCorePhase('active')
            store.setVoidCoreStrength(1)
          }
        }
      } else if (phaseNow === 'active') {
        store.setVoidCoreStrength(clamp01(0.94 + depth * 0.04 + duality * 0.06))
      }

      if (!primary.detected && !secondary.detected && phaseNow !== 'exploding') {
        voidTriggeredRef.current = false
        activeStartRef.current = 0
        store.setVoidCorePhase('idle')
        store.setVoidCoreStrength(0)
        store.setVoidExplosionTime(-1)
      }
    }

    const holdCharge =
      singleFist && fistHoldStartRef.current > 0 ? clamp01((now - fistHoldStartRef.current) / SINGLE_FIST_CHARGE_MS) : 0
    const focus = clamp01(
      (primary.gesture === 'point' ? primary.score : 0) +
        (secondary.gesture === 'point' ? secondary.score * 0.5 : 0) +
        holdCharge * 0.45,
    )
    const presence = clamp01(
      Math.max(primary.score, secondary.score) * 0.5 +
        detectedCount * 0.16 +
        duality * 0.18 +
        holdCharge * 0.16 +
        formationCompression * 0.12,
    )

    const resolvedVoidPhase = useAppStore.getState().voidCorePhase
    const interactionMode = deriveMode(resolvedVoidPhase, primary, secondary, duality)

    const modeForceBase =
      interactionMode === 'attract'
        ? 0.72
        : interactionMode === 'repel'
          ? 0.74
          : interactionMode === 'point'
            ? 0.82
            : interactionMode === 'duality'
              ? 0.86
              : interactionMode === 'forming_void' || interactionMode === 'void_core'
                ? 0.92
                : 0.18

    const forceStrength = clamp01(presence * modeForceBase + depth * 0.14 + orbit * 0.12)
    store.setForceStrength(forceStrength)
    store.setInteractionState({
      mode: interactionMode,
      presence,
      duality,
      depth,
      focus,
      orbit,
    })

    if (frameCountRef.current % 90 === 1) {
      const h0Raw = results.gestures[0]?.[0]?.categoryName ?? '-'
      const h1Raw = results.gestures[1]?.[0]?.categoryName ?? '-'
      console.log(
        `[NeuralVoid] frame=${frameCountRef.current} ` +
          `H0=${h0Raw}→${primary.gesture} H1=${h1Raw}→${secondary.gesture} ` +
          `mode=${interactionMode} void=${resolvedVoidPhase}`,
      )
    }

    rafRef.current = requestAnimationFrame(processFrame)
  }, [])

  useEffect(() => {
    if (phase !== 'active' || !cameraReady || initializedRef.current) return

    let cancelled = false

    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH)
        if (cancelled) return

        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_PATH,
            delegate: 'GPU',
          },
          numHands: 2,
          runningMode: 'VIDEO',
        })

        if (cancelled) {
          recognizer.close()
          return
        }

        recognizerRef.current = recognizer
        initializedRef.current = true
        frameCountRef.current = 0
        rafRef.current = requestAnimationFrame(processFrame)
      } catch (error) {
        console.error('[NeuralVoid] GestureRecognizer init failed:', error)
      }
    }

    init()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      if (recognizerRef.current) {
        recognizerRef.current.close()
        recognizerRef.current = null
      }
      initializedRef.current = false
      frameCountRef.current = 0
      fistHoldStartRef.current = 0
      voidTriggeredRef.current = false
      formingStartRef.current = 0
      activeStartRef.current = 0
      explosionStartRef.current = 0
    }
  }, [cameraReady, phase, processFrame])
}