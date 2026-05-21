import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/appStore'

const CAMERA_CONSTRAINTS = {
  video: { width: 640, height: 480, facingMode: 'user' },
} satisfies MediaStreamConstraints

function stopCameraRuntime() {
  const globals = window as unknown as Record<string, unknown>
  const stream = globals.__cameraStream as MediaStream | undefined
  const video = globals.__videoElement as HTMLVideoElement | undefined

  if (video) {
    video.pause()
    video.srcObject = null
    video.remove()
    delete globals.__videoElement
  }

  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
    delete globals.__cameraStream
  }
}

function resetInteractionState() {
  const store = useAppStore.getState()
  store.setCameraReady(false)
  store.setHandDetected(false)
  store.setHand2Detected(false)
  store.setGestureType('none', 0)
  store.setHand2GestureType('none', 0)
  store.setForceStrength(0)
  store.setInteractionState({
    mode: 'idle',
    presence: 0,
    duality: 0,
    depth: 0,
    focus: 0,
    orbit: 0,
  })
  store.setVoidCorePhase('idle')
  store.setVoidCoreStrength(0)
  store.setVoidExplosionTime(-1)
}

export function useCamera() {
  const phase = useAppStore((s) => s.phase)
  const cameraEnabled = useAppStore((s) => s.cameraEnabled)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    let cancelled = false

    const attachVideo = async (stream: MediaStream) => {
      const globals = window as unknown as Record<string, unknown>
      const currentVideo = globals.__videoElement as HTMLVideoElement | undefined
      if (currentVideo) {
        currentVideo.pause()
        currentVideo.srcObject = null
        currentVideo.remove()
      }

      const video = document.createElement('video')
      video.playsInline = true
      video.autoplay = true
      video.muted = true
      video.srcObject = stream
      video.style.display = 'none'
      document.body.appendChild(video)
      videoRef.current = video
      globals.__videoElement = video

      await video.play()
      useAppStore.getState().setCameraReady(true)
    }

    const enableCamera = async () => {
      const globals = window as unknown as Record<string, unknown>
      let stream = globals.__cameraStream as MediaStream | undefined

      if (!stream || !stream.active || stream.getVideoTracks().every((track) => track.readyState === 'ended')) {
        stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS)
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        globals.__cameraStream = stream
      }

      await attachVideo(stream)
    }

    if (phase !== 'active' || !cameraEnabled) {
      stopCameraRuntime()
      videoRef.current = null
      resetInteractionState()
      return
    }

    enableCamera().catch((error) => {
      console.error('Camera runtime error:', error)
      useAppStore.getState().setCameraReady(false)
      useAppStore.getState().setCameraEnabled(false)
    })

    return () => {
      cancelled = true
      stopCameraRuntime()
      videoRef.current = null
      resetInteractionState()
    }
  }, [cameraEnabled, phase])

  return videoRef
}
