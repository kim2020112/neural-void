import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Background } from './Background'
import { ParticleUniverse } from '../particles/ParticleUniverse'
import { MouseTracker } from './MouseTracker'

export function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 1.5, 14], fov: 60, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
    >
      <Background />
      <ParticleUniverse />
      <MouseTracker />
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          mipmapBlur
          intensity={1.2}
          radius={0.6}
        />
      </EffectComposer>
    </Canvas>
  )
}
