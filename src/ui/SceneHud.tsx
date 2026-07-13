import { useEffect, useMemo, useRef, useState } from 'react'
import { getSceneProfile } from '../scenes/sceneProfiles'
import { useAppStore, type InteractionMode } from '../store/appStore'

function smoothstep(value: number, edge0: number, edge1: number) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function OrbitDiagram({ mode }: { mode: InteractionMode }) {
  const compressed = mode === 'attract' || mode === 'forming_void' || mode === 'void_core'
  const expanded = mode === 'repel' || mode === 'exploding'
  const coreActive = mode === 'forming_void' || mode === 'void_core' || mode === 'exploding'
  const boost = compressed ? 0.86 : expanded ? 1.12 : mode === 'point' ? 1.04 : 1
  const mainRadius = 34 * boost
  const innerRadius = 22 * (compressed ? 0.92 : 1)
  const outerRadius = 42 * (expanded ? 1.08 : 1)

  return (
    <svg width="120" height="72" viewBox="0 0 120 72" aria-hidden>
      <ellipse cx="60" cy="38" rx={outerRadius} ry={outerRadius * 0.32} fill="none" stroke="rgba(255,178,28,0.22)" strokeWidth="1" />
      <ellipse cx="60" cy="38" rx={mainRadius} ry={mainRadius * 0.32} fill="none" stroke="#ffc13d" strokeWidth="1.6" opacity="0.9" />
      <ellipse cx="60" cy="38" rx={innerRadius} ry={innerRadius * 0.32} fill="none" stroke="rgba(255,178,28,0.45)" strokeWidth="1" />
      {coreActive && <circle cx="60" cy="38" r="14" fill="none" stroke="rgba(255,193,61,0.32)" strokeWidth="1" />}
      <circle cx="60" cy="38" r={coreActive ? 10 : 8} fill="url(#scene-core-gradient)" />
      <circle cx="60" cy="38" r="3.2" fill="#e8faff" opacity="0.95" />
      {mode === 'point' && (
        <path d="M78 28 C90 30, 96 36, 94 44" fill="none" stroke="#ffe07d" strokeWidth="1.4" opacity="0.9" />
      )}
      {mode === 'duality' && (
        <>
          <circle cx="22" cy="38" r="3" fill="#ffd36b" />
          <circle cx="98" cy="38" r="3" fill="#ffd36b" />
          <path d="M26 38 H94" stroke="rgba(255,211,107,0.6)" strokeWidth="1" />
        </>
      )}
      <defs>
        <radialGradient id="scene-core-gradient" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#e8faff" />
          <stop offset="55%" stopColor="#4dbeff" />
          <stop offset="100%" stopColor="#0d5c91" />
        </radialGradient>
      </defs>
    </svg>
  )
}

function SingularityDiagram({
  mode,
  strength,
}: {
  mode: InteractionMode
  strength: number
}) {
  const compressed = mode === 'attract' || mode === 'forming_void' || mode === 'void_core'
  const expanded = mode === 'repel' || mode === 'exploding'
  const dual = mode === 'duality' || mode === 'forming_void' || mode === 'void_core'
  const diskScale = compressed
    ? 1 - strength * 0.16
    : expanded
      ? 1 + strength * 0.12
      : 1
  const jetLength = 18 + strength * (mode === 'exploding' ? 14 : compressed ? 7 : 2)
  const diskRadius = 38 * diskScale

  return (
    <svg width="120" height="72" viewBox="0 0 120 72" aria-hidden>
      <path d={`M60 ${36 - jetLength} L60 ${36 + jetLength}`} stroke="rgba(94,225,255,0.32)" strokeWidth="5" />
      <path d={`M60 ${36 - jetLength} L60 ${36 + jetLength}`} stroke="#8cecff" strokeWidth="1.2" />
      <ellipse cx="60" cy="36" rx={diskRadius + 7} ry={(diskRadius + 7) * 0.23} fill="none" stroke="rgba(255,106,34,0.25)" strokeWidth="1" />
      <ellipse cx="60" cy="36" rx={diskRadius} ry={diskRadius * 0.23} fill="none" stroke="#ffb34f" strokeWidth="2" />
      <ellipse cx="60" cy="36" rx={diskRadius - 8} ry={(diskRadius - 8) * 0.23} fill="none" stroke="rgba(255,239,188,0.7)" strokeWidth="1" />
      <circle cx="60" cy="36" r="10.5" fill="#000" stroke="#fff0bc" strokeWidth="1.5" />
      <circle cx="60" cy="36" r="13.2" fill="none" stroke="rgba(255,151,48,0.62)" strokeWidth="1" />
      {mode === 'point' && (
        <>
          <circle cx="91" cy="25" r="4" fill="none" stroke="#8cecff" strokeWidth="1" />
          <path d="M86 23 C78 21, 72 25, 68 31" fill="none" stroke="#8cecff" strokeWidth="1.3" />
        </>
      )}
      {dual && (
        <>
          <circle cx="18" cy="36" r="3" fill="#ffd06a" />
          <circle cx="102" cy="36" r="3" fill="#ffd06a" />
          <path d="M22 36 H47 M73 36 H98" stroke="rgba(255,208,106,0.65)" strokeWidth="1" />
        </>
      )}
      {mode === 'exploding' && (
        <circle cx="60" cy="36" r={17 + strength * 12} fill="none" stroke="rgba(255,244,204,0.72)" strokeWidth="1.4" />
      )}
    </svg>
  )
}

