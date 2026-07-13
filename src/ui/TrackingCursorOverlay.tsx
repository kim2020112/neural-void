import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/appStore'
import type { GestureType, Vec3 } from '../store/appStore'

type AppSnapshot = ReturnType<typeof useAppStore.getState>

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function gestureMeta(gesture: GestureType) {
  switch (gesture) {
    case 'fist':
      return { label: '握拳', color: '#ffad66' }
    case 'open_palm':
      return { label: '张开手掌', color: '#72e6ff' }
    case 'point':
      return { label: '伸出食指', color: '#ffe07d' }
    default:
      return { label: '已锁定', color: '#9bdfff' }
  }
}

function toScreenPosition(position: Vec3) {
  return {
    x: clamp01(0.5 + position.x / 15) * window.innerWidth,
    y: clamp01(0.55 - (position.y - 0.9) / 12) * window.innerHeight,
  }
}

function updateCursor(
  element: HTMLDivElement | null,
  labelElement: HTMLDivElement | null,
  arcElement: HTMLDivElement | null,
  detected: boolean,
  position: Vec3,
  gesture: GestureType,
  score: number,
  prefix: string,
  idleFade: number,
  saturnMode: boolean,
) {
  if (!element || !labelElement) return

  if (!detected) {
    element.style.opacity = '0'
    return
  }

  const screen = toScreenPosition(position)
  const meta = gestureMeta(gesture)
  const label = `${prefix} · ${meta.label}${gesture === 'none' ? '' : ` ${Math.round(score * 100)}%`}`

  const opacity = 0.35 + 0.3 * idleFade
  element.style.opacity = String(opacity)
  element.style.transform = `translate3d(${screen.x}px, ${screen.y}px, 0) translate(-50%, -50%)`

  if (saturnMode) {
    element.style.color = '#7edaff'
    element.style.borderColor = 'rgba(126, 218, 255, 0.85)'
    element.style.boxShadow = '0 0 10px rgba(126, 218, 255, 0.28), inset 0 0 10px rgba(126, 218, 255, 0.08)'
    if (arcElement) {
      const active = gesture !== 'none'
      arcElement.style.opacity = active ? '0.95' : '0'
      arcElement.style.borderColor = meta.color
      arcElement.style.boxShadow = active ? `0 0 8px ${meta.color}88` : 'none'
    }
    labelElement.style.color = meta.color
  } else {
    element.style.color = meta.color
    element.style.borderColor = meta.color
    element.style.boxShadow = `0 0 10px ${meta.color}55, inset 0 0 10px ${meta.color}22`
    if (arcElement) arcElement.style.opacity = '0'
    labelElement.style.color = meta.color
  }

  if (labelElement.textContent !== label) labelElement.textContent = label
}

function trackingHint(state: AppSnapshot) {
  if (!state.cameraEnabled) return '摄像头已关闭'
  if (!state.handDetected && !state.hand2Detected) return '请将手掌放入摄像头画面'
  if (state.gestureType === 'none') return '已识别手部 · 握拳聚拢，张开手掌扩散，伸出食指牵引'
  return `已识别：${gestureMeta(state.gestureType).label}`
}

