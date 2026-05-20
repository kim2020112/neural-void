import { useEffect, useRef, useCallback } from 'react'
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision'
import { useAppStore } from '../store/appStore'

const WASM_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm'
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/latest/gesture_recognizer.task'

export function useGestureRecognizer() {
  const phase = useAppStore((s) => s.phase)
  const setGestureData = useAppStore((s) => s.setGestureData)
  const recognizerRef = useRef<GestureRecognizer | null>(null)
  const rafRef = useRef<number>(0)
  const initializedRef = useRef(false)

  const processFrame = useCallback(() => {
    const video = (window as unknown as Record<string, unknown>)
      .__videoElement as HTMLVideoElement | undefined
    const recognizer = recognizerRef.current

    if (!video || !recognizer || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(processFrame)
      return
    }

    const results = recognizer.recognizeForVideo(video, performance.now())

    if (results.gestures.length > 0) {
      const gestures = results.gestures.map((g, i) => ({
        categoryName: g[0]?.categoryName ?? 'None',
        score: g[0]?.score ?? 0,
        handedness: results.handedness[i]?.[0]?.categoryName ?? 'Unknown',
      }))

      const landMarkList = results.landmarks.map((lm) =>
        lm.map((l) => ({ x: l.x, y: l.y, z: l.z }))
      )

      const handList = results.handedness.map(
        (h) => h[0]?.categoryName ?? 'Unknown'
      )

      setGestureData({
        gestures,
        landmarks: landMarkList,
        handedness: handList,
      })
    } else {
      setGestureData({ gestures: [], landmarks: [], handedness: [] })
    }

    rafRef.current = requestAnimationFrame(processFrame)
  }, [setGestureData])

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
          numHands: 2,
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
        useAppStore.getState().setPhase('idle')
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
