import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  createSceneInteractionFrame,
  resolveSceneInteractionFrame,
} from '../../scenes/sceneInteraction'
import { useAppStore, type GestureType, type VoidCorePhase } from '../../store/appStore'
import singularityVert from '../../shaders/singularity.vert'
import singularityFrag from '../../shaders/singularity.frag'
import photonVert from '../../shaders/singularityPhoton.vert'
import photonFrag from '../../shaders/singularityPhoton.frag'
import { generateSingularityGeometry } from './generateSingularityGeometry'
import {
  SINGULARITY_CORE,
  SINGULARITY_COUNTS,
  SINGULARITY_GESTURE,
  SINGULARITY_POSE,
} from './singularityTypes'

function dampValue(current: number, target: number, rise: number, fall: number, delta: number) {
  return THREE.MathUtils.damp(current, target, target > current ? rise : fall, delta)
}

export function SingularitySystem() {
  const groupRef = useRef<THREE.Group>(null)
  const particleMaterialRef = useRef<THREE.ShaderMaterial>(null)
  const photonMaterialRef = useRef<THREE.ShaderMaterial>(null)
  const photonRingRef = useRef<THREE.Mesh>(null)
  const shockRingRef = useRef<THREE.Mesh>(null)
  const shockRingMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const pointFxRef = useRef<THREE.Group>(null)
  const pointCoreMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const pointRingMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const pointArcRef = useRef<THREE.Mesh>(null)
  const pointBeamRef = useRef<THREE.LineSegments>(null)
  const pointBeamMaterialRef = useRef<THREE.LineBasicMaterial>(null)

  const interactionFrame = useRef(createSceneInteractionFrame())
  const previousGesture = useRef<GestureType>('none')
  const previousVoidPhase = useRef<VoidCorePhase>('idle')
  const shockStartedAt = useRef(-100)
  const explosionStartedAt = useRef(-100)
  const explosionPeak = useRef(0)
  const smoothScale = useRef(1)
  const smoothSpin = useRef(0)
  const smoothCompression = useRef(0)
  const smoothCore = useRef(0)
  const smoothPoint = useRef(0)
  const smoothShock = useRef(0)
  const smoothExplosion = useRef(0)
  const smoothBreath = useRef(0.5)
  const pointPos = useRef(new THREE.Vector3())
  const shockOrigin = useRef(new THREE.Vector3())
  const handLocal = useRef(new THREE.Vector3())
  const beamTarget = useRef(new THREE.Vector3())

  const geometry = useMemo(
    () => generateSingularityGeometry(SINGULARITY_COUNTS.total),
    [],
  )
  const beamPositions = useMemo(() => new Float32Array(6), [])
  const particleUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.25) },
      uDiskScale: { value: 1 },
      uSpinBoost: { value: 0 },
      uCoreIntensity: { value: 0 },
      uCompression: { value: 0 },
      uPointPos: { value: new THREE.Vector3() },
      uPointStrength: { value: 0 },
      uPointRadius: { value: SINGULARITY_GESTURE.pointRadius },
      uPointMaxDisplace: { value: SINGULARITY_GESTURE.pointMaxDisplace },
      uShockStrength: { value: 0 },
      uShockAge: { value: 100 },
      uShockOrigin: { value: new THREE.Vector3() },
      uExplosionStrength: { value: 0 },
      uExplosionAge: { value: 100 },
      uBreath: { value: 0.5 },
    }),
    [],
  )
  const photonUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: 0 },
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
      shockStartedAt.current = time
      const hand = useSecondary ? store.hand2Position : store.handPosition
      handLocal.current.set(hand.x, hand.y, hand.z)
      groupRef.current?.worldToLocal(handLocal.current)
      shockOrigin.current.copy(handLocal.current)
    }
    if (interaction.voidPhase === 'exploding' && previousVoidPhase.current !== 'exploding') {
      explosionStartedAt.current = time
      explosionPeak.current = Math.max(0.8, interaction.voidStrength)
      shockOrigin.current.set(0, 0, 0)
    }
    if (interaction.voidPhase === 'idle' && previousVoidPhase.current !== 'idle') {
      explosionPeak.current = 0
    }
    previousGesture.current = activeGesture
    previousVoidPhase.current = interaction.voidPhase

    const shockAge = Math.max(0, time - shockStartedAt.current)
    const explosionAge = Math.max(0, time - explosionStartedAt.current)
    const breathPhase = 0.5 + 0.5 * Math.sin(time * 1.42)
    smoothBreath.current = THREE.MathUtils.damp(smoothBreath.current, breathPhase, 3.2, dt)

    let targetScale = 1
    let targetSpin = 0
    let targetCompression = 0
    let targetCore = 0
    let targetPoint = 0
    let targetShock = 0
    let targetExplosion = 0

    if (activeGesture === 'fist') {
      targetScale = THREE.MathUtils.lerp(1, SINGULARITY_GESTURE.fistScale, gestureStrength)
      targetSpin = gestureStrength * 0.92
      targetCompression = gestureStrength
      targetCore = gestureStrength * 0.62
    } else if (activeGesture === 'open_palm') {
      targetScale = THREE.MathUtils.lerp(1, SINGULARITY_GESTURE.openScale, gestureStrength)
      targetShock = shockAge < SINGULARITY_GESTURE.shockDuration ? gestureStrength : 0
    } else if (activeGesture === 'point') {
      targetPoint = gestureStrength
      const fingertip = useSecondary ? store.hand2FingertipPosition : store.fingertipPosition
      pointPos.current.set(fingertip.x, fingertip.y, fingertip.z)
      groupRef.current?.worldToLocal(pointPos.current)
    }

    const coreEngaged = interaction.voidPhase === 'forming' || interaction.voidPhase === 'active'
    if (coreEngaged) {
      const fallbackFactor = interaction.singleFistFallback
        ? SINGULARITY_GESTURE.fallbackFactor
        : 1
      const spanScale = THREE.MathUtils.lerp(
        SINGULARITY_GESTURE.dualCompressedScale,
        SINGULARITY_GESTURE.dualOpenScale,
        interaction.dualSpan,
      )
      const coreScale = interaction.dualActive ? spanScale : SINGULARITY_GESTURE.fallbackScale
      targetScale = THREE.MathUtils.lerp(1, coreScale, interaction.voidStrength)
      targetCompression = Math.max(
        targetCompression,
        interaction.voidStrength * fallbackFactor * (0.68 + interaction.dualCompression * 0.32),
      )
      targetSpin = Math.max(
        targetSpin,
        interaction.voidStrength * fallbackFactor * (0.74 + interaction.dualCompression * 0.66),
      )
      targetCore = Math.max(targetCore, interaction.voidStrength * fallbackFactor)
    }

    if (interaction.voidPhase === 'exploding') {
      explosionPeak.current = Math.max(explosionPeak.current, interaction.voidStrength)
    }
    if (explosionPeak.current > 0 && explosionAge < SINGULARITY_GESTURE.explosionDuration) {
      targetExplosion = explosionPeak.current * Math.exp(-explosionAge * 0.82)
      targetCore = Math.max(targetCore, targetExplosion)
      targetScale = Math.max(targetScale, 1 + targetExplosion * 0.12)
      targetSpin = Math.max(targetSpin, targetExplosion * 0.56)
    }

    smoothScale.current = dampValue(smoothScale.current, targetScale, 8.2, 3.4, dt)
    smoothSpin.current = dampValue(smoothSpin.current, targetSpin, 9.5, 3.1, dt)
    smoothCompression.current = dampValue(smoothCompression.current, targetCompression, 10, 3.7, dt)
    smoothCore.current = dampValue(smoothCore.current, targetCore, 8.8, 3.5, dt)
    smoothPoint.current = dampValue(smoothPoint.current, targetPoint, 11, 4.2, dt)
    smoothShock.current = dampValue(smoothShock.current, targetShock, 12, 5.2, dt)
    smoothExplosion.current = dampValue(smoothExplosion.current, targetExplosion, 14, 4.8, dt)

    const uniforms = particleMaterialRef.current?.uniforms
    if (uniforms) {
      uniforms.uTime.value = time
      uniforms.uPixelRatio.value = Math.min(state.gl.getPixelRatio(), 1.25)
      uniforms.uDiskScale.value = smoothScale.current
      uniforms.uSpinBoost.value = smoothSpin.current
      uniforms.uCoreIntensity.value = smoothCore.current
      uniforms.uCompression.value = smoothCompression.current
      uniforms.uPointPos.value.copy(pointPos.current)
      uniforms.uPointStrength.value = smoothPoint.current
      uniforms.uShockStrength.value = smoothShock.current
      uniforms.uShockAge.value = shockAge
      uniforms.uShockOrigin.value.copy(shockOrigin.current)
      uniforms.uExplosionStrength.value = smoothExplosion.current
      uniforms.uExplosionAge.value = explosionAge
      uniforms.uBreath.value = smoothBreath.current
    }

    if (photonMaterialRef.current) {
      const uniforms = photonMaterialRef.current.uniforms
      uniforms.uTime.value = time
      uniforms.uIntensity.value = smoothCore.current
      uniforms.uExplosionStrength.value = smoothExplosion.current
      uniforms.uExplosionAge.value = explosionAge
    }
    if (photonRingRef.current) {
      photonRingRef.current.rotation.z = time * (0.08 + smoothSpin.current * 0.16)
      photonRingRef.current.scale.setScalar(1 + smoothCompression.current * 0.035 + smoothExplosion.current * 0.12)
    }

    const ringStrength = Math.max(
      smoothShock.current * Math.exp(-shockAge * 1.15),
      smoothExplosion.current,
    )
    const ringAge = smoothExplosion.current > smoothShock.current ? explosionAge : shockAge
    if (shockRingRef.current) {
      shockRingRef.current.visible = ringStrength > 0.008
      shockRingRef.current.scale.setScalar(1 + ringAge * 4.4)
    }
    if (shockRingMaterialRef.current) {
      shockRingMaterialRef.current.opacity = ringStrength * Math.exp(-ringAge * 1.25) * 0.56
    }

    const pointVisible = smoothPoint.current > 0.008
    if (pointFxRef.current) {
      pointFxRef.current.visible = pointVisible
      pointFxRef.current.position.copy(pointPos.current)
      pointFxRef.current.scale.setScalar(0.9 + smoothPoint.current * 0.25)
    }
    if (pointArcRef.current) pointArcRef.current.rotation.z = time * 1.8
    if (pointCoreMaterialRef.current) pointCoreMaterialRef.current.opacity = smoothPoint.current * 0.22
    if (pointRingMaterialRef.current) pointRingMaterialRef.current.opacity = smoothPoint.current * 0.72
    if (pointBeamMaterialRef.current) pointBeamMaterialRef.current.opacity = smoothPoint.current * 0.25
    if (pointBeamRef.current) {
      pointBeamRef.current.visible = pointVisible
      beamTarget.current.copy(pointPos.current).normalize().multiplyScalar(SINGULARITY_CORE.photonRadius)
      const position = pointBeamRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
      position.setXYZ(0, pointPos.current.x, pointPos.current.y, pointPos.current.z)
      position.setXYZ(1, beamTarget.current.x, beamTarget.current.y, beamTarget.current.z)
      position.needsUpdate = true
    }
  })

  return (
    <group
      ref={groupRef}
      position={[0, SINGULARITY_POSE.positionY, 0]}
      rotation={[SINGULARITY_POSE.rotationX, 0, SINGULARITY_POSE.rotationZ]}
    >
      <mesh renderOrder={0}>
        <sphereGeometry args={[SINGULARITY_CORE.radius, 64, 48]} />
        <meshBasicMaterial color="#000000" depthTest depthWrite toneMapped={false} />
      </mesh>

      <points frustumCulled={false} renderOrder={1}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[geometry.basePositions, 3]} />
          <bufferAttribute attach="attributes-aBasePosition" args={[geometry.basePositions, 3]} />
          <bufferAttribute attach="attributes-aType" args={[geometry.types, 1]} />
          <bufferAttribute attach="attributes-aSeed" args={[geometry.seeds, 1]} />
          <bufferAttribute attach="attributes-aSize" args={[geometry.sizes, 1]} />
          <bufferAttribute attach="attributes-aBrightness" args={[geometry.brightness, 1]} />
          <bufferAttribute attach="attributes-aAngularSpeed" args={[geometry.angularSpeeds, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={particleMaterialRef}
          vertexShader={singularityVert}
          fragmentShader={singularityFrag}
          uniforms={particleUniforms}
          transparent
          depthTest
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>

      <mesh ref={photonRingRef} rotation={[Math.PI / 2, 0, 0]} renderOrder={3}>
        <torusGeometry args={[SINGULARITY_CORE.photonRadius, 0.045, 10, 192]} />
        <shaderMaterial
          ref={photonMaterialRef}
          vertexShader={photonVert}
          fragmentShader={photonFrag}
          uniforms={photonUniforms}
          transparent
          depthTest
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      <mesh ref={shockRingRef} visible={false} rotation={[Math.PI / 2, 0, 0]} renderOrder={4}>
        <torusGeometry args={[1.2, 0.018, 6, 128]} />
        <meshBasicMaterial
          ref={shockRingMaterialRef}
          color="#fff1c2"
          transparent
          opacity={0}
          depthTest={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      <group ref={pointFxRef} visible={false} renderOrder={5}>
        <mesh>
          <sphereGeometry args={[0.28, 16, 12]} />
          <meshBasicMaterial ref={pointCoreMaterialRef} color="#b9f5ff" transparent opacity={0} depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        <mesh ref={pointArcRef} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.46, 0.014, 5, 64, Math.PI * 1.55]} />
          <meshBasicMaterial ref={pointRingMaterialRef} color="#8cecff" transparent opacity={0} depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      </group>

      <lineSegments ref={pointBeamRef} visible={false} renderOrder={5}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[beamPositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial ref={pointBeamMaterialRef} color="#8cecff" transparent opacity={0} depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </lineSegments>
    </group>
  )
}
