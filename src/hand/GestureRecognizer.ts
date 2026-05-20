import { useEffect, useRef, useCallback } from 'react'
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision'
import { useAppStore } from '../store/appStore'
import type { GestureType, Vec3 } from '../store/appStore'

const WASM_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/latest/gesture_recognizer.task'

// EMA smoothing factor — lower = smoother but more latency
const SMOOTHING = 0.35

// MediaPipe gesture names to our GestureType
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

// Map MediaPipe normalized [0,1] to Three.js world space
// Particles span roughly [-12, 12] in x, [-10, 10] in y, [-10, 10] in z
function toWorldSpace(mpX: number, mpY: number, mpZ: number): Vec3 {
  return {
    x: (mpX - 0.5) * 16,
    y: (0.55 - mpY) * 13 + 1.0,
    z: (mpZ + 0.05) * 10 - 3,
  }
}

// Hand center: average of wrist + middle finger MCP
const CENTER_INDICES = [0, 9]
// Index fingertip
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

export function useGestureRecognizer() {
  const phase = useAppStore((s) => s.phase)
  const recognizerRef = useRef<GestureRecognizer | null>(null)
  const rafRef = useRef<number>(0)
  const initializedRef = useRef(false)
  const smoothHandRef = useRef<Vec3>({ x: 0, y: 0, z: 0 })
  const smoothFingertipRef = useRef<Vec3>({ x: 0, y: 0, z: 0 })
  const prevGestureRef = useRef<GestureType>('none')

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

    if (results.gestures.length > 0 && results.landmarks.length > 0) {
      // Process first detected hand
      const gesture = results.gestures[0][0]
      const landmarks = results.landmarks[0]
      const detectedGesture = mapGesture(gesture?.categoryName ?? 'None')
      const score = gesture?.score ?? 0

      // Compute target positions
      const targetHand = computeHandCenter(landmarks)
      const targetFingertip = computeFingertip(landmarks)

      // EMA smooth
      smoothHandRef.current = lerpVec3(smoothHandRef.current, targetHand, SMOOTHING)
      smoothFingertipRef.current = lerpVec3(
        smoothFingertipRef.current,
        targetFingertip,
        SMOOTHING
      )

      store.setHandPosition(smoothHandRef.current)
      store.setFingertipPosition(smoothFingertipRef.current)
      store.setHandDetected(true)

      // Only update gesture if confidence is high enough
      if (score > 0.5) {
        if (detectedGesture !== prevGestureRef.current) {
          prevGestureRef.current = detectedGesture
        }
        store.setGestureType(detectedGesture, score)
      } else if (detectedGesture === 'none') {
        prevGestureRef.current = 'none'
        store.setGestureType('none', 0)
      }
    } else {
      store.setHandDetected(false)
      store.setGestureType('none', 0)
      // Don't reset hand position — particles will coast with last known position
    }

    rafRef.current = requestAnimationFrame(processFrame)
  }, [])

  useEffect(() => {
    if (phase !== 'active' || initializedRef.current) return

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
          numHands: 1,
          runningMode: 'VIDEO',
        })

        if (cancelled) {
          recognizer.close()
          return
        }

        recognizerRef.current = recognizer
        initializedRef.current = true
        rafRef.current = requestAnimationFrame(processFrame)
      } catch (err) {
        console.error('Failed to initialize GestureRecognizer:', err)
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
