import { Canvas } from '@react-three/fiber'
import { Background } from './Background'
import { ParticleUniverse } from '../particles/ParticleUniverse'
import { MouseTracker } from './MouseTracker'
import { HandCursor } from './HandCursor'
import { ReferenceRing } from './ReferenceRing'
import { CinematicRig } from './CinematicRig'
import { SpaceAtmosphere } from './SpaceAtmosphere'
import { PostProcessingRig } from './PostProcessingRig'

export function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 1.6, 14], fov: 60, near: 0.1, far: 120 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
    >
      <fogExp2 attach="fog" args={['#04060d', 0.018]} />
      <Background />
      <SpaceAtmosphere />
      <ParticleUniverse />
      <HandCursor />
      <ReferenceRing />
      <MouseTracker />
      <CinematicRig />
      <PostProcessingRig />
    </Canvas>
  )
}