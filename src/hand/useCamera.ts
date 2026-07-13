import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/appStore'

const CAMERA_CONSTRAINTS = {
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 30, max: 30 },
    facingMode: 'user',
  },
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
  store.setHandTrackingFrame({
    gestureData: { gestures: [], landmarks: [], handedness: [] },
    handPosition: { x: 0, y: 0, z: 0 },
    fingertipPosition: { x: 0, y: 0, z: 0 },
    gestureType: 'none',
    gestureScore: 0,
    handDetected: false,
    hand2Position: { x: 0, y: 0, z: 0 },
    hand2FingertipPosition: { x: 0, y: 0, z: 0 },
    hand2GestureType: 'none',
    hand2GestureScore: 0,
    hand2Detected: false,
    forceStrength: 0,
    interactionState: {
      mode: 'idle',
      presence: 0,
      duality: 0,
      depth: 0,
      focus: 0,
      orbit: 0,
    },
  })
  store.setVoidCorePhase('idle')
  store.setVoidCoreStrength(0)
  store.setVoidExplosionTime(-1)
}

function waitForVideoReady(video: HTMLVideoElement) {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return Promise.resolve()
  }

  return new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup()
      reject(new Error('Camera video stream timed out.'))
    }, 5000)
    const handleReady = () => {
      cleanup()
      resolve()
    }
    const handleError = () => {
      cleanup()
      reject(new Error('Camera video stream did not become ready.'))
    }
    const cleanup = () => {
      window.clearTimeout(timeoutId)
      video.removeEventListener('loadeddata', handleReady)
      video.removeEventListener('error', handleError)
    }

    video.addEventListener('loadeddata', handleReady, { once: true })
    video.addEventListener('error', handleError, { once: true })
  })
}

export function useCamera() {
  const phase = useAppStore((s) => s.phase)
  const cameraEnabled = useAppStore((s) => s.cameraEnabled)
  const cameraRequested = phase !== 'idle'
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
      await waitForVideoReady(video)
      if (cancelled) return

      useAppStore.getState().setCameraReady(true)
      useAppStore.getState().setTrackingStatus('camera_ready')
    }

    const enableCamera = async () => {
      useAppStore.getState().setTrackingStatus('requesting_camera')
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

    if (!cameraRequested || !cameraEnabled) {
      stopCameraRuntime()
      videoRef.current = null
      resetInteractionState()
      const store = useAppStore.getState()
      if (store.trackingStatus !== 'error') {
        store.setTrackingStatus('idle')
      }
      return
    }

    enableCamera().catch((error) => {
      if (cancelled) return
      console.error('Camera runtime error:', error)
      const store = useAppStore.getState()
      store.setCameraReady(false)
      store.setTrackingStatus('error', '无法启动摄像头，请检查浏览器权限后重试。')
      if (store.phase === 'loading') {
        store.setPhase('idle')
      } else {
        store.setCameraEnabled(false)
      }
    })

    return () => {
      cancelled = true
      stopCameraRuntime()
      videoRef.current = null
      resetInteractionState()
    }
  }, [cameraEnabled, cameraRequested])

  return videoRef
}
