import { useAppStore } from '../store/appStore'

export function EnterScreen() {
  const setPhase = useAppStore((s) => s.setPhase)
  const cameraReady = useAppStore((s) => s.cameraReady)

  const handleEnter = async () => {
    try {
      setPhase('loading')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      })
      // Store the stream globally for the gesture recognizer
      ;(window as unknown as Record<string, unknown>).__cameraStream = stream
      useAppStore.getState().setCameraReady(true)
      setPhase('active')
    } catch (err) {
      console.error('Camera access denied:', err)
      setPhase('idle')
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <h1 style={styles.title}>ENTER THE VOID</h1>
        <p style={styles.subtitle}>
          Control a living particle universe with your hands.
        </p>
        <button
          style={styles.button}
          onClick={handleEnter}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#00ffff'
            e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 255, 255, 0.3), 0 0 60px rgba(0, 255, 255, 0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.3)'
            e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.1)'
          }}
        >
          {cameraReady ? 'ENTERING...' : 'START'}
        </button>
        <div style={styles.hint}>
          <span style={styles.dot} />
          Camera access required for hand tracking
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
    background: 'radial-gradient(ellipse at center, rgba(0,0,17,0.75) 0%, rgba(0,0,11,0.95) 100%)',
    backdropFilter: 'blur(2px)',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
    maxWidth: 600,
    padding: 48,
  },
  title: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: 'clamp(32px, 6vw, 64px)',
    fontWeight: 900,
    letterSpacing: '0.15em',
    color: '#fff',
    textShadow: '0 0 40px rgba(0, 255, 255, 0.4), 0 0 80px rgba(0, 255, 255, 0.15)',
    textAlign: 'center',
    lineHeight: 1.1,
  },
  subtitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 'clamp(14px, 2vw, 18px)',
    fontWeight: 300,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: '0.05em',
    textAlign: 'center',
    maxWidth: 400,
  },
  button: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: 'clamp(14px, 2vw, 16px)',
    fontWeight: 700,
    letterSpacing: '0.2em',
    color: '#00ffff',
    background: 'rgba(0, 255, 255, 0.05)',
    border: '1px solid rgba(0, 255, 255, 0.3)',
    borderRadius: 2,
    padding: '16px 48px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 0 15px rgba(0, 255, 255, 0.1)',
    marginTop: 16,
  },
  hint: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '0.05em',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'rgba(0,255,255,0.4)',
    display: 'inline-block',
  },
}
