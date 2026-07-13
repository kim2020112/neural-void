import { useAppStore } from '../store/appStore'
import { Scene } from '../core/Scene'
import { EnterScreen } from './EnterScreen'
import { DebugOverlay } from './DebugOverlay'
import { useCamera } from '../hand/useCamera'
import { useGestureRecognizer } from '../hand/GestureRecognizer'
import { TrackingCursorOverlay } from './TrackingCursorOverlay'
import { SceneHud } from './SceneHud'

export function App() {
  const phase = useAppStore((s) => s.phase)

  useCamera()
  useGestureRecognizer()

  return (
    <>
      <Scene />
      {phase !== 'active' && <EnterScreen />}
      {phase === 'active' && <TrackingCursorOverlay />}
      <SceneHud />
      <DebugOverlay />
    </>
  )
}