export function TrackingCursorOverlay() {
  const primaryRef = useRef<HTMLDivElement>(null)
  const primaryLabelRef = useRef<HTMLDivElement>(null)
  const primaryArcRef = useRef<HTMLDivElement>(null)
  const secondaryRef = useRef<HTMLDivElement>(null)
  const secondaryLabelRef = useRef<HTMLDivElement>(null)
  const secondaryArcRef = useRef<HTMLDivElement>(null)
  const hintRef = useRef<HTMLDivElement>(null)
  const lastMoveRef = useRef(0)
  const lastPosRef = useRef({ x: 0, y: 0, z: 0 })
  const idleFadeRef = useRef(1)

  useEffect(() => {
    let raf = 0
    lastMoveRef.current = performance.now()

    const tick = () => {
      const state = useAppStore.getState()
      const pos = state.handPosition
      const moved =
        Math.abs(pos.x - lastPosRef.current.x) +
          Math.abs(pos.y - lastPosRef.current.y) +
          Math.abs(pos.z - lastPosRef.current.z) >
        0.01

      if (moved || state.gestureType !== 'none') {
        lastMoveRef.current = performance.now()
        lastPosRef.current = { x: pos.x, y: pos.y, z: pos.z }
        idleFadeRef.current = Math.min(1, idleFadeRef.current + 0.08)
      } else if (performance.now() - lastMoveRef.current > 1000) {
        idleFadeRef.current = Math.max(0, idleFadeRef.current - 0.03)
      }

      const saturnMode = state.particleShape === 'saturn_ring'

      updateCursor(
        primaryRef.current,
        primaryLabelRef.current,
        primaryArcRef.current,
        state.handDetected,
        state.handPosition,
        state.gestureType,
        state.gestureScore,
        '主手',
        idleFadeRef.current,
        saturnMode,
      )
      updateCursor(
        secondaryRef.current,
        secondaryLabelRef.current,
        secondaryArcRef.current,
        state.hand2Detected,
        state.hand2Position,
        state.hand2GestureType,
        state.hand2GestureScore,
        '副手',
        idleFadeRef.current,
        saturnMode,
      )

      if (hintRef.current) {
        // Saturn mode uses SaturnSceneHud top badge instead
        if (saturnMode) {
          hintRef.current.style.opacity = '0'
        } else {
          hintRef.current.style.opacity = '1'
          const hint = trackingHint(state)
          if (hintRef.current.textContent !== hint) hintRef.current.textContent = hint
        }
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div style={styles.root} aria-hidden="true">
      <div ref={hintRef} style={styles.hint} />

      <div ref={primaryRef} style={styles.cursor}>
        <div ref={primaryArcRef} style={styles.goldArc} />
        <div style={styles.crossHorizontal} />
        <div style={styles.crossVertical} />
        <div style={styles.dot} />
        <div ref={primaryLabelRef} style={styles.label} />
      </div>

      <div ref={secondaryRef} style={{ ...styles.cursor, ...styles.secondaryCursor }}>
        <div ref={secondaryArcRef} style={styles.goldArc} />
        <div style={styles.crossHorizontal} />
        <div style={styles.crossVertical} />
        <div style={styles.dot} />
        <div ref={secondaryLabelRef} style={styles.label} />
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'fixed',
    inset: 0,
    zIndex: 210,
    pointerEvents: 'none',
    overflow: 'hidden',
  },
  hint: {
    position: 'absolute',
    top: 22,
    left: '50%',
    transform: 'translateX(-50%)',
    minHeight: 34,
    display: 'flex',
    alignItems: 'center',
    padding: '0 14px',
    borderRadius: 999,
    border: '1px solid rgba(126, 218, 255, 0.14)',
    background: 'rgba(4, 10, 22, 0.62)',
    boxShadow: '0 8px 28px rgba(0, 0, 0, 0.22)',
    backdropFilter: 'blur(12px)',
    color: '#dff7ff',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    whiteSpace: 'nowrap',
  },
  cursor: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 52,
    height: 52,
    borderRadius: '50%',
    border: '1.5px solid #9bdfff',
    opacity: 0,
    transition: 'border-color 120ms ease-out, box-shadow 120ms ease-out',
    willChange: 'transform, opacity',
  },
  secondaryCursor: {
    width: 44,
    height: 44,
    borderStyle: 'dashed',
  },
  goldArc: {
    position: 'absolute',
    inset: -4,
    borderRadius: '50%',
    border: '2px solid #ffc13d',
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    opacity: 0,
    transition: 'opacity 120ms ease-out',
    pointerEvents: 'none',
  },
  crossHorizontal: {
    position: 'absolute',
    left: -8,
    right: -8,
    top: '50%',
    height: 1,
    background: 'currentColor',
    opacity: 0.32,
  },
  crossVertical: {
    position: 'absolute',
    top: -8,
    bottom: -8,
    left: '50%',
    width: 1,
    background: 'currentColor',
    opacity: 0.32,
  },
  dot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 6,
    height: 6,
    transform: 'translate(-50%, -50%)',
    borderRadius: '50%',
    background: '#effcff',
    boxShadow: '0 0 8px rgba(155, 223, 255, 0.55)',
  },
  label: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '3px 7px',
    borderRadius: 999,
    background: 'rgba(2, 7, 16, 0.72)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#9bdfff',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  },
}