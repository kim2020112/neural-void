import { useFrame } from '@react-three/fiber'
import { useAppStore } from '../store/appStore'

export function MouseTracker() {
  useFrame((state) => {
    const { x, y } = state.pointer
    useAppStore.getState().setMouse(x, y)
  })

  return null
}
