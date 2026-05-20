import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/appStore'

export function useCamera() {
  const phase = useAppStore((s) => s.phase)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (phase !== 'active') return

    const stream = (window as unknown as Record<string, unknown>)
      .__cameraStream as MediaStream | undefined
    if (!stream) return

    const video = document.createElement('video')
    video.playsInline = true
    video.autoplay = true
    video.muted = true
    video.srcObject = stream
    video.style.display = 'none'
    document.body.appendChild(video)
    videoRef.current = video
    ;(window as unknown as Record<string, unknown>).__videoElement = video

    video.play().catch(console.error)

    return () => {
      video.pause()
      video.srcObject = null
      video.remove()
      videoRef.current = null
      delete (window as unknown as Record<string, unknown>).__videoElement
    }
  }, [phase])

  return videoRef
}
