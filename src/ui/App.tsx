import { useAppStore } from '../store/appStore'
import { Scene } from '../core/Scene'
import { EnterScreen } from './EnterScreen'
import { DebugOverlay } from './DebugOverlay'
import { useCamera } from '../hand/useCamera'
import { useGestureRecognizer } from '../hand/GestureRecognizer'

export function App() {
  const phase = useAppStore((s) => s.phase)

  useCamera()
  useGestureRecognizer()

  return (
    <>
      <Scene />
      {phase !== 'active' && <EnterScreen />}
      <DebugOverlay />
    </>
  )
}
