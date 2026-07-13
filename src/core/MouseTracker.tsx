import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { useAppStore } from '../store/appStore'

export function MouseTracker() {
  const previous = useRef({ x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY })

  useFrame((state) => {
    const { x, y } = state.pointer
    if (Math.abs(x - previous.current.x) > 0.002 || Math.abs(y - previous.current.y) > 0.002) {
      previous.current = { x, y }
      useAppStore.getState().setMouse(x, y)
    }
  })

  return null
}
