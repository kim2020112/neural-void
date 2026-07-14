import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  createSceneInteractionFrame,
  resolveSceneInteractionFrame,
} from '../../scenes/sceneInteraction'
import quantumVert from '../../shaders/quantum.vert'
import quantumFrag from '../../shaders/quantum.frag'
import { useAppStore, type GestureType, type VoidCorePhase } from '../../store/appStore'
import { generateQuantumGeometry } from './generateQuantumGeometry'
import { QUANTUM_GESTURE } from './quantumTypes'

function dampValue(current: number, target: number, rise: number, fall: number, delta: number) {
  return THREE.MathUtils.damp(current, target, target > current ? rise : fall, delta)
}

export function QuantumSystem() {
  const groupRef = useRef<THREE.Group>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const interactionFrame = useRef(createSceneInteractionFrame())
  const previousGesture = useRef<GestureType>('none')
  const previousVoidPhase = useRef<VoidCorePhase>('idle')
  const pulseStartedAt = useRef(-100)
  const pulsePeak = useRef(0)
  const explosionStartedAt = useRef(-100)
  const explosionPeak = useRef(0)
  const smoothShellScale = useRef(1)
  const smoothSpin = useRef(0)
  const smoothPulse = useRef(0)
  const smoothPoint = useRef(0)
  const smoothCore = useRef(0)
  const smoothExplosion = useRef(0)
  const smoothTiltX = useRef(0)
  const smoothTiltZ = useRef(0)
  const pointPosition = useRef(new THREE.Vector3())

  const geometry = useMemo(() => generateQuantumGeometry(), [])
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.25) },
      uShellScale: { value: 1 },
      uSpinBoost: { value: 0 },
      uPulseStrength: { value: 0 },
      uPulseAge: { value: 100 },
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
      pulseStartedAt.current = time
      pulsePeak.current = Math.max(0.5, gestureStrength)
    }
    if (interaction.voidPhase === 'exploding' && previousVoidPhase.current !== 'exploding') {
      explosionStartedAt.current = time
      explosionPeak.current = Math.max(0.82, interaction.voidStrength)
    }
    previousGesture.current = activeGesture
    previousVoidPhase.current = interaction.voidPhase

    const pulseAge = Math.max(0, time - pulseStartedAt.current)
    const explosionAge = Math.max(0, time - explosionStartedAt.current)
    if (pulseAge > QUANTUM_GESTURE.pulseDuration) pulsePeak.current = 0
    if (explosionAge > QUANTUM_GESTURE.explosionDuration) explosionPeak.current = 0

    let targetShellScale = 1
    let targetSpin = 0
    let targetPulse = pulsePeak.current
    let targetPoint = 0
    let targetCore = 0
    let targetExplosion = explosionPeak.current
    let targetTiltX = 0
    let targetTiltZ = 0

    if (activeGesture === 'fist') {
      targetShellScale = THREE.MathUtils.lerp(1, QUANTUM_GESTURE.fistScale, gestureStrength)
      targetSpin = gestureStrength * 0.72
    } else if (activeGesture === 'open_palm') {
      targetShellScale = 1 + gestureStrength * 0.12
      targetPulse = Math.max(targetPulse, gestureStrength)
    } else if (activeGesture === 'point') {
      targetPoint = gestureStrength
      const fingertip = useSecondary ? store.hand2FingertipPosition : store.fingertipPosition
      pointPosition.current.set(fingertip.x, fingertip.y, fingertip.z)
      groupRef.current?.worldToLocal(pointPosition.current)
    }

    if (interaction.dualActive) {
      targetShellScale = THREE.MathUtils.lerp(
        QUANTUM_GESTURE.dualMinScale,
        QUANTUM_GESTURE.dualMaxScale,
        interaction.dualSpan,
      )
      targetTiltZ = THREE.MathUtils.clamp(interaction.midpoint.x / 7, -1, 1) * 0.24
      targetTiltX = THREE.MathUtils.clamp(interaction.midpoint.y / 6, -1, 1) * 0.18
    }

    const coreEngaged = interaction.voidPhase === 'forming' || interaction.voidPhase === 'active'
    if (coreEngaged) {
      const fallback = interaction.singleFistFallback ? QUANTUM_GESTURE.fallbackFactor : 1
      const strength = interaction.voidStrength * fallback
      targetCore = strength
      targetShellScale = THREE.MathUtils.lerp(targetShellScale, 0.32, strength)
      targetSpin = Math.max(targetSpin, strength * 1.08)
    }
    if (interaction.voidPhase === 'exploding') {
      explosionPeak.current = Math.max(explosionPeak.current, interaction.voidStrength)
      targetExplosion = explosionPeak.current
      targetSpin = Math.max(targetSpin, targetExplosion * 0.5)
    }

    smoothShellScale.current = dampValue(smoothShellScale.current, targetShellScale, 9.2, 3.8, dt)
    smoothSpin.current = dampValue(smoothSpin.current, targetSpin, 10.5, 3.6, dt)
    smoothPulse.current = dampValue(smoothPulse.current, targetPulse, 13, 5.2, dt)
    smoothPoint.current = dampValue(smoothPoint.current, targetPoint, 12, 4.8, dt)
    smoothCore.current = dampValue(smoothCore.current, targetCore, 9.5, 3.6, dt)
    smoothExplosion.current = dampValue(smoothExplosion.current, targetExplosion, 15, 6.5, dt)
    smoothTiltX.current = dampValue(smoothTiltX.current, targetTiltX, 7, 3.2, dt)
    smoothTiltZ.current = dampValue(smoothTiltZ.current, targetTiltZ, 7, 3.2, dt)

    if (groupRef.current) {
      groupRef.current.rotation.x = 0.06 + smoothTiltX.current
      groupRef.current.rotation.z = 0.025 + smoothTiltZ.current
    }
    const activeUniforms = materialRef.current?.uniforms
    if (!activeUniforms) return
    activeUniforms.uTime.value = time
    activeUniforms.uPixelRatio.value = Math.min(state.gl.getPixelRatio(), 1.25)
    activeUniforms.uShellScale.value = smoothShellScale.current
    activeUniforms.uSpinBoost.value = smoothSpin.current
    activeUniforms.uPulseStrength.value = smoothPulse.current
    activeUniforms.uPulseAge.value = pulseAge
    activeUniforms.uPointPos.value.copy(pointPosition.current)
    activeUniforms.uPointStrength.value = smoothPoint.current
    activeUniforms.uCoreStrength.value = smoothCore.current
    activeUniforms.uExplosionStrength.value = smoothExplosion.current
    activeUniforms.uExplosionAge.value = explosionAge
  })

  return (
    <group ref={groupRef} position={[0, 0.18, 0]} rotation={[0.06, 0, 0.025]}>
      <points frustumCulled={false} renderOrder={1}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[geometry.basePositions, 3]} />
          <bufferAttribute attach="attributes-aBasePosition" args={[geometry.basePositions, 3]} />
          <bufferAttribute attach="attributes-aRole" args={[geometry.roles, 1]} />
          <bufferAttribute attach="attributes-aLayer" args={[geometry.layers, 1]} />
          <bufferAttribute attach="attributes-aSeed" args={[geometry.seeds, 1]} />
          <bufferAttribute attach="attributes-aSize" args={[geometry.sizes, 1]} />
          <bufferAttribute attach="attributes-aProgress" args={[geometry.progress, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          vertexShader={quantumVert}
          fragmentShader={quantumFrag}
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
