import type {
  GestureRecognizer as MediaPipeGestureRecognizer,
  GestureRecognizerResult as MediaPipeGestureResult,
} from '@mediapipe/tasks-vision'
import { useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '../store/appStore'
import type { GestureData, GestureType, InteractionMode, Vec3, VoidCorePhase } from '../store/appStore'
import {
  AdaptiveVec3Filter,
  DUAL_HAND_SPAN,
  GestureStabilizer,
  mapGestureName,
  toWorldSpace,
} from './gestureEngine'

const WASM_PATH = '/wasm'
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/latest/gesture_recognizer.task'

const CENTER_INDICES = [0, 9]
const FINGERTIP_INDEX = 8
const TARGET_INFERENCE_INTERVAL_MS = 1000 / 24
const HAND_LOSS_GRACE_MS = 120
const METRICS_WINDOW_MS = 1000
const VOID_FORM_MS = 820
const SINGLE_FIST_CHARGE_MS = 2200
const VOID_ACTIVE_ARM_MS = 160
const VOID_EXPLOSION_RESET_MS = 4200

interface HandSnapshot {
  detected: boolean
  gesture: GestureType
  score: number
  position: Vec3
  fingertip: Vec3
}

interface HandRuntime {
  positionFilter: AdaptiveVec3Filter
  fingertipFilter: AdaptiveVec3Filter
  gestureStabilizer: GestureStabilizer
  lastSeenAt: number
  lastPosition: Vec3
  lastFingertip: Vec3
  lastScore: number
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp01((value - edge0) / (edge1 - edge0 || 1))
  return t * t * (3 - 2 * t)
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

function createHandRuntime(): HandRuntime {
  return {
    positionFilter: new AdaptiveVec3Filter(),
    fingertipFilter: new AdaptiveVec3Filter(),
    gestureStabilizer: new GestureStabilizer(),
    lastSeenAt: 0,
    lastPosition: { x: 0, y: 0, z: 0 },
    lastFingertip: { x: 0, y: 0, z: 0 },
    lastScore: 0,
  }
}

function resetHandRuntime(runtime: HandRuntime) {
  runtime.positionFilter.reset()
  runtime.fingertipFilter.reset()
  runtime.gestureStabilizer.reset()
  runtime.lastSeenAt = 0
  runtime.lastPosition = { x: 0, y: 0, z: 0 }
  runtime.lastFingertip = { x: 0, y: 0, z: 0 }
  runtime.lastScore = 0
}

function orderHandIndices(results: MediaPipeGestureResult, preferredPrimary: string | null) {
  const indices = results.landmarks.map((_, index) => index)
  if (indices.length < 2) return indices

  return indices.sort((a, b) => {
    const handednessA = results.handedness[a]?.[0]?.categoryName ?? ''
    const handednessB = results.handedness[b]?.[0]?.categoryName ?? ''

    if (preferredPrimary) {
      const aPreferred = handednessA === preferredPrimary
      const bPreferred = handednessB === preferredPrimary
      if (aPreferred !== bPreferred) return aPreferred ? -1 : 1
    }

    if (handednessA !== handednessB) {
      if (handednessA === 'Right') return -1
      if (handednessB === 'Right') return 1
    }

    const xA = results.landmarks[a]?.[0]?.x ?? 0.5
    const xB = results.landmarks[b]?.[0]?.x ?? 0.5
    return xA - xB
  })
}

function processHand(
  results: MediaPipeGestureResult,
  index: number | undefined,
  runtime: HandRuntime,
  timestamp: number,
): HandSnapshot {
  if (index === undefined || !results.landmarks[index]) {
    const stableGesture = runtime.gestureStabilizer.update('none', 0, timestamp)
    const withinGrace = runtime.lastSeenAt > 0 && timestamp - runtime.lastSeenAt <= HAND_LOSS_GRACE_MS

    return {
      detected: withinGrace,
      gesture: withinGrace ? stableGesture.gesture : 'none',
      score: withinGrace ? runtime.lastScore : 0,
      position: runtime.lastPosition,
      fingertip: runtime.lastFingertip,
    }
  }

  const landmarks = results.landmarks[index]
  const gesture = results.gestures[index]?.[0]
  const rawGesture = mapGestureName(gesture?.categoryName ?? 'None')
  const rawScore = gesture?.score ?? 0
  const stableGesture = runtime.gestureStabilizer.update(rawGesture, rawScore, timestamp)
  const position = runtime.positionFilter.update(computeHandCenter(landmarks), timestamp)
  const fingertip = runtime.fingertipFilter.update(computeFingertip(landmarks), timestamp)

  runtime.lastSeenAt = timestamp
  runtime.lastPosition = position
  runtime.lastFingertip = fingertip
  runtime.lastScore = stableGesture.score

  return {
    detected: true,
    gesture: stableGesture.gesture,
    score: stableGesture.score,
    position,
    fingertip,
  }
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

function buildGestureData(results: MediaPipeGestureResult, indices: number[]): GestureData {
  return {
    gestures: indices.map((index) => ({
      categoryName: results.gestures[index]?.[0]?.categoryName ?? 'None',
      score: results.gestures[index]?.[0]?.score ?? 0,
      handedness: results.handedness[index]?.[0]?.categoryName ?? 'unknown',
    })),
    landmarks: indices.map((index) => results.landmarks[index]),
    handedness: indices.map(
      (index) => results.handedness[index]?.[0]?.categoryName ?? 'unknown',
    ),
  }
}

export function useGestureRecognizer() {
  const phase = useAppStore((state) => state.phase)
  const cameraReady = useAppStore((state) => state.cameraReady)
  const recognitionRequested = phase !== 'idle' && cameraReady
  const recognizerRef = useRef<MediaPipeGestureRecognizer | null>(null)
  const rafRef = useRef(0)
  const processFrameRef = useRef<(timestamp: number) => void>(() => undefined)
  const primaryRuntimeRef = useRef(createHandRuntime())
  const secondaryRuntimeRef = useRef(createHandRuntime())
  const lastVideoTimeRef = useRef(-1)
  const lastInferenceTimestampRef = useRef(0)
  const metricsWindowStartRef = useRef(0)
  const metricsFrameCountRef = useRef(0)
  const inferenceMsRef = useRef(0)
  const recognizerWarmRef = useRef(false)
  const primaryHandednessRef = useRef<string | null>(null)

  const fistHoldStartRef = useRef(0)
  const voidTriggeredRef = useRef(false)
  const formingStartRef = useRef(0)
  const activeStartRef = useRef(0)
  const explosionStartRef = useRef(0)

  const processFrame = useCallback((frameTimestamp: number) => {
    const video = (window as unknown as Record<string, unknown>).__videoElement as HTMLVideoElement | undefined
    const recognizer = recognizerRef.current
    const scheduleNextFrame = () => {
      rafRef.current = requestAnimationFrame((nextTimestamp) => {
        processFrameRef.current(nextTimestamp)
      })
    }

    if (!video || !recognizer || video.readyState < 2) {
      scheduleNextFrame()
      return
    }

    if (
      video.currentTime === lastVideoTimeRef.current ||
      frameTimestamp - lastInferenceTimestampRef.current < TARGET_INFERENCE_INTERVAL_MS
    ) {
      scheduleNextFrame()
      return
    }

    lastVideoTimeRef.current = video.currentTime
    lastInferenceTimestampRef.current = frameTimestamp

    const inferenceStart = performance.now()
    const results = recognizer.recognizeForVideo(video, frameTimestamp)
    const now = performance.now()
    const inferenceMs = now - inferenceStart
    const store = useAppStore.getState()
    inferenceMsRef.current =
      inferenceMsRef.current === 0
        ? inferenceMs
        : inferenceMsRef.current + (inferenceMs - inferenceMsRef.current) * 0.2
    metricsFrameCountRef.current += 1
    if (metricsWindowStartRef.current === 0) {
      metricsWindowStartRef.current = now
    } else if (now - metricsWindowStartRef.current >= METRICS_WINDOW_MS) {
      const elapsed = now - metricsWindowStartRef.current
      store.setTrackingMetrics({
        inferenceFps: (metricsFrameCountRef.current * 1000) / elapsed,
        inferenceMs: inferenceMsRef.current,
      })
      metricsWindowStartRef.current = now
      metricsFrameCountRef.current = 0
    }

    if (!recognizerWarmRef.current) {
      recognizerWarmRef.current = true
      store.setTrackingStatus('ready')
      if (store.phase === 'loading') {
        store.setPhase('active')
      }
    }

    const orderedIndices = orderHandIndices(results, primaryHandednessRef.current)
    if (primaryHandednessRef.current === null && orderedIndices[0] !== undefined) {
      primaryHandednessRef.current =
        results.handedness[orderedIndices[0]]?.[0]?.categoryName ?? null
    }
    const primary = processHand(
      results,
      orderedIndices[0],
      primaryRuntimeRef.current,
      now,
    )
    const secondary = processHand(
      results,
      orderedIndices[1],
      secondaryRuntimeRef.current,
      now,
    )

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
    const fistDistance = bothFists ? distance(primary.position, secondary.position) : DUAL_HAND_SPAN.open
    const formationCompression = bothFists
      ? clamp01(
          (DUAL_HAND_SPAN.open - fistDistance) / (DUAL_HAND_SPAN.open - DUAL_HAND_SPAN.compressed),
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
        scheduleNextFrame()
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
                : 0

    const hasDirectGesture = primary.detected && primary.gesture !== 'none'
    const forceStrength =
      resolvedVoidPhase !== 'idle'
        ? clamp01(presence * modeForceBase + depth * 0.14 + orbit * 0.12)
        : interactionMode === 'duality'
          ? clamp01(presence * 0.3 + orbit * 0.24)
          : hasDirectGesture
            ? clamp01(presence * modeForceBase + depth * 0.14)
            : 0

    store.setHandTrackingFrame({
      gestureData: buildGestureData(results, orderedIndices),
      handPosition: primary.position,
      fingertipPosition: primary.fingertip,
      gestureType: primary.gesture,
      gestureScore: primary.score,
      handDetected: primary.detected,
      hand2Position: secondary.position,
      hand2FingertipPosition: secondary.fingertip,
      hand2GestureType: secondary.gesture,
      hand2GestureScore: secondary.score,
      hand2Detected: secondary.detected,
      forceStrength,
      interactionState: {
        mode: interactionMode,
        presence,
        duality,
        depth,
        focus,
        orbit,
      },
    })

    scheduleNextFrame()
  }, [])

  useEffect(() => {
    processFrameRef.current = processFrame
  }, [processFrame])

  useEffect(() => {
    if (!recognitionRequested) return

    let cancelled = false
    const primaryRuntime = primaryRuntimeRef.current
    const secondaryRuntime = secondaryRuntimeRef.current

    const init = async () => {
      try {
        useAppStore.getState().setTrackingStatus('loading_model')
        const { FilesetResolver, GestureRecognizer } = await import('@mediapipe/tasks-vision')
        if (cancelled) return
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH)
        if (cancelled) return

        let delegate: 'gpu' | 'cpu' = 'gpu'
        let recognizer: MediaPipeGestureRecognizer

        try {
          recognizer = await GestureRecognizer.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: MODEL_PATH,
              delegate: 'GPU',
            },
            numHands: 2,
            runningMode: 'VIDEO',
          })
        } catch (gpuError) {
          if (cancelled) return
          console.warn('[NeuralVoid] GPU gesture delegate unavailable, falling back to CPU.', gpuError)
          delegate = 'cpu'
          recognizer = await GestureRecognizer.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: MODEL_PATH,
              delegate: 'CPU',
            },
            numHands: 2,
            runningMode: 'VIDEO',
          })
        }

        if (cancelled) {
          recognizer.close()
          return
        }

        recognizerRef.current = recognizer
        recognizerWarmRef.current = false
        lastVideoTimeRef.current = -1
        lastInferenceTimestampRef.current = 0
        metricsWindowStartRef.current = 0
        metricsFrameCountRef.current = 0
        inferenceMsRef.current = 0
        useAppStore.getState().setTrackingMetrics({
          inferenceFps: 0,
          inferenceMs: 0,
          delegate,
        })
        useAppStore.getState().setTrackingStatus('warming_up')
        rafRef.current = requestAnimationFrame((timestamp) => {
          processFrameRef.current(timestamp)
        })
      } catch (error) {
        console.error('[NeuralVoid] GestureRecognizer init failed:', error)
        const store = useAppStore.getState()
        store.setTrackingStatus('error', '手势模型加载失败，请检查网络后重试。')
        if (store.phase === 'loading') {
          store.setPhase('idle')
        } else {
          store.setCameraEnabled(false)
        }
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
      recognizerWarmRef.current = false
      lastVideoTimeRef.current = -1
      lastInferenceTimestampRef.current = 0
      metricsWindowStartRef.current = 0
      metricsFrameCountRef.current = 0
      inferenceMsRef.current = 0
      primaryHandednessRef.current = null
      resetHandRuntime(primaryRuntime)
      resetHandRuntime(secondaryRuntime)
      fistHoldStartRef.current = 0
      voidTriggeredRef.current = false
      formingStartRef.current = 0
      activeStartRef.current = 0
      explosionStartRef.current = 0
    }
  }, [recognitionRequested])
}
