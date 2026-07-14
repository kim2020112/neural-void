import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  createSceneInteractionFrame,
  resolveSceneInteractionFrame,
} from '../../scenes/sceneInteraction'
import spiralVert from '../../shaders/spiral.vert'
import spiralFrag from '../../shaders/spiral.frag'
import { useAppStore, type GestureType, type VoidCorePhase } from '../../store/appStore'
import { generateSpiralGeometry, sampleGoldenSpiralPoint } from './generateSpiralGeometry'
import { SPIRAL_COUNTS, SPIRAL_GESTURE } from './spiralTypes'

function dampValue(current: number, target: number, rise: number, fall: number, delta: number) {
  return THREE.MathUtils.damp(current, target, target > current ? rise : fall, delta)
}

export function SpiralSystem() {
  const groupRef = useRef<THREE.Group>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const interactionFrame = useRef(createSceneInteractionFrame())
  const previousGesture = useRef<GestureType>('none')
  const previousVoidPhase = useRef<VoidCorePhase>('idle')
  const growthStartedAt = useRef(-100)
  const growthPeak = useRef(0)
  const pointStartedAt = useRef(-100)
  const pointPeak = useRef(0)
  const selectedNode = useRef(0)
  const explosionStartedAt = useRef(-100)
  const explosionPeak = useRef(0)
  const smoothScale = useRef(1)
  const smoothRewind = useRef(0)
  const smoothGrowth = useRef(0)
  const smoothPoint = useRef(0)
  const smoothCore = useRef(0)
  const smoothExplosion = useRef(0)
  const smoothTiltX = useRef(0)
  const smoothTiltZ = useRef(0)
  const localPoint = useRef(new THREE.Vector3())
  const sampledPoint = useRef(new THREE.Vector3())

  const geometry = useMemo(() => generateSpiralGeometry(), [])
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.25) },
      uScale: { value: 1 },
      uRewind: { value: 0 },
      uGrowthStrength: { value: 0 },
      uGrowthAge: { value: 100 },
      uSelectedNode: { value: 0 },
      uPointStrength: { value: 0 },
      uPointAge: { value: 100 },
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
      growthStartedAt.current = time
      growthPeak.current = Math.max(0.52, gestureStrength)
    }
    if (activeGesture === 'point' && previousGesture.current !== 'point') {
      pointStartedAt.current = time
      pointPeak.current = Math.max(0.55, gestureStrength)
      const fingertip = useSecondary ? store.hand2FingertipPosition : store.fingertipPosition
      localPoint.current.set(fingertip.x, fingertip.y, fingertip.z)
      groupRef.current?.worldToLocal(localPoint.current)
      let closestDistance = Number.POSITIVE_INFINITY
      for (let node = 0; node < SPIRAL_COUNTS.scaleNodeCount; node++) {
        const progress = node / (SPIRAL_COUNTS.scaleNodeCount - 1)
        sampleGoldenSpiralPoint(progress, 1, sampledPoint.current)
        const distance = sampledPoint.current.distanceToSquared(localPoint.current)
        if (distance < closestDistance) {
          closestDistance = distance
          selectedNode.current = node
        }
      }
    }
    if (interaction.voidPhase === 'exploding' && previousVoidPhase.current !== 'exploding') {
      explosionStartedAt.current = time
      explosionPeak.current = Math.max(0.82, interaction.voidStrength)
    }
    previousGesture.current = activeGesture
    previousVoidPhase.current = interaction.voidPhase

    const growthAge = Math.max(0, time - growthStartedAt.current)
    const pointAge = Math.max(0, time - pointStartedAt.current)
    const explosionAge = Math.max(0, time - explosionStartedAt.current)
    if (growthAge > SPIRAL_GESTURE.growthDuration) growthPeak.current = 0
    if (pointAge > SPIRAL_GESTURE.pointDuration) pointPeak.current = 0
    if (explosionAge > SPIRAL_GESTURE.explosionDuration) explosionPeak.current = 0

    let targetScale = 1
    let targetRewind = 0
    let targetGrowth = growthPeak.current
    let targetPoint = pointPeak.current
    let targetCore = 0
    let targetExplosion = explosionPeak.current
    let targetTiltX = 0
    let targetTiltZ = 0

    if (activeGesture === 'fist') {
      targetRewind = gestureStrength * SPIRAL_GESTURE.fistRewind
      targetScale = 1 - gestureStrength * 0.12
    } else if (activeGesture === 'open_palm') {
      targetGrowth = Math.max(targetGrowth, gestureStrength)
      targetScale = 1 + gestureStrength * 0.08
    } else if (activeGesture === 'point') {
      targetPoint = Math.max(targetPoint, gestureStrength)
    }

    if (interaction.dualActive) {
      targetScale = THREE.MathUtils.lerp(
        SPIRAL_GESTURE.dualMinScale,
        SPIRAL_GESTURE.dualMaxScale,
        interaction.dualSpan,
      )
      targetTiltZ = THREE.MathUtils.clamp(interaction.midpoint.x / 7, -1, 1) * 0.25
      targetTiltX = THREE.MathUtils.clamp(interaction.midpoint.y / 6, -1, 1) * 0.18
    }

    const coreEngaged = interaction.voidPhase === 'forming' || interaction.voidPhase === 'active'
    if (coreEngaged) {
      const fallback = interaction.singleFistFallback ? SPIRAL_GESTURE.fallbackFactor : 1
      const strength = interaction.voidStrength * fallback
      targetCore = strength
      targetRewind = Math.max(targetRewind, strength)
      targetScale = THREE.MathUtils.lerp(targetScale, 0.48, strength)
    }
    if (interaction.voidPhase === 'exploding') {
      explosionPeak.current = Math.max(explosionPeak.current, interaction.voidStrength)
      targetExplosion = explosionPeak.current
      targetGrowth = Math.max(targetGrowth, targetExplosion * 0.7)
    }

    smoothScale.current = dampValue(smoothScale.current, targetScale, 8.8, 3.8, dt)
    smoothRewind.current = dampValue(smoothRewind.current, targetRewind, 10, 3.6, dt)
    smoothGrowth.current = dampValue(smoothGrowth.current, targetGrowth, 13, 4.8, dt)
    smoothPoint.current = dampValue(smoothPoint.current, targetPoint, 13.5, 5.2, dt)
    smoothCore.current = dampValue(smoothCore.current, targetCore, 9, 3.4, dt)
    smoothExplosion.current = dampValue(smoothExplosion.current, targetExplosion, 15, 6.3, dt)
    smoothTiltX.current = dampValue(smoothTiltX.current, targetTiltX, 7, 3.2, dt)
    smoothTiltZ.current = dampValue(smoothTiltZ.current, targetTiltZ, 7, 3.2, dt)

    if (groupRef.current) {
      groupRef.current.rotation.x = 0.12 + smoothTiltX.current
      groupRef.current.rotation.z = -0.05 + smoothTiltZ.current
    }
    const activeUniforms = materialRef.current?.uniforms
    if (!activeUniforms) return
    activeUniforms.uTime.value = time
    activeUniforms.uPixelRatio.value = Math.min(state.gl.getPixelRatio(), 1.25)
    activeUniforms.uScale.value = smoothScale.current
    activeUniforms.uRewind.value = smoothRewind.current
    activeUniforms.uGrowthStrength.value = smoothGrowth.current
    activeUniforms.uGrowthAge.value = growthAge
    activeUniforms.uSelectedNode.value = selectedNode.current
    activeUniforms.uPointStrength.value = smoothPoint.current
    activeUniforms.uPointAge.value = pointAge
    activeUniforms.uCoreStrength.value = smoothCore.current
    activeUniforms.uExplosionStrength.value = smoothExplosion.current
    activeUniforms.uExplosionAge.value = explosionAge
  })

  return (
    <group ref={groupRef} position={[0, 0.12, 0]} rotation={[0.12, 0, -0.05]}>
      <points frustumCulled={false} renderOrder={1}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[geometry.basePositions, 3]} />
          <bufferAttribute attach="attributes-aBasePosition" args={[geometry.basePositions, 3]} />
          <bufferAttribute attach="attributes-aRole" args={[geometry.roles, 1]} />
          <bufferAttribute attach="attributes-aFilament" args={[geometry.filaments, 1]} />
          <bufferAttribute attach="attributes-aProgress" args={[geometry.progress, 1]} />
          <bufferAttribute attach="attributes-aNode" args={[geometry.nodes, 1]} />
          <bufferAttribute attach="attributes-aSeed" args={[geometry.seeds, 1]} />
          <bufferAttribute attach="attributes-aSize" args={[geometry.sizes, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          vertexShader={spiralVert}
          fragmentShader={spiralFrag}
          uniforms={uniforms}
          transparent
          depthTest
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  )
}
