import { useAppStore } from '../store/appStore'
import { Scene } from '../core/Scene'
import { EnterScreen } from './EnterScreen'
import { useCamera } from '../hand/useCamera'
import { useGestureRecognizer } from '../hand/GestureRecognizer'

export function App() {
  const phase = useAppStore((s) => s.phase)

  // Initialize camera stream when phase becomes 'active'
  useCamera()
  // Run gesture recognition
  useGestureRecognizer()

  return (
    <>
      <Scene />
      {phase !== 'active' && <EnterScreen />}
    </>
  )
}
