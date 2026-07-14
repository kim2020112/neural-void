import { useEffect, useMemo, useRef, useState } from 'react'
import { getSceneProfile, type SceneHudProfile } from '../scenes/sceneProfiles'
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

const DNA_RUNG_Y = [10, 18, 26, 34, 42, 50, 58, 66] as const

function DnaDiagram({
  mode,
  strength,
}: {
  mode: InteractionMode
  strength: number
}) {
  const compressed = mode === 'attract' || mode === 'forming_void' || mode === 'void_core'
  const expanded = mode === 'repel' || mode === 'exploding'
  const dual = mode === 'duality' || mode === 'forming_void' || mode === 'void_core'
  const xScale = compressed ? 0.88 : expanded ? 1.12 : 1
  const yScale = dual ? 0.9 + strength * 0.2 : compressed ? 0.94 : 1
  const strandOffset = mode === 'repel' ? strength * 7 : mode === 'exploding' ? strength * 9 : 0
  const rungOpacity = mode === 'repel' ? 0.72 - strength * 0.52 : mode === 'exploding' ? 0.34 : 0.72

  return (
    <svg width="120" height="72" viewBox="0 0 120 72" aria-hidden>
      <g transform={`translate(60 36) scale(${xScale} ${yScale}) translate(-60 -36)`}>
        {mode === 'exploding' && (
          <>
            <path d="M34 4 C78 13 78 24 34 34 C-2 44 2 57 42 68" fill="none" stroke="rgba(92,225,255,0.28)" strokeWidth="1" transform="translate(-8 0)" />
            <path d="M86 4 C42 13 42 24 86 34 C122 44 118 57 78 68" fill="none" stroke="rgba(168,132,255,0.28)" strokeWidth="1" transform="translate(8 0)" />
          </>
        )}
        <path d="M42 4 C78 13 78 24 42 34 C8 44 8 57 42 68" fill="none" stroke="#5ce1ff" strokeWidth="1.8" transform={`translate(${-strandOffset} 0)`} />
        <path d="M78 4 C42 13 42 24 78 34 C112 44 112 57 78 68" fill="none" stroke="#a884ff" strokeWidth="1.8" transform={`translate(${strandOffset} 0)`} />
        {DNA_RUNG_Y.map((y, index) => {
          const centerBias = Math.sin((y - 4) / 64 * Math.PI * 4) * 14
          const halfWidth = 12 + Math.abs(centerBias) * 0.42 + strandOffset
          return (
            <line
              key={y}
              x1={60 + centerBias - halfWidth}
              x2={60 + centerBias + halfWidth}
              y1={y}
              y2={y}
              stroke={index % 2 === 0 ? '#ffc857' : '#72e7ff'}
              strokeWidth="1"
              opacity={rungOpacity}
            />
          )
        })}
      </g>
      {mode === 'point' && (
        <>
          <circle cx="60" cy="36" r={5 + strength * 3} fill="none" stroke="#eafcff" strokeWidth="1.2" />
          <path d="M47 36 H73" stroke="rgba(114,231,255,0.8)" strokeWidth="1" />
        </>
      )}
      {dual && (
        <>
          <circle cx="15" cy="36" r="3" fill="#ffc857" />
          <circle cx="105" cy="36" r="3" fill="#a884ff" />
          <path d="M19 36 H36 M84 36 H101" stroke="rgba(224,235,255,0.55)" strokeWidth="1" />
        </>
      )}
      {(mode === 'forming_void' || mode === 'void_core' || mode === 'exploding') && (
        <circle cx="60" cy="36" r={9 + strength * 7} fill="none" stroke="rgba(244,251,255,0.56)" strokeWidth="1" />
      )}
    </svg>
  )
}