export function SceneHud() {
  const particleShape = useAppStore((state) => state.particleShape)
  const phase = useAppStore((state) => state.phase)
  const forceStrength = useAppStore((state) => state.forceStrength)
  const interactionState = useAppStore((state) => state.interactionState)
  const voidCorePhase = useAppStore((state) => state.voidCorePhase)
  const voidCoreStrength = useAppStore((state) => state.voidCoreStrength)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [compact, setCompact] = useState(false)
  const [displayPercent, setDisplayPercent] = useState(0)
  const scanRef = useRef<HTMLDivElement>(null)
  const strengthTarget = useRef(0)
  const profile = getSceneProfile(particleShape)
  const hud = profile.hud
  const activeMode: InteractionMode =
    voidCorePhase === 'forming'
      ? 'forming_void'
      : voidCorePhase === 'active'
        ? 'void_core'
        : voidCorePhase === 'exploding'
          ? 'exploding'
          : interactionState.mode
  const copy = useMemo(() => hud?.interactions[activeMode], [activeMode, hud])

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const compactQuery = window.matchMedia('(max-width: 760px)')
    const apply = () => {
      setReducedMotion(motionQuery.matches)
      setCompact(compactQuery.matches)
    }
    apply()
    motionQuery.addEventListener?.('change', apply)
    compactQuery.addEventListener?.('change', apply)
    return () => {
      motionQuery.removeEventListener?.('change', apply)
      compactQuery.removeEventListener?.('change', apply)
    }
  }, [])

  useEffect(() => {
    strengthTarget.current =
      activeMode === 'void_core'
        ? 1
        : activeMode === 'forming_void' || activeMode === 'exploding'
          ? voidCoreStrength
          : activeMode === 'idle'
            ? 0
            : smoothstep(forceStrength, 0.05, 0.92)
  }, [activeMode, forceStrength, voidCoreStrength])

  useEffect(() => {
    let frame = 0
    let current = 0
    let lastPercent = -1
    const tick = () => {
      current += (strengthTarget.current - current) * 0.16
      const nextPercent = Math.round(current * 100)
      if (nextPercent !== lastPercent) {
        lastPercent = nextPercent
        setDisplayPercent(nextPercent)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (reducedMotion || !scanRef.current) return
    let frame = 0
    const startedAt = performance.now()
    const tick = (now: number) => {
      const time = (now - startedAt) / 1000
      if (scanRef.current) {
        scanRef.current.style.transform = `translateY(${(time * 18) % 64}px)`
        scanRef.current.style.opacity = String(0.15 + 0.1 * Math.sin(time * 2))
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [reducedMotion])

  if (!hud || !copy || phase !== 'active') return null

  return (
    <div style={styles.root} aria-hidden>
      <div style={{ ...styles.topBadge, ...(compact ? styles.topBadgeCompact : {}), borderColor: `${copy.color}55`, color: copy.color }}>
        <span style={styles.topKey}>{hud.controlLabel}</span>
        <span style={styles.topDot}>·</span>
        <span style={styles.topCn}>{copy.cn}</span>
        <span style={styles.topDot}>·</span>
        <span style={styles.topEn}>{copy.en}</span>
        {displayPercent > 2 && <span style={{ ...styles.force, color: copy.color }}>{displayPercent}%</span>}
      </div>

      <div style={{ ...styles.leftPlate, ...(compact ? styles.leftPlateCompact : {}) }}>
        <div style={styles.plateCorners} />
        {!reducedMotion && <div ref={scanRef} style={styles.scanLine} />}
        <div style={styles.cardIndex}>{hud.index}</div>
        <div style={styles.code}>{hud.code}</div>
        <div style={styles.titleRow}>
          <span style={styles.titleCn}>{hud.title}</span>
          <span style={styles.titleEn}>{hud.titleEn}</span>
        </div>
        <div style={styles.rule} />
        <div style={styles.meta}>{hud.particleCount} PARTICLES / {String(hud.structureCount).padStart(2, '0')} {hud.structureLabel}</div>
        <div style={styles.goldMeter}><span style={styles.goldMeterFill} /></div>
      </div>

      <div style={{ ...styles.bottomPlate, ...(compact ? styles.bottomPlateCompact : {}) }}>
        {!compact && (
          <div style={styles.bottomCopy}>
            {hud.description.map((line) => <span key={line}>{line}</span>)}
          </div>
        )}
        <div style={{ ...styles.bottomScope, ...(compact ? styles.bottomScopeCompact : {}) }}>
          {hud.diagram === 'singularity' ? (
            <SingularityDiagram mode={activeMode} strength={displayPercent / 100} />
          ) : (
            <OrbitDiagram mode={activeMode} />
          )}
        </div>
      </div>
    </div>
  )
}

const fontStack = 'Bahnschrift, "DIN Alternate", "Segoe UI", "Microsoft YaHei", sans-serif'

const styles: Record<string, React.CSSProperties> = {
  root: { position: 'fixed', inset: 0, zIndex: 205, pointerEvents: 'none', fontFamily: fontStack, color: '#dff7ff' },
  topBadge: {
    position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 32, padding: '6px 16px',
    borderRadius: 2, border: '1px solid rgba(155, 223, 255, 0.28)', background: 'rgba(2, 6, 14, 0.76)',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.03)', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
  },
  topBadgeCompact: { top: 66, left: 12, right: 12, transform: 'none', padding: '5px 8px', gap: 5, whiteSpace: 'normal' },
  topKey: { opacity: 0.7, fontSize: 10 },
  topDot: { opacity: 0.35 },
  topCn: { fontWeight: 700 },
  topEn: { opacity: 0.75, fontSize: 10 },
  force: { marginLeft: 6, fontSize: 10, opacity: 0.9, minWidth: 28, textAlign: 'right' },
  leftPlate: {
    position: 'absolute', top: 86, left: 18, width: 254, padding: '14px 16px 16px',
    border: '1px solid rgba(126, 218, 255, 0.22)', background: 'rgba(3, 10, 22, 0.78)',
    boxShadow: '0 18px 46px rgba(0,0,0,0.26), inset 0 0 0 1px rgba(255,255,255,0.025)', overflow: 'hidden',
  },
  leftPlateCompact: { top: 108, left: 12, width: 208, padding: '10px 12px 12px' },
  cardIndex: { position: 'absolute', top: 7, right: 9, fontSize: 9, color: 'rgba(255, 193, 61, 0.75)' },
  plateCorners: {
    position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.7,
    background: 'linear-gradient(#7edaff, #7edaff) top left / 10px 1px no-repeat, linear-gradient(#7edaff, #7edaff) top left / 1px 10px no-repeat, linear-gradient(#7edaff, #7edaff) top right / 10px 1px no-repeat, linear-gradient(#7edaff, #7edaff) top right / 1px 10px no-repeat, linear-gradient(#7edaff, #7edaff) bottom left / 10px 1px no-repeat, linear-gradient(#7edaff, #7edaff) bottom left / 1px 10px no-repeat, linear-gradient(#7edaff, #7edaff) bottom right / 10px 1px no-repeat, linear-gradient(#7edaff, #7edaff) bottom right / 1px 10px no-repeat',
  },
  scanLine: { position: 'absolute', left: 0, right: 0, top: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(126,218,255,0.55), transparent)' },
  code: { fontSize: 10, color: 'rgba(126, 218, 255, 0.78)', marginBottom: 6 },
  titleRow: { display: 'flex', alignItems: 'baseline', gap: 10 },
  titleCn: { fontSize: 22, fontWeight: 700, color: '#f4fbff', textShadow: '0 0 18px rgba(126, 218, 255, 0.22)' },
  titleEn: { fontSize: 10, color: 'rgba(255, 193, 61, 0.85)' },
  rule: { margin: '10px 0 8px', height: 1, background: 'linear-gradient(90deg, rgba(255,193,61,0.55), rgba(126,218,255,0.15), transparent)' },
  meta: { fontSize: 10, color: 'rgba(200, 230, 255, 0.62)' },
  goldMeter: { position: 'relative', height: 4, marginTop: 13, background: 'rgba(126, 218, 255, 0.08)', overflow: 'hidden' },
  goldMeterFill: { position: 'absolute', inset: '0 34% 0 0', background: 'linear-gradient(90deg, #ff9b23, #ffc13d, #fff1b8)', boxShadow: '0 0 12px rgba(255, 193, 61, 0.58)' },
  bottomPlate: {
    position: 'absolute', left: '50%', bottom: 26, width: 'min(520px, calc(100vw - 32px))', minHeight: 72,
    transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18,
    padding: '10px 14px', border: '1px solid rgba(126, 218, 255, 0.2)', background: 'rgba(2, 7, 16, 0.7)',
    clipPath: 'polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px))',
  },
  bottomPlateCompact: { left: 'auto', right: 12, bottom: 12, width: 132, minHeight: 64, transform: 'none', padding: '4px' },
  bottomCopy: { display: 'grid', gap: 4, fontSize: 13, lineHeight: 1.45, color: 'rgba(230, 248, 255, 0.9)' },
  bottomScope: { width: 136, height: 72, display: 'grid', placeItems: 'center', borderLeft: '1px solid rgba(126, 218, 255, 0.16)' },
  bottomScopeCompact: { width: 120, height: 72, borderLeft: 0 },
}
