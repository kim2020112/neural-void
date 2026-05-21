import { useAppStore } from '../store/appStore'

const GESTURE_GUIDE = [
  { title: 'FIST', text: '压缩星尘，建立引力抓取。' },
  { title: 'OPEN PALM', text: '释放冲击波，打散或引爆核心。' },
  { title: 'POINT', text: '聚焦能量束，精确雕刻结构。' },
  { title: 'DUAL FIST', text: '双手汇聚，诞生新的宇宙核心。' },
]

export function EnterScreen() {
  const phase = useAppStore((state) => state.phase)
  const cameraReady = useAppStore((state) => state.cameraReady)
  const setPhase = useAppStore((state) => state.setPhase)
  const setCameraEnabled = useAppStore((state) => state.setCameraEnabled)

  const handleEnter = async () => {
    try {
      setPhase('loading')
      setCameraEnabled(true)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      })
      ;(window as unknown as Record<string, unknown>).__cameraStream = stream
      useAppStore.getState().setCameraReady(true)
      setPhase('active')
    } catch (error) {
      console.error('Camera access denied:', error)
      setPhase('idle')
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.backGlow} />
      <div style={styles.container}>
        <div style={styles.hero}>
          <div style={styles.eyebrow}>AI COSMIC CORE SIMULATOR</div>
          <h1 style={styles.title}>NEURAL VOID</h1>
          <p style={styles.subtitle}>
            让你的双手驱动一个会呼吸、会聚能、会爆发、会重生的宇宙核心。
          </p>
          <button style={styles.button} onClick={handleEnter}>
            {phase === 'loading' ? 'SYNCING CAMERA' : cameraReady ? 'ENTERING' : 'OPEN THE GATE'}
          </button>
          <div style={styles.hint}>需要摄像头权限以启用实时手势识别与深度反馈。</div>
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
    letterSpacing: '0.12em',
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
  hint: {
    marginTop: 14,
    color: 'rgba(214, 225, 247, 0.5)',
    fontSize: 12,
    letterSpacing: '0.08em',
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