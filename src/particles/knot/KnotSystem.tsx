import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  createSceneInteractionFrame,
  resolveSceneInteractionFrame,
} from '../../scenes/sceneInteraction'
import knotVert from '../../shaders/knot.vert'
import knotFrag from '../../shaders/knot.frag'
import { useAppStore, type GestureType, type VoidCorePhase } from '../../store/appStore'
import { generateKnotGeometry, sampleKnotPoint } from './generateKnotGeometry'
import { KNOT_COUNTS, KNOT_GESTURE } from './knotTypes'

const PARAMETER_SAMPLES = 96

function dampValue(current: number, target: number, rise: number, fall: number, delta: number) {
  return THREE.MathUtils.damp(current, target, target > current ? rise : fall, delta)
}

export function KnotSystem() {
  const groupRef = useRef<THREE.Group>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const interactionFrame = useRef(createSceneInteractionFrame())
  const previousGesture = useRef<GestureType>('none')
  const previousVoidPhase = useRef<VoidCorePhase>('idle')
  const pointStartedAt = useRef(-100)
  const pointPeak = useRef(0)
  const selectedParameter = useRef(0)
  const explosionStartedAt = useRef(-100)
  const explosionPeak = useRef(0)
  const smoothTightness = useRef(0)
  const smoothSpread = useRef(1)
  const smoothSpin = useRef(0)
  const smoothPoint = useRef(0)
  const smoothCore = useRef(0)
  const smoothExplosion = useRef(0)
  const smoothTiltX = useRef(0)
  const smoothTiltZ = useRef(0)
  const localPoint = useRef(new THREE.Vector3())
  const sampledPoint = useRef(new THREE.Vector3())

  const geometry = useMemo(() => generateKnotGeometry(), [])
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.25) },
      uTightness: { value: 0 },
      uSpreadScale: { value: 1 },
      uSpinBoost: { value: 0 },
      uSelectedParameter: { value: 0 },
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

    if (activeGesture === 'point' && previousGesture.current !== 'point') {
      pointStartedAt.current = time
      pointPeak.current = Math.max(0.55, gestureStrength)
      const fingertip = useSecondary ? store.hand2FingertipPosition : store.fingertipPosition
      localPoint.current.set(fingertip.x, fingertip.y, fingertip.z)
      groupRef.current?.worldToLocal(localPoint.current)
      let closestDistance = Number.POSITIVE_INFINITY
      for (let strand = 0; strand < KNOT_COUNTS.strandCount; strand++) {
        for (let sample = 0; sample < PARAMETER_SAMPLES; sample++) {
          const parameter = sample / PARAMETER_SAMPLES
          sampleKnotPoint(parameter, strand, smoothSpread.current, sampledPoint.current)
          const spinAngle = time * (0.055 + smoothSpin.current * 0.2)
          const x = sampledPoint.current.x
          const z = sampledPoint.current.z
          sampledPoint.current.x = x * Math.cos(spinAngle) - z * Math.sin(spinAngle)
          sampledPoint.current.z = x * Math.sin(spinAngle) + z * Math.cos(spinAngle)
          const distance = sampledPoint.current.distanceToSquared(localPoint.current)
          if (distance < closestDistance) {
            closestDistance = distance
            selectedParameter.current = parameter
          }
        }
      }
    }
    if (interaction.voidPhase === 'exploding' && previousVoidPhase.current !== 'exploding') {
      explosionStartedAt.current = time
      explosionPeak.current = Math.max(0.82, interaction.voidStrength)
    }
    previousGesture.current = activeGesture
    previousVoidPhase.current = interaction.voidPhase

    const pointAge = Math.max(0, time - pointStartedAt.current)
    const explosionAge = Math.max(0, time - explosionStartedAt.current)
    if (pointAge > KNOT_GESTURE.pointDuration) pointPeak.current = 0
    if (explosionAge > KNOT_GESTURE.explosionDuration) explosionPeak.current = 0

    let targetTightness = 0
    let targetSpread = 1
    let targetSpin = 0
    let targetPoint = pointPeak.current
    let targetCore = 0
    let targetExplosion = explosionPeak.current
    let targetTiltX = 0
    let targetTiltZ = 0

    if (activeGesture === 'fist') {
      targetTightness = gestureStrength * KNOT_GESTURE.fistTightness
      targetSpread = 1 - gestureStrength * 0.22
      targetSpin = gestureStrength
    } else if (activeGesture === 'open_palm') {
      targetSpread = 1 + gestureStrength * KNOT_GESTURE.openSpread
      targetSpin = gestureStrength * 0.18
    } else if (activeGesture === 'point') {
      targetPoint = Math.max(targetPoint, gestureStrength)
    }

    if (interaction.dualActive) {
      targetSpread = THREE.MathUtils.lerp(
        KNOT_GESTURE.dualMinSpread,
        KNOT_GESTURE.dualMaxSpread,
        interaction.dualSpan,
      )
      targetTiltZ = THREE.MathUtils.clamp(interaction.midpoint.x / 7, -1, 1) * 0.3
      targetTiltX = THREE.MathUtils.clamp(interaction.midpoint.y / 6, -1, 1) * 0.22
    }

    const coreEngaged = interaction.voidPhase === 'forming' || interaction.voidPhase === 'active'
    if (coreEngaged) {
      const fallback = interaction.singleFistFallback ? KNOT_GESTURE.fallbackFactor : 1
      const strength = interaction.voidStrength * fallback
      targetCore = strength
      targetTightness = Math.max(targetTightness, strength)
      targetSpread = THREE.MathUtils.lerp(targetSpread, 0.52, strength)
      targetSpin = Math.max(targetSpin, strength * 1.2)
    }
    if (interaction.voidPhase === 'exploding') {
      explosionPeak.current = Math.max(explosionPeak.current, interaction.voidStrength)
      targetExplosion = explosionPeak.current
      targetSpin = Math.max(targetSpin, targetExplosion * 0.62)
    }

    smoothTightness.current = dampValue(smoothTightness.current, targetTightness, 10.5, 4, dt)
    smoothSpread.current = dampValue(smoothSpread.current, targetSpread, 9.5, 3.8, dt)
    smoothSpin.current = dampValue(smoothSpin.current, targetSpin, 11, 3.7, dt)
    smoothPoint.current = dampValue(smoothPoint.current, targetPoint, 14, 5.4, dt)
    smoothCore.current = dampValue(smoothCore.current, targetCore, 9.2, 3.5, dt)
    smoothExplosion.current = dampValue(smoothExplosion.current, targetExplosion, 15, 6.2, dt)
    smoothTiltX.current = dampValue(smoothTiltX.current, targetTiltX, 7.5, 3.4, dt)
    smoothTiltZ.current = dampValue(smoothTiltZ.current, targetTiltZ, 7.5, 3.4, dt)

    if (groupRef.current) {
      groupRef.current.rotation.x = 0.08 + smoothTiltX.current
      groupRef.current.rotation.z = -0.04 + smoothTiltZ.current
    }
    const activeUniforms = materialRef.current?.uniforms
    if (!activeUniforms) return
    activeUniforms.uTime.value = time
    activeUniforms.uPixelRatio.value = Math.min(state.gl.getPixelRatio(), 1.25)
    activeUniforms.uTightness.value = smoothTightness.current
    activeUniforms.uSpreadScale.value = smoothSpread.current
    activeUniforms.uSpinBoost.value = smoothSpin.current
    activeUniforms.uSelectedParameter.value = selectedParameter.current
    activeUniforms.uPointStrength.value = smoothPoint.current
    activeUniforms.uPointAge.value = pointAge
    activeUniforms.uCoreStrength.value = smoothCore.current
    activeUniforms.uExplosionStrength.value = smoothExplosion.current
    activeUniforms.uExplosionAge.value = explosionAge
  })

  return (
    <group ref={groupRef} position={[0, 0.12, 0]} rotation={[0.08, 0, -0.04]}>
      <points frustumCulled={false} renderOrder={1}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[geometry.basePositions, 3]} />
          <bufferAttribute attach="attributes-aOffset" args={[geometry.offsets, 3]} />
          <bufferAttribute attach="attributes-aRole" args={[geometry.roles, 1]} />
          <bufferAttribute attach="attributes-aStrand" args={[geometry.strands, 1]} />
          <bufferAttribute attach="attributes-aParameter" args={[geometry.parameters, 1]} />
          <bufferAttribute attach="attributes-aSeed" args={[geometry.seeds, 1]} />
          <bufferAttribute attach="attributes-aSize" args={[geometry.sizes, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          vertexShader={knotVert}
          fragmentShader={knotFrag}
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
