import { Canvas } from '@react-three/fiber'
import { Background } from './Background'

export function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 60, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
    >
      <Background />
    </Canvas>
  )
}
