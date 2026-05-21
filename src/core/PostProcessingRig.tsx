import { useMemo } from 'react'
import { Bloom, BrightnessContrast, ChromaticAberration, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { Vector2 } from 'three'
import { useAppStore } from '../store/appStore'

export function PostProcessingRig() {
  const cinematicState = useAppStore((state) => state.cinematicState)
  const interactionState = useAppStore((state) => state.interactionState)
  const voidCorePhase = useAppStore((state) => state.voidCorePhase)
  const particleShape = useAppStore((state) => state.particleShape)
  const galleryMode = useAppStore((state) => state.galleryMode)

  const chromaOffset = useMemo(
    () => {
      const galleryFactor = galleryMode ? 0.38 : 1
      return new Vector2(
        (0.00022 + cinematicState.shock * 0.00072 + interactionState.duality * 0.00028) * galleryFactor,
        (0.0003 + cinematicState.transition * 0.00064 + cinematicState.energy * 0.00018) * galleryFactor,
      )
    },
    [cinematicState.energy, cinematicState.shock, cinematicState.transition, galleryMode, interactionState.duality],
  )

  const shapeBloomBias =
    particleShape === 'saturn_ring'
      ? 0.18
      : particleShape === 'hypercube'
        ? -0.26
        : particleShape === 'singularity'
          ? -0.12
          : particleShape === 'golden_spiral'
            ? -0.18
            : 0
  const shapeContrastBias =
    particleShape === 'saturn_ring'
      ? 0.02
      : particleShape === 'hypercube'
        ? 0.08
        : particleShape === 'singularity'
          ? 0.06
          : particleShape === 'galaxy'
            ? 0.04
            : particleShape === 'knot_torus'
              ? 0.03
              : 0.02
  const shapeBrightnessBias =
    particleShape === 'saturn_ring'
      ? 0.05
      : particleShape === 'hypercube'
        ? -0.03
        : particleShape === 'singularity'
          ? -0.04
          : particleShape === 'galaxy'
            ? -0.028
            : particleShape === 'golden_spiral'
              ? -0.02
              : -0.012
  const shapeVignetteBias =
    particleShape === 'saturn_ring'
      ? 0.01
      : particleShape === 'singularity'
        ? 0.06
        : particleShape === 'galaxy'
          ? 0.04
          : particleShape === 'hypercube'
            ? 0.03
            : 0.02

  const bloomIntensity =
    (0.68 + shapeBloomBias * 0.42 + cinematicState.energy * 0.34 + cinematicState.shock * 0.16 + interactionState.presence * 0.1) *
    (galleryMode ? 0.74 : 1.16)
  const bloomRadius = (0.36 + cinematicState.transition * 0.1 + interactionState.duality * 0.03) * (galleryMode ? 0.8 : 1.12)
  const noiseOpacity = (0.004 + cinematicState.atmosphere * 0.003 + cinematicState.shock * 0.0022) * (galleryMode ? 0.52 : 1)
  const vignetteDarkness =
    0.66 +
    shapeVignetteBias +
    cinematicState.energy * 0.035 +
    (voidCorePhase !== 'idle' ? 0.02 : 0) +
    (galleryMode ? 0.07 : -0.02)
  const contrast =
    0.14 +
    shapeContrastBias +
    cinematicState.energy * 0.032 +
    cinematicState.transition * 0.024 +
    (galleryMode ? 0.06 : 0)
  const brightness = -0.01 + shapeBrightnessBias * 0.44 + cinematicState.pulse * 0.008 + (galleryMode ? -0.03 : 0.018)

  const bloomThreshold = particleShape === 'saturn_ring' ? 0.14 : 0.28
  const bloomSmoothing = particleShape === 'saturn_ring' ? 0.68 : 0.56

  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={bloomSmoothing}
        mipmapBlur
        intensity={bloomIntensity}
        radius={bloomRadius}
      />
      <BrightnessContrast brightness={brightness} contrast={contrast} />
      <ChromaticAberration offset={chromaOffset} radialModulation modulationOffset={0.62} />
      <Noise opacity={noiseOpacity} premultiply />
      <Vignette eskil={false} offset={0.22} darkness={vignetteDarkness} />
    </EffectComposer>
  )
}