function HypercubeDiagram({
  mode,
  strength,
}: {
  mode: InteractionMode
  strength: number
}) {
  const compressed = mode === 'attract' || mode === 'forming_void' || mode === 'void_core'
  const expanded = mode === 'repel' || mode === 'exploding'
  const dual = mode === 'duality' || mode === 'forming_void' || mode === 'void_core'
  const innerSize = compressed ? 20 + strength * 3 : expanded ? 28 + strength * 6 : 27
  const innerX = 60 - innerSize * 0.5 + (dual ? strength * 3 : 0)
  const innerY = 36 - innerSize * 0.5 - (dual ? strength * 2 : 0)
  const outerX = 34
  const outerY = 10
  const outerSize = 52
  const trace = mode === 'point'

  return (
    <svg width="120" height="72" viewBox="0 0 120 72" aria-hidden>
      {mode === 'exploding' && (
        <rect
          x={outerX - 4 - strength * 3}
          y={outerY + 2}
          width={outerSize + 8 + strength * 6}
          height={outerSize - 4}
          fill="none"
          stroke="rgba(255,107,50,0.38)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      )}
      <rect x={outerX} y={outerY} width={outerSize} height={outerSize} fill="none" stroke="#8edfff" strokeWidth="1.35" />
      <rect x={innerX} y={innerY} width={innerSize} height={innerSize} fill="none" stroke="#eafaff" strokeWidth={trace ? 1.8 : 1.2} />
      <path
        d={`M${outerX} ${outerY} L${innerX} ${innerY} M${outerX + outerSize} ${outerY} L${innerX + innerSize} ${innerY} M${outerX} ${outerY + outerSize} L${innerX} ${innerY + innerSize} M${outerX + outerSize} ${outerY + outerSize} L${innerX + innerSize} ${innerY + innerSize}`}
        fill="none"
        stroke="#ff8a3d"
        strokeWidth={trace ? 1.7 : 1.05}
        opacity={trace ? 0.95 : 0.72}
      />
      {trace && (
        <>
          <circle cx={innerX + innerSize} cy={innerY} r={3.5 + strength * 1.5} fill="none" stroke="#fff7e8" strokeWidth="1.5" />
          <circle cx={innerX + innerSize} cy={innerY} r="1.8" fill="#ff8a3d" />
        </>
      )}
      {dual && (
        <>
          <circle cx="18" cy="36" r="3" fill="#8edfff" />
          <circle cx="102" cy="36" r="3" fill="#ff8a3d" />
          <path d="M22 36 H31 M89 36 H98" stroke="rgba(225,244,255,0.62)" strokeWidth="1" />
        </>
      )}
      {(mode === 'forming_void' || mode === 'void_core') && (
        <circle cx="60" cy="36" r={7 + strength * 5} fill="none" stroke="rgba(255,247,232,0.56)" strokeWidth="1" />
      )}
    </svg>
  )
}

function QuantumDiagram({ mode, strength }: { mode: InteractionMode; strength: number }) {
  const compressed = mode === 'attract' || mode === 'forming_void' || mode === 'void_core'
  const expanded = mode === 'repel' || mode === 'exploding'
  const dual = mode === 'duality' || mode === 'forming_void' || mode === 'void_core'
  const shellScale = compressed ? 1 - strength * 0.2 : expanded ? 1 + strength * 0.14 : 1
  const innerRadius = 17 * shellScale
  const outerRadius = 27 * shellScale

  return (
    <svg width="120" height="72" viewBox="0 0 120 72" aria-hidden>
      <ellipse cx="60" cy="36" rx={39 * shellScale} ry={11 * shellScale} fill="none" stroke="#ff706a" strokeWidth="1" opacity="0.7" transform="rotate(-16 60 36)" />
      <ellipse cx="60" cy="36" rx={38 * shellScale} ry={10 * shellScale} fill="none" stroke="#42ddff" strokeWidth="1" opacity="0.65" transform="rotate(24 60 36)" />
      <circle cx="60" cy="36" r={outerRadius} fill="none" stroke="#927dff" strokeWidth="1.2" opacity="0.75" />
      <circle cx="60" cy="36" r={innerRadius} fill="none" stroke="#42ddff" strokeWidth="1.4" />
      <circle cx="60" cy="36" r={6 + strength * 3} fill="#ecfdff" opacity="0.9" />
      {mode === 'repel' && <circle cx="60" cy="36" r={30 + strength * 9} fill="none" stroke="#65ffbd" strokeWidth="1.4" opacity="0.8" />}
      {mode === 'point' && (
        <>
          <circle cx="89" cy="24" r={5 + strength * 2} fill="none" stroke="#ff706a" strokeWidth="1.2" />
          <path d="M84 27 C78 31 75 35 73 41" fill="none" stroke="#ff706a" strokeWidth="1" />
        </>
      )}
      {dual && (
        <>
          <circle cx="15" cy="36" r="3" fill="#42ddff" />
          <circle cx="105" cy="36" r="3" fill="#927dff" />
          <path d="M19 36 H29 M91 36 H101" stroke="rgba(224,250,255,0.6)" strokeWidth="1" />
        </>
      )}
    </svg>
  )
}

function KnotDiagram({ mode, strength }: { mode: InteractionMode; strength: number }) {
  const compressed = mode === 'attract' || mode === 'forming_void' || mode === 'void_core'
  const expanded = mode === 'repel' || mode === 'exploding'
  const dual = mode === 'duality' || mode === 'forming_void' || mode === 'void_core'
  const scale = compressed ? 1 - strength * 0.14 : expanded ? 1 + strength * 0.1 : 1
  const transform = `translate(60 36) scale(${scale}) translate(-60 -36)`

  return (
    <svg width="120" height="72" viewBox="0 0 120 72" aria-hidden>
      <g transform={transform}>
        <path d="M28 36 C28 12 58 10 68 28 C78 46 53 62 38 48 C20 31 48 14 74 22 C99 30 91 57 67 56" fill="none" stroke="#ffae45" strokeWidth="1.6" />
        <path d="M31 45 C17 27 41 11 61 24 C81 37 73 61 49 57 C25 53 25 25 48 17 C72 9 98 23 89 43" fill="none" stroke="#27e5ff" strokeWidth="1.45" />
        <path d="M36 18 C57 6 82 18 77 39 C72 60 42 64 32 44 C22 23 48 14 67 25 C88 37 91 58 67 62" fill="none" stroke="#ff63bd" strokeWidth="1.35" />
        <circle cx="48" cy="27" r={2.2 + strength} fill="#fff8e5" />
        <circle cx="72" cy="45" r={2.2 + strength} fill="#fff8e5" />
      </g>
      {mode === 'point' && <circle cx={38 + strength * 43} cy="36" r="4" fill="none" stroke="#fff8e5" strokeWidth="1.2" />}
      {dual && (
        <>
          <circle cx="14" cy="36" r="3" fill="#ffae45" />
          <circle cx="106" cy="36" r="3" fill="#27e5ff" />
        </>
      )}
    </svg>
  )
}

const HUD_SPIRAL_NODES = Array.from({ length: 13 }, (_, index) => {
  const progress = index / 12
  const angle = -Math.PI * 1.5 + progress * Math.PI * 3
  const radius = 3 + Math.exp(progress * 2.5) * 2.15
  return { x: 60 + Math.cos(angle) * radius, y: 36 + Math.sin(angle) * radius * 0.62 }
})

function SpiralDiagram({ mode, strength }: { mode: InteractionMode; strength: number }) {
  const compressed = mode === 'attract' || mode === 'forming_void' || mode === 'void_core'
  const expanded = mode === 'repel' || mode === 'exploding'
  const dual = mode === 'duality' || mode === 'forming_void' || mode === 'void_core'
  const scale = compressed ? 1 - strength * 0.28 : expanded ? 1 + strength * 0.12 : 1
  const selectedNode = Math.min(12, Math.round(strength * 12))

  return (
    <svg width="120" height="72" viewBox="0 0 120 72" aria-hidden>
      <g transform={`translate(60 36) scale(${scale}) translate(-60 -36)`}>
        <path d="M61 36 C54 31 56 23 66 23 C81 23 88 36 82 48 C73 65 43 64 29 48 C12 28 29 7 55 6 C86 5 108 26 102 53" fill="none" stroke="#d9ff47" strokeWidth="1.7" />
        <path d="M60 34 C53 29 58 21 68 22 C84 24 90 38 82 50 C70 67 39 61 27 45" fill="none" stroke="#ffad32" strokeWidth="1" opacity="0.72" />
        {HUD_SPIRAL_NODES.map((node, index) => (
          <circle key={index} cx={node.x} cy={node.y} r={index === selectedNode && mode === 'point' ? 3.2 : 1.25} fill={index === selectedNode && mode === 'point' ? '#59e4ff' : '#efff9c'} opacity={0.55 + index / 30} />
        ))}
      </g>
      {mode === 'repel' && <circle cx="101" cy="53" r={4 + strength * 3} fill="none" stroke="#52ff9b" strokeWidth="1.3" />}
      {dual && (
        <>
          <circle cx="14" cy="36" r="3" fill="#ffad32" />
          <circle cx="106" cy="36" r="3" fill="#52ff9b" />
        </>
      )}
    </svg>
  )
}

function GalaxyDiagram({ mode, strength }: { mode: InteractionMode; strength: number }) {
  const compressed = mode === 'attract' || mode === 'forming_void' || mode === 'void_core'
  const expanded = mode === 'repel' || mode === 'exploding'
  const dual = mode === 'duality' || mode === 'forming_void' || mode === 'void_core'
  const scale = compressed ? 1 - strength * 0.15 : expanded ? 1 + strength * 0.1 : 1

  return (
    <svg width="120" height="72" viewBox="0 0 120 72" aria-hidden>
      <g transform={`translate(60 36) scale(${scale}) translate(-60 -36)`}>
        <path d="M60 36 C67 29 80 29 87 36 C98 47 88 61 72 63 C45 67 22 53 20 35" fill="none" stroke="#54e8ff" strokeWidth="1.55" />
        <path d="M60 36 C53 43 40 43 33 36 C22 25 32 11 48 9 C75 5 98 19 100 37" fill="none" stroke="#ff747d" strokeWidth="1.55" />
        <path d="M31 20 C50 28 72 28 92 48" fill="none" stroke="rgba(8,12,22,0.95)" strokeWidth="4" strokeDasharray="4 3" />
        <circle cx="60" cy="36" r={8 + strength * 2} fill="#fff1d1" opacity="0.9" />
        <circle cx="60" cy="36" r="13" fill="none" stroke="rgba(255,210,122,0.45)" strokeWidth="1" />
      </g>
      {mode === 'repel' && <circle cx="60" cy="36" r={20 + strength * 23} fill="none" stroke="#ffd27a" strokeWidth="1.2" />}
      {mode === 'point' && <circle cx="88" cy="24" r={4 + strength * 2} fill="none" stroke="#54e8ff" strokeWidth="1.2" />}
      {dual && (
        <>
          <circle cx="14" cy="36" r="3" fill="#ff747d" />
          <circle cx="106" cy="36" r="3" fill="#54e8ff" />
        </>
      )}
    </svg>
  )
}

function SceneDiagram({
  diagram,
  mode,
  strength,
}: {
  diagram: SceneHudProfile['diagram']
  mode: InteractionMode
  strength: number
}) {
  if (diagram === 'singularity') return <SingularityDiagram mode={mode} strength={strength} />
  if (diagram === 'dna') return <DnaDiagram mode={mode} strength={strength} />
  if (diagram === 'hypercube') return <HypercubeDiagram mode={mode} strength={strength} />
  if (diagram === 'quantum') return <QuantumDiagram mode={mode} strength={strength} />
  if (diagram === 'knot') return <KnotDiagram mode={mode} strength={strength} />
  if (diagram === 'spiral') return <SpiralDiagram mode={mode} strength={strength} />
  if (diagram === 'galaxy') return <GalaxyDiagram mode={mode} strength={strength} />
  return <OrbitDiagram mode={mode} />
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
    <div style={styles.root} aria-hidden data-testid="scene-hud">
      <div data-testid="scene-hud-top" style={{ ...styles.topBadge, ...(compact ? styles.topBadgeCompact : {}), borderColor: `${copy.color}55`, color: copy.color }}>
        <span style={styles.topKey}>{hud.controlLabel}</span>
        <span style={styles.topDot}>·</span>
        <span style={styles.topCn}>{copy.cn}</span>
        <span style={styles.topDot}>·</span>
        <span style={styles.topEn}>{copy.en}</span>
        {displayPercent > 2 && <span style={{ ...styles.force, color: copy.color }}>{displayPercent}%</span>}
      </div>

      <div data-testid="scene-hud-left" style={{ ...styles.leftPlate, ...(compact ? styles.leftPlateCompact : {}) }}>
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

      <div data-testid="scene-hud-bottom" style={{ ...styles.bottomPlate, ...(compact ? styles.bottomPlateCompact : {}) }}>
        {!compact && (
          <div style={styles.bottomCopy}>
            {hud.description.map((line) => <span key={line}>{line}</span>)}
          </div>
        )}
        <div style={{ ...styles.bottomScope, ...(compact ? styles.bottomScopeCompact : {}) }}>
          <SceneDiagram
            diagram={hud.diagram}
            mode={activeMode}
            strength={displayPercent / 100}
          />
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
  topBadgeCompact: { top: 76, left: 12, right: 12, transform: 'none', padding: '5px 8px', gap: 5, whiteSpace: 'normal' },
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
  leftPlateCompact: { top: 118, left: 12, width: 208, padding: '10px 12px 12px' },
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
