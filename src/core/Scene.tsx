import { Canvas } from '@react-three/fiber'
import { Background } from './Background'
import { MouseTracker } from './MouseTracker'
import { CinematicRig } from './CinematicRig'
import { SpaceAtmosphere } from './SpaceAtmosphere'
import { PostProcessingRig } from './PostProcessingRig'
import { useAppStore } from '../store/appStore'
import { getSceneProfile } from '../scenes/sceneProfiles'
import { DEFAULT_PARTICLE_SHAPE } from '../particles/shapes/catalog'

const initialCamera = getSceneProfile(DEFAULT_PARTICLE_SHAPE).camera

function ParticleLayer() {
  const particleShape = useAppStore((s) => s.particleShape)
  const Renderer = getSceneProfile(particleShape).Renderer
  return <Renderer />
}

export function Scene() {
  const particleShape = useAppStore((state) => state.particleShape)
  const fogDensity = particleShape === 'singularity' ? 0.006 : 0.012

  return (
    <Canvas
      camera={{ position: initialCamera.position, fov: initialCamera.fov, near: 0.1, far: 120 }}
      gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 1.25]}
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
    >
      <color attach="background" args={['#02050D']} />
      <fogExp2 attach="fog" args={['#02050D', fogDensity]} />
      <Background />
      <SpaceAtmosphere />
      <ParticleLayer />
      <MouseTracker />
      <CinematicRig />
      <PostProcessingRig />
    </Canvas>
  )
}
