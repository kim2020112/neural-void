import { useMemo, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { SHAPE_OPTIONS } from '../particles/shapes/catalog'
import type { GestureType, InteractionMode } from '../store/appStore'

function Meter({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <div style={styles.meter}>
      <div style={styles.meterHead}>
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <div style={styles.track}>
        <div style={{ ...styles.fill, width: `${Math.max(4, value * 100)}%`, background: tint }} />
      </div>
    </div>
  )
}

function CameraGlyph({ active }: { active: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="2.25"
        y="5"
        width="9.5"
        height="8"
        rx="2.2"
        stroke={active ? '#dff7ff' : 'rgba(229, 236, 255, 0.58)'}
        strokeWidth="1.2"
      />
      <path
        d="M11.75 7.35L15.15 5.85C15.48 5.71 15.85 5.95 15.85 6.31V11.69C15.85 12.05 15.48 12.29 15.15 12.15L11.75 10.65"
        stroke={active ? '#dff7ff' : 'rgba(229, 236, 255, 0.58)'}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {!active && <path d="M3 14.8L15 2.8" stroke="#ffd36b" strokeWidth="1.35" strokeLinecap="round" />}
    </svg>
  )
}

function gestureLabel(gesture: GestureType) {
  if (gesture === 'open_palm') return '张掌'
  if (gesture === 'point') return '指向'
  if (gesture === 'fist') return '拳握'
  return '无手势'
}

function modeLabel(mode: InteractionMode) {
  switch (mode) {
    case 'attract':
      return '引力聚合'
    case 'repel':
      return '脉冲释放'
    case 'point':
      return '雕刻光束'
    case 'duality':
      return '双星轨道'
    case 'forming_void':
      return '成核中'
    case 'void_core':
      return '虚空核心'
    case 'exploding':
      return '超新星释放'
    default:
      return '休眠'
  }
}

export function DebugOverlay() {
  const phase = useAppStore((state) => state.phase)
  const cameraReady = useAppStore((state) => state.cameraReady)
  const cameraEnabled = useAppStore((state) => state.cameraEnabled)
  const setCameraEnabled = useAppStore((state) => state.setCameraEnabled)
  const galleryMode = useAppStore((state) => state.galleryMode)
  const setGalleryMode = useAppStore((state) => state.setGalleryMode)
  const gestureType = useAppStore((state) => state.gestureType)
  const gestureScore = useAppStore((state) => state.gestureScore)
  const handDetected = useAppStore((state) => state.handDetected)
  const hand2Detected = useAppStore((state) => state.hand2Detected)
  const hand2GestureType = useAppStore((state) => state.hand2GestureType)
  const hand2GestureScore = useAppStore((state) => state.hand2GestureScore)
  const forceStrength = useAppStore((state) => state.forceStrength)
  const voidCorePhase = useAppStore((state) => state.voidCorePhase)
  const voidCoreStrength = useAppStore((state) => state.voidCoreStrength)
  const particleShape = useAppStore((state) => state.particleShape)
  const setParticleShape = useAppStore((state) => state.setParticleShape)
  const interactionState = useAppStore((state) => state.interactionState)
  const cinematicState = useAppStore((state) => state.cinematicState)
  const [hudOpen, setHudOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)

  const halo = useMemo(
    () => `0 0 ${10 + cinematicState.energy * 12}px rgba(125,224,255,0.12), 0 0 ${20 + cinematicState.shock * 18}px rgba(255,211,107,0.06)`,
    [cinematicState.energy, cinematicState.shock],
  )
  const activeShapeMeta = useMemo(
    () => SHAPE_OPTIONS.find((shape) => shape.id === particleShape),
    [particleShape],
  )

  if (phase !== 'active') return null

  return (
    <div style={styles.root}>
      {!cameraEnabled && (
        <div style={styles.offlineVeil}>
          <div style={styles.offlinePanel}>
            <div style={styles.offlineEyebrow}>输入离线</div>
            <div style={styles.offlineTitle}>摄像头已关闭</div>
            <div style={styles.offlineText}>实时手势暂停。右上角摄像头按钮可随时恢复控制。</div>
          </div>
        </div>
      )}

      <div style={styles.topLeftDock}>
        <button style={styles.dockButton} onClick={() => setHudOpen((value) => !value)}>
          {hudOpen ? '收起状态' : '状态'}
        </button>
        {hudOpen && (
          <button style={styles.ghostButton} onClick={() => setDetailOpen((value) => !value)}>
            {detailOpen ? '简略' : '详细'}
          </button>
        )}
      </div>

      <div style={styles.topRightDock}>
        <button style={styles.dockButton} onClick={() => setLibraryOpen((value) => !value)}>
          {libraryOpen ? '收起场景' : '场景'}
        </button>
        <button
          style={{
            ...styles.modeButton,
            borderColor: galleryMode ? 'rgba(125,224,255,0.24)' : 'rgba(255,211,107,0.24)',
            background: galleryMode ? 'rgba(8, 14, 28, 0.82)' : 'rgba(18, 12, 10, 0.82)',
            boxShadow: galleryMode
              ? '0 0 20px rgba(125,224,255,0.11)'
              : '0 0 20px rgba(255,211,107,0.1)',
          }}
          onClick={() => setGalleryMode(!galleryMode)}
        >
          <span style={styles.modeLabel}>模式</span>
          <span style={{ ...styles.modeState, color: galleryMode ? '#dff7ff' : '#ffe7ac' }}>
            {galleryMode ? '展示' : '交互'}
          </span>
        </button>
        <button
          style={{
            ...styles.cameraButton,
            borderColor: cameraEnabled ? 'rgba(125,224,255,0.26)' : 'rgba(255,211,107,0.3)',
            background: cameraEnabled ? 'rgba(8, 14, 28, 0.82)' : 'rgba(20, 14, 10, 0.84)',
            boxShadow: cameraEnabled
              ? '0 0 20px rgba(125,224,255,0.12)'
              : '0 0 24px rgba(255,211,107,0.14)',
          }}
          onClick={() => setCameraEnabled(!cameraEnabled)}
        >
          <span style={styles.cameraGlyphWrap}>
            <CameraGlyph active={cameraEnabled} />
          </span>
          <span style={styles.cameraMeta}>
            <span style={styles.cameraLabel}>摄像头</span>
            <span style={{ ...styles.cameraState, color: cameraReady ? '#dff7ff' : cameraEnabled ? '#ffe7ac' : '#ffd36b' }}>
              {cameraReady ? '在线' : cameraEnabled ? '连接中' : '已关闭'}
            </span>
          </span>
        </button>
      </div>

      {hudOpen && (
        <div style={{ ...styles.leftPanel, boxShadow: halo }}>
          <div style={styles.panelHeader}>
            <div>
              <div style={styles.eyebrow}>神经虚空</div>
              <div style={styles.title}>{modeLabel(interactionState.mode)}</div>
            </div>
            <div style={styles.inlineBadge}>
              {galleryMode ? '展示视角' : '交互视角'} · {cameraReady ? '输入在线' : cameraEnabled ? '输入连接中' : '输入离线'}
            </div>
          </div>

          <div style={styles.dualRow}>
            <div style={styles.badge}>{handDetected ? gestureLabel(gestureType) : '主手未识别'}</div>
            <div style={styles.badgeAlt}>{hand2Detected ? gestureLabel(hand2GestureType) : '副手未识别'}</div>
          </div>

          <Meter label="力度" value={forceStrength} tint="linear-gradient(90deg, #7de0ff, #ffd36b)" />
          <Meter label="存在" value={interactionState.presence} tint="linear-gradient(90deg, #7de0ff, #7dc9ff)" />
          <Meter label="深度" value={interactionState.depth} tint="linear-gradient(90deg, #9ac8ff, #c59dff)" />
          <Meter label="双手" value={interactionState.duality} tint="linear-gradient(90deg, #ffd36b, #ff8b4d)" />

          {detailOpen && (
            <>
              <Meter label="脉冲" value={Math.min(1, cinematicState.pulse)} tint="linear-gradient(90deg, #fff2cf, #ffd36b)" />
              <Meter label="氛围" value={Math.min(1, cinematicState.atmosphere)} tint="linear-gradient(90deg, #6b7cff, #c48dff)" />
              <Meter label="核心" value={voidCoreStrength} tint="linear-gradient(90deg, #f7f1df, #ff9f42)" />
              <div style={styles.detailGrid}>
                <div style={styles.detailCell}>
                  <span>主手</span>
                  <strong>{gestureScore.toFixed(2)}</strong>
                </div>
                <div style={styles.detailCell}>
                  <span>副手</span>
                  <strong>{hand2GestureScore.toFixed(2)}</strong>
                </div>
                <div style={styles.detailCell}>
                  <span>核心态</span>
                  <strong>{voidCorePhase}</strong>
                </div>
                <div style={styles.detailCell}>
                  <span>结构</span>
                  <strong>{activeShapeMeta?.label ?? particleShape}</strong>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {libraryOpen && (
        <div style={styles.rightPanel}>
          <div style={styles.panelHeaderCompact}>
            <div>
              <div style={styles.eyebrow}>场景结构</div>
              <div style={styles.panelTitle}>{activeShapeMeta?.label ?? '未命名结构'}</div>
            </div>
            <div style={styles.inlineBadgeAlt}>点击切换</div>
          </div>
          <div style={styles.shapeGrid}>
            {SHAPE_OPTIONS.map((shape) => {
              const active = particleShape === shape.id
              return (
                <button
                  key={shape.id}
                  style={{
                    ...styles.shapeCard,
                    borderColor: active ? shape.accent : 'rgba(255,255,255,0.08)',
                    background: active ? 'rgba(255,255,255,0.08)' : 'rgba(4, 8, 20, 0.55)',
                    boxShadow: active ? `0 0 16px ${shape.accent}26` : 'none',
                  }}
                  onClick={() => setParticleShape(shape.id)}
                >
                  <span style={{ ...styles.shapeAccent, background: shape.accent }} />
                  <strong style={styles.shapeLabel}>{shape.label}</strong>
                  <span style={styles.shapeHint}>{shape.hint}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div style={styles.bottomDock}>
        {!guideOpen ? (
          <button style={styles.dockButton} onClick={() => setGuideOpen(true)}>
            手势
          </button>
        ) : (
          <div style={styles.guidePanel}>
            <div style={styles.guideRow}>
              <div style={styles.guideChip}>拳握：聚拢</div>
              <div style={styles.guideChip}>张掌：释放</div>
              <div style={styles.guideChip}>指向：雕刻</div>
              <div style={styles.guideChip}>双拳：成核</div>
            </div>
            <button style={styles.ghostButton} onClick={() => setGuideOpen(false)}>
              收起
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const glass = 'linear-gradient(180deg, rgba(10,16,30,0.82), rgba(4,8,18,0.62))'

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'fixed',
    inset: 0,
    zIndex: 220,
    pointerEvents: 'none',
  },
  offlineVeil: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: 86,
    background: 'linear-gradient(180deg, rgba(5, 8, 18, 0.1), rgba(5, 8, 18, 0.3))',
    backdropFilter: 'blur(6px) saturate(0.86)',
    pointerEvents: 'none',
  },
  offlinePanel: {
    width: 'min(520px, calc(100vw - 64px))',
    padding: '18px 22px',
    borderRadius: 20,
    border: '1px solid rgba(255,211,107,0.2)',
    background: 'linear-gradient(180deg, rgba(18, 14, 10, 0.88), rgba(10, 10, 14, 0.76))',
    boxShadow: '0 18px 48px rgba(0,0,0,0.32), 0 0 40px rgba(255,211,107,0.08)',
  },
  offlineEyebrow: {
    fontSize: 11,
    letterSpacing: '0.28em',
    color: 'rgba(255, 217, 138, 0.72)',
  },
  offlineTitle: {
    marginTop: 8,
    fontSize: 28,
    lineHeight: 1.08,
    fontWeight: 700,
    color: '#fff4d6',
    letterSpacing: '0.04em',
  },
  offlineText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 1.72,
    color: 'rgba(255, 239, 211, 0.78)',
  },
  topLeftDock: {
    position: 'absolute',
    top: 18,
    left: 18,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    pointerEvents: 'auto',
    zIndex: 4,
  },
  topRightDock: {
    position: 'absolute',
    top: 18,
    right: 18,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    pointerEvents: 'auto',
    zIndex: 8,
  },
  dockButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 58,
    height: 38,
    padding: '0 14px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(7, 12, 24, 0.72)',
    color: '#e8f1ff',
    fontSize: 11,
    letterSpacing: '0.14em',
    backdropFilter: 'blur(16px)',
    cursor: 'pointer',
  },
  ghostButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 34,
    padding: '0 12px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(232, 241, 255, 0.8)',
    fontSize: 11,
    letterSpacing: '0.1em',
    backdropFilter: 'blur(12px)',
    cursor: 'pointer',
  },
  leftPanel: {
    position: 'absolute',
    top: 64,
    left: 18,
    width: 236,
    padding: 14,
    borderRadius: 18,
    background: glass,
    border: '1px solid rgba(125,224,255,0.16)',
    backdropFilter: 'blur(18px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    pointerEvents: 'auto',
  },
  rightPanel: {
    position: 'absolute',
    top: 64,
    right: 18,
    width: 254,
    padding: 14,
    borderRadius: 18,
    background: glass,
    border: '1px solid rgba(255,211,107,0.14)',
    backdropFilter: 'blur(18px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    pointerEvents: 'auto',
    zIndex: 6,
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  panelHeaderCompact: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: '0.24em',
    color: 'rgba(173, 208, 255, 0.56)',
  },
  title: {
    marginTop: 6,
    fontSize: 21,
    lineHeight: 1.06,
    fontWeight: 700,
    color: '#f4f8ff',
    letterSpacing: '0.04em',
  },
  panelTitle: {
    marginTop: 5,
    fontSize: 16,
    lineHeight: 1.15,
    fontWeight: 700,
    color: '#f4f8ff',
    letterSpacing: '0.04em',
  },
  inlineBadge: {
    padding: '6px 10px',
    borderRadius: 999,
    background: 'rgba(125,224,255,0.1)',
    border: '1px solid rgba(125,224,255,0.16)',
    color: '#dff7ff',
    fontSize: 10,
    letterSpacing: '0.12em',
    whiteSpace: 'nowrap',
  },
  inlineBadgeAlt: {
    padding: '6px 10px',
    borderRadius: 999,
    background: 'rgba(255,211,107,0.09)',
    border: '1px solid rgba(255,211,107,0.15)',
    color: '#ffe7ac',
    fontSize: 10,
    letterSpacing: '0.12em',
    whiteSpace: 'nowrap',
  },
  dualRow: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    padding: '6px 10px',
    borderRadius: 999,
    background: 'rgba(125,224,255,0.12)',
    border: '1px solid rgba(125,224,255,0.18)',
    color: '#dff7ff',
    fontSize: 10,
    letterSpacing: '0.12em',
  },
  badgeAlt: {
    padding: '6px 10px',
    borderRadius: 999,
    background: 'rgba(255,211,107,0.11)',
    border: '1px solid rgba(255,211,107,0.16)',
    color: '#ffe7ac',
    fontSize: 10,
    letterSpacing: '0.12em',
  },
  meter: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  meterHead: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 10,
    letterSpacing: '0.1em',
    color: 'rgba(230, 238, 255, 0.74)',
  },
  track: {
    height: 6,
    borderRadius: 999,
    background: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 8,
  },
  detailCell: {
    padding: 9,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    color: 'rgba(217, 228, 255, 0.64)',
    fontSize: 10,
    letterSpacing: '0.08em',
  },
  modeButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    minWidth: 84,
    height: 38,
    padding: '0 14px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.12)',
    backdropFilter: 'blur(16px)',
    cursor: 'pointer',
    transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
  },
  modeLabel: {
    fontSize: 8,
    letterSpacing: '0.22em',
    color: 'rgba(214, 226, 248, 0.5)',
  },
  modeState: {
    marginTop: 2,
    fontSize: 12,
    letterSpacing: '0.14em',
    fontWeight: 700,
  },
  cameraButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 118,
    padding: '8px 10px',
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.14)',
    backdropFilter: 'blur(18px)',
    cursor: 'pointer',
    transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
  },
  cameraGlyphWrap: {
    width: 32,
    height: 32,
    borderRadius: 11,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  cameraMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 1,
  },
  cameraLabel: {
    fontSize: 9,
    letterSpacing: '0.22em',
    color: 'rgba(214, 226, 248, 0.52)',
  },
  cameraState: {
    fontSize: 11,
    letterSpacing: '0.12em',
    fontWeight: 700,
  },
  shapeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 8,
  },
  shapeCard: {
    position: 'relative',
    padding: '12px 10px 10px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.08)',
    textAlign: 'left',
    background: 'rgba(4, 8, 20, 0.55)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
    color: '#eef4ff',
  },
  shapeAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  shapeLabel: {
    fontSize: 13,
    letterSpacing: '0.05em',
  },
  shapeHint: {
    fontSize: 10,
    lineHeight: 1.45,
    color: 'rgba(222, 232, 255, 0.58)',
  },
  bottomDock: {
    position: 'absolute',
    left: '50%',
    bottom: 16,
    transform: 'translateX(-50%)',
    pointerEvents: 'auto',
    zIndex: 5,
  },
  guidePanel: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    maxWidth: 'calc(100vw - 32px)',
    padding: 8,
    borderRadius: 999,
    background: 'rgba(7, 12, 24, 0.72)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(16px)',
  },
  guideRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  guideChip: {
    padding: '8px 12px',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(235, 242, 255, 0.76)',
    fontSize: 10,
    letterSpacing: '0.1em',
  },
}
