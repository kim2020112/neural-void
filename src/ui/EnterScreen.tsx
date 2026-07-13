import { useAppStore } from '../store/appStore'

const GESTURE_GUIDE = [
  { title: '握拳', text: '将粒子拉向掌心，形成聚拢效果。' },
  { title: '张开手掌', text: '向外推开粒子，产生扩散波。' },
  { title: '伸出食指', text: '移动指尖，牵引并塑造粒子流。' },
  { title: '双手握拳', text: '汇聚双手之间的粒子，形成高能聚合体。' },
]

export function EnterScreen() {
  const phase = useAppStore((state) => state.phase)
  const trackingStatus = useAppStore((state) => state.trackingStatus)
  const trackingError = useAppStore((state) => state.trackingError)
  const setPhase = useAppStore((state) => state.setPhase)
  const setCameraEnabled = useAppStore((state) => state.setCameraEnabled)

  const handleEnter = () => {
    if (phase === 'loading') return
    setCameraEnabled(true)
    setPhase('loading')
  }

  const loadingLabel =
    trackingStatus === 'requesting_camera'
      ? '正在连接摄像头'
      : trackingStatus === 'loading_model'
        ? '正在加载手势模型'
        : trackingStatus === 'warming_up'
          ? '正在校准输入'
          : '正在进入体验'
  const isLoading = phase === 'loading'

  return (
    <div style={styles.overlay}>
      <div style={styles.backGlow} />
      <div style={styles.container}>
        <div style={styles.hero}>
          <div style={styles.eyebrow}>实时手势粒子实验</div>
          <h1 style={styles.title}>星尘引擎</h1>
          <p style={styles.subtitle}>
            用双手操控星尘：聚拢、扩散、牵引，实时生成不断变化的宇宙结构。
          </p>
          <button
            type="button"
            style={{ ...styles.button, ...(isLoading ? styles.buttonDisabled : {}) }}
            onClick={handleEnter}
            disabled={isLoading}
          >
            {isLoading ? loadingLabel : '进入体验'}
          </button>
          <div style={{ ...styles.hint, ...(trackingError ? styles.errorHint : {}) }}>
            {trackingError ?? '需要摄像头权限，仅用于本机实时手势识别。'}
          </div>
        </div>

        <div style={styles.guideGrid}>
          {GESTURE_GUIDE.map((item) => (
            <div key={item.title} style={styles.guideCard}>
              <div style={styles.guideTitle}>{item.title}</div>
              <div style={styles.guideText}>{item.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      'radial-gradient(circle at 50% 42%, rgba(27, 47, 94, 0.45), rgba(5, 8, 18, 0.96) 48%, rgba(2, 4, 10, 0.99) 100%)',
    overflow: 'hidden',
  },
  backGlow: {
    position: 'absolute',
    width: 720,
    height: 720,
    borderRadius: '50%',
    background:
      'radial-gradient(circle, rgba(125,224,255,0.18) 0%, rgba(255,211,107,0.08) 30%, rgba(0,0,0,0) 68%)',
    filter: 'blur(18px)',
    transform: 'translateY(-6%)',
  },
  container: {
    position: 'relative',
    width: 'min(1180px, calc(100vw - 48px))',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.1fr) minmax(320px, 0.9fr)',
    gap: 28,
    alignItems: 'center',
  },
  hero: {
    padding: '44px 40px',
    borderRadius: 28,
    border: '1px solid rgba(125,224,255,0.16)',
    background: 'linear-gradient(180deg, rgba(11, 18, 34, 0.76), rgba(6, 10, 20, 0.56))',
    backdropFilter: 'blur(18px)',
    boxShadow: '0 0 80px rgba(0,0,0,0.25)',
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: '0.32em',
    color: 'rgba(163, 201, 255, 0.64)',
  },
  title: {
    margin: '18px 0 14px',
    fontSize: 'clamp(40px, 7vw, 92px)',
    lineHeight: 0.94,
    letterSpacing: '0.08em',
    color: '#f5f9ff',
    textShadow: '0 0 30px rgba(125,224,255,0.25)',
  },
  subtitle: {
    margin: 0,
    maxWidth: 620,
    fontSize: 'clamp(16px, 2vw, 20px)',
    lineHeight: 1.7,
    color: 'rgba(226, 236, 255, 0.74)',
  },
  button: {
    marginTop: 28,
    padding: '16px 28px',
    borderRadius: 999,
    border: '1px solid rgba(125,224,255,0.32)',
    background: 'linear-gradient(90deg, rgba(84,160,255,0.12), rgba(255,211,107,0.14))',
    color: '#eef6ff',
    fontSize: 13,
    letterSpacing: '0.24em',
    cursor: 'pointer',
    boxShadow: '0 0 32px rgba(125,224,255,0.16)',
  },
  buttonDisabled: {
    cursor: 'wait',
    opacity: 0.68,
  },
  hint: {
    marginTop: 14,
    color: 'rgba(214, 225, 247, 0.5)',
    fontSize: 12,
    letterSpacing: '0.08em',
  },
  errorHint: {
    color: 'rgba(255, 190, 132, 0.86)',
  },
  guideGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 16,
  },
  guideCard: {
    padding: '18px 18px 20px',
    borderRadius: 22,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'linear-gradient(180deg, rgba(9, 15, 28, 0.76), rgba(5, 8, 16, 0.52))',
    backdropFilter: 'blur(14px)',
    minHeight: 150,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  guideTitle: {
    fontSize: 13,
    letterSpacing: '0.28em',
    color: '#ffe6a7',
  },
  guideText: {
    fontSize: 14,
    lineHeight: 1.7,
    color: 'rgba(229, 237, 255, 0.72)',
  },
}
