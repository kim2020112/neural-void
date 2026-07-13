import { Bloom, BrightnessContrast, EffectComposer, Vignette } from '@react-three/postprocessing'
import { getSceneProfile } from '../scenes/sceneProfiles'
import { useAppStore } from '../store/appStore'

export function PostProcessingRig() {
  const cinematicState = useAppStore((state) => state.cinematicState)
  const interactionState = useAppStore((state) => state.interactionState)
  const voidCorePhase = useAppStore((state) => state.voidCorePhase)
  const particleShape = useAppStore((state) => state.particleShape)
  const galleryMode = useAppStore((state) => state.galleryMode)

  const post = getSceneProfile(particleShape).post
  const sceneBloom = post.bloom

  const bloomIntensity = sceneBloom
    ? sceneBloom.intensity
    : (0.68 + post.bloomBias * 0.42 + cinematicState.energy * 0.34 + cinematicState.shock * 0.16 + interactionState.presence * 0.1) *
      (galleryMode ? 0.68 : 0.9)
  const bloomRadius = sceneBloom
    ? sceneBloom.radius
    : (0.36 + cinematicState.transition * 0.1 + interactionState.duality * 0.03) * (galleryMode ? 0.72 : 0.9)
  const bloomThreshold = sceneBloom?.threshold ?? 0.28
  const bloomSmoothing = sceneBloom?.smoothing ?? 0.56

  const vignetteDarkness =
    0.66 +
    post.vignetteBias +
    cinematicState.energy * 0.035 +
    (voidCorePhase !== 'idle' ? 0.02 : 0) +
    (galleryMode ? 0.07 : -0.02)
  const contrast =
    0.14 +
    post.contrastBias +
    cinematicState.energy * 0.032 +
    cinematicState.transition * 0.024 +
    (galleryMode ? 0.06 : 0)
  const brightness = -0.01 + post.brightnessBias * 0.44 + cinematicState.pulse * 0.008 + (galleryMode ? -0.03 : 0.018)

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={bloomSmoothing}
        mipmapBlur
        intensity={bloomIntensity}
        radius={bloomRadius}
      />
      <BrightnessContrast brightness={brightness} contrast={contrast} />
      <Vignette eskil={false} offset={0.22} darkness={vignetteDarkness} />
    </EffectComposer>
  )
}
