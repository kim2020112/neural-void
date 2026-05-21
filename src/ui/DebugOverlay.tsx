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
  const hand2Detected = useAppStore((s) => s.hand2Detected)
  const hand2GestureType = useAppStore((s) => s.hand2GestureType)
  const voidCorePhase = useAppStore((s) => s.voidCorePhase)
  const voidCoreStrength = useAppStore((s) => s.voidCoreStrength)
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
      {/* ── Hand 2 ── */}
      <div style={{ height: 1, background: 'rgba(0,255,255,0.1)', margin: '4px 0' }} />
      <div style={styles.row}>
        <span>Hand2</span>
        <span style={{ color: hand2Detected ? '#4f4' : '#f44' }}>
          {hand2Detected ? 'DETECTED' : 'NONE'}
        </span>
      </div>
      {hand2Detected && (
        <div style={styles.row}>
          <span>H2 Gesture</span>
          <span style={{ color: gestureColor(hand2GestureType), fontWeight: 700 }}>
            {hand2GestureType}
          </span>
        </div>
      )}
      {/* ── Void Core ── */}
      <div style={{ height: 1, background: 'rgba(255,136,0,0.15)', margin: '4px 0' }} />
      <div style={styles.row}>
        <span>Void Core</span>
        <span style={{
          color: voidCorePhase === 'idle' ? '#666' :
                 voidCorePhase === 'exploding' ? '#ff4444' : '#ff8800',
          fontWeight: 700,
        }}>
          {voidCorePhase}
        </span>
      </div>
      {voidCorePhase !== 'idle' && (
        <div style={styles.row}>
          <span>Void Str</span>
          <span>{voidCoreStrength.toFixed(3)}</span>
        </div>
      )}
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
