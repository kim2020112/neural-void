import { useEffect, useState } from 'react'
import { useAppStore } from '../store/appStore'
import type { GestureType } from '../store/appStore'

export function DebugOverlay() {
  const phase = useAppStore((s) => s.phase)
  const handDetected = useAppStore((s) => s.handDetected)
  const gestureType = useAppStore((s) => s.gestureType)
  const gestureScore = useAppStore((s) => s.gestureScore)
  const handPosition = useAppStore((s) => s.handPosition)
  const forceStrength = useAppStore((s) => s.forceStrength)
  const [fps, setFps] = useState(0)

  useEffect(() => {
    let last = performance.now()
    let frames = 0
    let raf = 0
    const tick = () => {
      frames++
      const now = performance.now()
      if (now - last >= 1000) {
        setFps(frames)
        frames = 0
        last = now
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  if (phase !== 'active') return null

  const gestureColor = (type: GestureType) => {
    switch (type) {
      case 'fist':
        return '#ff4444'
      case 'open_palm':
        return '#44ff44'
      case 'point':
        return '#44aaff'
      default:
        return '#666'
    }
  }

  return (
    <div style={styles.panel}>
      <div style={styles.row}>
        <span>FPS</span>
        <span style={{ color: fps >= 55 ? '#4f4' : '#f44' }}>{fps}</span>
      </div>
      <div style={styles.row}>
        <span>Hand</span>
        <span style={{ color: handDetected ? '#4f4' : '#f44' }}>
          {handDetected ? 'DETECTED' : 'NONE'}
        </span>
      </div>
      <div style={styles.row}>
        <span>Gesture</span>
        <span style={{ color: gestureColor(gestureType), fontWeight: 700 }}>
          {gestureType}
        </span>
      </div>
      <div style={styles.row}>
        <span>Score</span>
        <span>{gestureScore.toFixed(2)}</span>
      </div>
      <div style={styles.row}>
        <span>Force</span>
        <span>{forceStrength.toFixed(3)}</span>
      </div>
      <div style={styles.row}>
        <span>Hand XYZ</span>
        <span style={{ fontSize: 10 }}>
          {handPosition.x.toFixed(1)},{handPosition.y.toFixed(1)},{handPosition.z.toFixed(1)}
        </span>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    top: 12,
    left: 12,
    zIndex: 200,
    background: 'rgba(0,0,0,0.75)',
    border: '1px solid rgba(0,255,255,0.2)',
    borderRadius: 4,
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#aaa',
    minWidth: 180,
    backdropFilter: 'blur(4px)',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
  },
}
