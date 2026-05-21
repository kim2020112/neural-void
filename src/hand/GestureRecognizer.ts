import { useEffect, useRef, useCallback } from 'react'
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision'
import { useAppStore } from '../store/appStore'
import type { GestureType, Vec3 } from '../store/appStore'

const WASM_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/latest/gesture_recognizer.task'

const SMOOTHING = 0.35

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

const CENTER_INDICES = [0, 9]
const FINGERTIP_INDEX = 8

function computeHandCenter(landmarks: { x: number; y: number; z: number }[]): Vec3 {
  let sx = 0,
    sy = 0,
    sz = 0
  for (const i of CENTER_INDICES) {
    sx += landmarks[i].x
    sy += landmarks[i].y
    sz += landmarks[i].z
  }
  return toWorldSpace(
    sx / CENTER_INDICES.length,
    sy / CENTER_INDICES.length,
    sz / CENTER_INDICES.length
  )
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

// ─── Gesture Hysteresis State Machine ──────────────────────
// MediaPipe alternates between specific gestures and "None" rapidly.
// This state machine locks onto a gesture and requires sustained
// evidence to release it, preventing output flicker.

const HYSTERESIS = {
  activate: 4,   // frames to lock a new specific gesture
  release: 10,   // frames of "None" before releasing to none
  maxLock: 30,   // maximum lock frames for a gesture
}

interface HysteresisState {
  lockedGesture: GestureType
  lockCounter: number
  noneCounter: number
  candidateGesture: GestureType
  candidateCounter: number
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

function updateHysteresis(
  state: HysteresisState,
  rawGesture: GestureType,
  rawScore: number
): GestureType {
  if (rawGesture !== 'none' && rawScore > 0.45) {
    // Specific gesture detected
    state.noneCounter = 0

    if (rawGesture === state.candidateGesture) {
      state.candidateCounter++
    } else {
      state.candidateGesture = rawGesture
      state.candidateCounter = 1
    }

    // Lock onto candidate after enough evidence
    if (state.candidateCounter >= HYSTERESIS.activate) {
      state.lockedGesture = rawGesture
      state.lockCounter = HYSTERESIS.maxLock
      state.candidateCounter = 0
    }
  } else {
    // "None" or low confidence
    state.candidateCounter = Math.max(0, state.candidateCounter - 1)
    state.noneCounter++

    // Release lock after sustained "None"
    if (state.noneCounter >= HYSTERESIS.release) {
      state.lockedGesture = 'none'
      state.lockCounter = 0
    }
  }

  // Auto-release after max lock (prevents stuck gestures)
  if (state.lockCounter > 0) {
    state.lockCounter--
    return state.lockedGesture === 'none' ? state.candidateGesture || 'none' : state.lockedGesture
  }

  // Lock expired — release to none
  if (state.lockedGesture !== 'none') {
    state.lockedGesture = 'none'
  }

  return state.lockedGesture
}

export function useGestureRecognizer() {
  const phase = useAppStore((s) => s.phase)
  const recognizerRef = useRef<GestureRecognizer | null>(null)
  const rafRef = useRef<number>(0)
  const initializedRef = useRef(false)
  const smoothHandRef = useRef<Vec3>({ x: 0, y: 0, z: 0 })
  const smoothFingertipRef = useRef<Vec3>({ x: 0, y: 0, z: 0 })
  const hysteresisRef = useRef<HysteresisState>(createHysteresisState())
  // Second hand
  const smoothHandRef2 = useRef<Vec3>({ x: 0, y: 0, z: 0 })
  const smoothFingertipRef2 = useRef<Vec3>({ x: 0, y: 0, z: 0 })
  const hysteresisRef2 = useRef<HysteresisState>(createHysteresisState())
  const frameCountRef = useRef(0)
  // Void core trigger state
  const fistHoldStartRef = useRef(0)
  const voidTriggeredRef = useRef(false)
  const formingStartRef = useRef(0)

  const processFrame = useCallback(() => {
    const video = (window as unknown as Record<string, unknown>)
      .__videoElement as HTMLVideoElement | undefined
    const recognizer = recognizerRef.current

    if (!video || !recognizer || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(processFrame)
      return
    }

    const results = recognizer.recognizeForVideo(video, performance.now())
    const store = useAppStore.getState()
    frameCountRef.current++

    // ── Process Hand 0 ──────────────────────────────────────
    const h0Detected = results.landmarks.length > 0
    let h0Gesture: GestureType = 'none'
    let h0Pos: Vec3 = { x: 0, y: 0, z: 0 }

    if (h0Detected) {
      const gesture = results.gestures[0][0]
      const landmarks = results.landmarks[0]
      const rawGesture = mapGesture(gesture?.categoryName ?? 'None')
      const rawScore = gesture?.score ?? 0

      const targetHand = computeHandCenter(landmarks)
      const targetFingertip = computeFingertip(landmarks)

      smoothHandRef.current = lerpVec3(smoothHandRef.current, targetHand, SMOOTHING)
      smoothFingertipRef.current = lerpVec3(smoothFingertipRef.current, targetFingertip, SMOOTHING)

      store.setHandPosition(smoothHandRef.current)
      store.setFingertipPosition(smoothFingertipRef.current)
      store.setHandDetected(true)

      h0Gesture = updateHysteresis(hysteresisRef.current, rawGesture, rawScore)
      store.setGestureType(h0Gesture, rawScore)
      h0Pos = smoothHandRef.current
    } else {
      hysteresisRef.current.noneCounter++
      if (hysteresisRef.current.noneCounter >= HYSTERESIS.release) {
        hysteresisRef.current = createHysteresisState()
      }
      store.setHandDetected(false)
      store.setGestureType('none', 0)
    }

    // ── Process Hand 1 ──────────────────────────────────────
    const h1Detected = results.landmarks.length > 1
    let h1Gesture: GestureType = 'none'
    let h1Pos: Vec3 = { x: 0, y: 0, z: 0 }

    if (h1Detected) {
      const gesture = results.gestures[1][0]
      const landmarks = results.landmarks[1]
      const rawGesture = mapGesture(gesture?.categoryName ?? 'None')
      const rawScore = gesture?.score ?? 0

      const targetHand = computeHandCenter(landmarks)
      const targetFingertip = computeFingertip(landmarks)

      smoothHandRef2.current = lerpVec3(smoothHandRef2.current, targetHand, SMOOTHING)
      smoothFingertipRef2.current = lerpVec3(smoothFingertipRef2.current, targetFingertip, SMOOTHING)

      store.setHand2Position(smoothHandRef2.current)
      store.setHand2FingertipPosition(smoothFingertipRef2.current)
      store.setHand2Detected(true)

      h1Gesture = updateHysteresis(hysteresisRef2.current, rawGesture, rawScore)
      store.setHand2GestureType(h1Gesture)
      h1Pos = smoothHandRef2.current
    } else {
      hysteresisRef2.current.noneCounter++
      if (hysteresisRef2.current.noneCounter >= HYSTERESIS.release) {
        hysteresisRef2.current = createHysteresisState()
      }
      store.setHand2Detected(false)
      store.setHand2GestureType('none')
    }

    // ── Void Core trigger evaluation ────────────────────────
    const bothFists = h0Gesture === 'fist' && h1Gesture === 'fist' && h0Detected && h1Detected
    const singleFist = h0Gesture === 'fist' && h0Detected && !h1Detected

    if (!voidTriggeredRef.current) {
      if (bothFists) {
        // Instant trigger on both fists
        voidTriggeredRef.current = true
        formingStartRef.current = performance.now()
        store.setVoidCorePhase('forming')
        store.setVoidCenter({
          x: (h0Pos.x + h1Pos.x) / 2,
          y: (h0Pos.y + h1Pos.y) / 2,
          z: (h0Pos.z + h1Pos.z) / 2,
        })
        fistHoldStartRef.current = 0
      } else if (singleFist) {
        // Single fist hold timer
        if (fistHoldStartRef.current === 0) {
          fistHoldStartRef.current = performance.now()
        } else if (performance.now() - fistHoldStartRef.current > 2000) {
          voidTriggeredRef.current = true
          formingStartRef.current = performance.now()
          store.setVoidCorePhase('forming')
          store.setVoidCenter({ ...h0Pos })
          fistHoldStartRef.current = 0
        }
      } else {
        fistHoldStartRef.current = 0
      }
    }

    // ── Void Core sustain / explode / decay ─────────────────
    if (voidTriggeredRef.current) {
      const vcp = store.voidCorePhase

      // Update void center to follow hands
      if (bothFists) {
        store.setVoidCenter({
          x: (h0Pos.x + h1Pos.x) / 2,
          y: (h0Pos.y + h1Pos.y) / 2,
          z: (h0Pos.z + h1Pos.z) / 2,
        })
      } else if (h0Detected) {
        store.setVoidCenter({ ...h0Pos })
      }

      // Explosion trigger: fist → open_palm
      const anyOpenPalm = h0Gesture === 'open_palm' || (h1Detected && h1Gesture === 'open_palm')
      if (anyOpenPalm && vcp === 'active') {
        voidTriggeredRef.current = false
        store.setVoidCorePhase('exploding')
        rafRef.current = requestAnimationFrame(processFrame)
        return
      }

      // Sustain: at least one fist still held
      const anyFist = h0Gesture === 'fist' || (h1Detected && h1Gesture === 'fist')
      if (!anyFist && vcp !== 'forming') {
        // Fists lost without palm open — decay
        voidTriggeredRef.current = false
        store.setVoidCorePhase('idle')
      }

      // Forming → active transition after 0.5s
      if (vcp === 'forming' && performance.now() - formingStartRef.current > 500) {
        store.setVoidCorePhase('active')
      }

      // Reset void if both hands gone
      if (!h0Detected && !h1Detected && vcp !== 'exploding') {
        voidTriggeredRef.current = false
        store.setVoidCorePhase('idle')
      }
    }

    // Log every 60 frames
    if (frameCountRef.current % 60 === 1) {
      const h0Raw = results.gestures[0]?.[0]?.categoryName ?? '-'
      const h1Raw = results.gestures[1]?.[0]?.categoryName ?? '-'
      console.log(
        `[NeuralVoid] frame=${frameCountRef.current} ` +
          `H0=${h0Raw}→${h0Gesture} H1=${h1Raw}→${h1Gesture} ` +
          `void=${store.voidCorePhase} triggered=${voidTriggeredRef.current}`
      )
    }

    rafRef.current = requestAnimationFrame(processFrame)
  }, [])

  useEffect(() => {
    if (phase !== 'active' || initializedRef.current) return

    let cancelled = false

    const init = async () => {
      try {
        console.log('[NeuralVoid] Loading MediaPipe WASM...')
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH)
        if (cancelled) return

        console.log('[NeuralVoid] WASM loaded, creating GestureRecognizer...')
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

        console.log('[NeuralVoid] GestureRecognizer ready, starting RAF loop')
        recognizerRef.current = recognizer
        initializedRef.current = true
        frameCountRef.current = 0
        rafRef.current = requestAnimationFrame(processFrame)
      } catch (err) {
        console.error('[NeuralVoid] GestureRecognizer init failed:', err)
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
    }
  }, [phase, processFrame])
}
