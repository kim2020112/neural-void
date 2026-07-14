import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  createSceneInteractionFrame,
  resolveSceneInteractionFrame,
} from '../../scenes/sceneInteraction'
import galaxyVert from '../../shaders/galaxy.vert'
import galaxyFrag from '../../shaders/galaxy.frag'
import { useAppStore, type GestureType, type VoidCorePhase } from '../../store/appStore'
import { generateGalaxyGeometry } from './generateGalaxyGeometry'
import { GALAXY_GESTURE } from './galaxyTypes'

function dampValue(current: number, target: number, rise: number, fall: number, delta: number) {
  return THREE.MathUtils.damp(current, target, target > current ? rise : fall, delta)
}

export function GalaxySystem() {
  const groupRef = useRef<THREE.Group>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const interactionFrame = useRef(createSceneInteractionFrame())
  const previousGesture = useRef<GestureType>('none')
  const previousVoidPhase = useRef<VoidCorePhase>('idle')
  const waveStartedAt = useRef(-100)
  const wavePeak = useRef(0)
  const explosionStartedAt = useRef(-100)
  const explosionPeak = useRef(0)
  const smoothScale = useRef(1)
  const smoothTightness = useRef(0)
  const smoothSpin = useRef(0)
  const smoothWave = useRef(0)
  const smoothPoint = useRef(0)
  const smoothCore = useRef(0)
  const smoothExplosion = useRef(0)
  const smoothTiltX = useRef(0)
  const smoothTiltZ = useRef(0)
  const fieldCenter = useRef(new THREE.Vector3())

  const geometry = useMemo(() => generateGalaxyGeometry(), [])
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.25) },
      uScale: { value: 1 },
      uTightness: { value: 0 },
      uSpinBoost: { value: 0 },
      uWaveStrength: { value: 0 },
      uWaveAge: { value: 100 },
      uPointPos: { value: new THREE.Vector3() },
      uPointStrength: { value: 0 },
      uCoreStrength: { value: 0 },
      uExplosionStrength: { value: 0 },
      uExplosionAge: { value: 100 },
    }),
    [],
  )

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime
    const dt = Math.min(delta, 0.05)
    const store = useAppStore.getState()
    const interaction = resolveSceneInteractionFrame(store, interactionFrame.current)
    const useSecondary = interaction.primaryGesture === 'none' && interaction.secondaryGesture !== 'none'
    const activeGesture = useSecondary ? interaction.secondaryGesture : interaction.primaryGesture
    const gestureStrength = useSecondary ? interaction.secondaryStrength : interaction.primaryStrength

    if (activeGesture === 'open_palm' && previousGesture.current !== 'open_palm') {
      waveStartedAt.current = time
      wavePeak.current = Math.max(0.52, gestureStrength)
    }
    if (interaction.voidPhase === 'exploding' && previousVoidPhase.current !== 'exploding') {
      explosionStartedAt.current = time
      explosionPeak.current = Math.max(0.84, interaction.voidStrength)
    }
    previousGesture.current = activeGesture
    previousVoidPhase.current = interaction.voidPhase

    const waveAge = Math.max(0, time - waveStartedAt.current)
    const explosionAge = Math.max(0, time - explosionStartedAt.current)
    if (waveAge > GALAXY_GESTURE.waveDuration) wavePeak.current = 0
    if (explosionAge > GALAXY_GESTURE.explosionDuration) explosionPeak.current = 0

    let targetScale = 1
    let targetTightness = 0
    let targetSpin = 0
    let targetWave = wavePeak.current
    let targetPoint = 0
    let targetCore = 0
    let targetExplosion = explosionPeak.current
    let targetTiltX = 0
    let targetTiltZ = 0

    if (activeGesture === 'fist') {
      targetTightness = gestureStrength * GALAXY_GESTURE.fistTightness
      targetSpin = gestureStrength * 0.92
      targetScale = 1 - gestureStrength * 0.08
    } else if (activeGesture === 'open_palm') {
      targetWave = Math.max(targetWave, gestureStrength)
      targetScale = 1 + gestureStrength * 0.06
    } else if (activeGesture === 'point') {
      targetPoint = gestureStrength
      const fingertip = useSecondary ? store.hand2FingertipPosition : store.fingertipPosition
      fieldCenter.current.set(fingertip.x, fingertip.y, fingertip.z)
      groupRef.current?.worldToLocal(fieldCenter.current)
    }

    if (interaction.dualActive) {
      targetScale = THREE.MathUtils.lerp(
        GALAXY_GESTURE.dualMinScale,
        GALAXY_GESTURE.dualMaxScale,
        interaction.dualSpan,
      )
      targetTightness = Math.max(targetTightness, interaction.dualCompression * 0.45)
      targetPoint = Math.max(targetPoint, interaction.dualCompression * 0.18)
      fieldCenter.current.set(interaction.midpoint.x, interaction.midpoint.y, interaction.midpoint.z)
      groupRef.current?.worldToLocal(fieldCenter.current)
      targetTiltZ = THREE.MathUtils.clamp(interaction.midpoint.x / 7, -1, 1) * 0.2
      targetTiltX = THREE.MathUtils.clamp(interaction.midpoint.y / 6, -1, 1) * 0.16
    }

    const coreEngaged = interaction.voidPhase === 'forming' || interaction.voidPhase === 'active'
    if (coreEngaged) {
      const fallback = interaction.singleFistFallback ? GALAXY_GESTURE.fallbackFactor : 1
      const strength = interaction.voidStrength * fallback
      targetCore = strength
      targetTightness = Math.max(targetTightness, strength * 0.9)
      targetSpin = Math.max(targetSpin, strength * 1.25)
      targetScale = THREE.MathUtils.lerp(targetScale, 0.58, strength)
    }
    if (interaction.voidPhase === 'exploding') {
      explosionPeak.current = Math.max(explosionPeak.current, interaction.voidStrength)
      targetExplosion = explosionPeak.current
      targetSpin = Math.max(targetSpin, targetExplosion * 0.68)
      targetWave = Math.max(targetWave, targetExplosion * 0.8)
    }

    smoothScale.current = dampValue(smoothScale.current, targetScale, 8.5, 3.6, dt)
    smoothTightness.current = dampValue(smoothTightness.current, targetTightness, 9.8, 3.7, dt)
    smoothSpin.current = dampValue(smoothSpin.current, targetSpin, 10.2, 3.5, dt)
    smoothWave.current = dampValue(smoothWave.current, targetWave, 13, 4.9, dt)
    smoothPoint.current = dampValue(smoothPoint.current, targetPoint, 12, 4.7, dt)
    smoothCore.current = dampValue(smoothCore.current, targetCore, 9.2, 3.4, dt)
    smoothExplosion.current = dampValue(smoothExplosion.current, targetExplosion, 15, 6.1, dt)
    smoothTiltX.current = dampValue(smoothTiltX.current, targetTiltX, 7, 3.1, dt)
    smoothTiltZ.current = dampValue(smoothTiltZ.current, targetTiltZ, 7, 3.1, dt)

    if (groupRef.current) {
      groupRef.current.rotation.x = 0.04 + smoothTiltX.current
      groupRef.current.rotation.z = -0.025 + smoothTiltZ.current
    }
    const activeUniforms = materialRef.current?.uniforms
    if (!activeUniforms) return
    activeUniforms.uTime.value = time
    activeUniforms.uPixelRatio.value = Math.min(state.gl.getPixelRatio(), 1.25)
    activeUniforms.uScale.value = smoothScale.current
    activeUniforms.uTightness.value = smoothTightness.current
    activeUniforms.uSpinBoost.value = smoothSpin.current
    activeUniforms.uWaveStrength.value = smoothWave.current
    activeUniforms.uWaveAge.value = waveAge
    activeUniforms.uPointPos.value.copy(fieldCenter.current)
    activeUniforms.uPointStrength.value = smoothPoint.current
    activeUniforms.uCoreStrength.value = smoothCore.current
    activeUniforms.uExplosionStrength.value = smoothExplosion.current
    activeUniforms.uExplosionAge.value = explosionAge
  })

  return (
    <group ref={groupRef} position={[0, 0.05, 0]} rotation={[0.04, 0, -0.025]}>
      <points frustumCulled={false} renderOrder={1}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[geometry.basePositions, 3]} />
          <bufferAttribute attach="attributes-aBasePosition" args={[geometry.basePositions, 3]} />
          <bufferAttribute attach="attributes-aRole" args={[geometry.roles, 1]} />
          <bufferAttribute attach="attributes-aArm" args={[geometry.arms, 1]} />
          <bufferAttribute attach="attributes-aRadius" args={[geometry.radii, 1]} />
          <bufferAttribute attach="attributes-aSeed" args={[geometry.seeds, 1]} />
          <bufferAttribute attach="attributes-aSize" args={[geometry.sizes, 1]} />
          <bufferAttribute attach="attributes-aTemperature" args={[geometry.temperatures, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          vertexShader={galaxyVert}
          fragmentShader={galaxyFrag}
          uniforms={uniforms}
          transparent
          depthTest={false}
          depthWrite={false}
          blending={THREE.NormalBlending}
          toneMapped={false}
        />
      </points>
    </group>
  )
}
