import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  createSceneInteractionFrame,
  resolveSceneInteractionFrame,
} from '../../scenes/sceneInteraction'
import { useAppStore, type GestureType, type VoidCorePhase } from '../../store/appStore'
import dnaVert from '../../shaders/dna.vert'
import dnaFrag from '../../shaders/dna.frag'
import dnaBondVert from '../../shaders/dnaBond.vert'
import dnaBondFrag from '../../shaders/dnaBond.frag'
import { generateDnaGeometry } from './generateDnaGeometry'
import {
  DNA_COUNTS,
  DNA_GESTURE,
  DNA_POSE,
  DNA_STRUCTURE,
} from './dnaTypes'

function dampValue(current: number, target: number, rise: number, fall: number, delta: number) {
  return THREE.MathUtils.damp(current, target, target > current ? rise : fall, delta)
}

function createDeformationUniforms() {
  return {
    uRadiusScale: { value: 1 },
    uHeightScale: { value: 1 },
    uTwist: { value: 0 },
    uUnzip: { value: 0 },
    uScanProgress: { value: 0.5 },
    uScanStrength: { value: 0 },
    uScanAge: { value: 100 },
    uCoreStrength: { value: 0 },
    uReplicationStrength: { value: 0 },
    uReplicationAge: { value: 100 },
    uReplicationOrigin: { value: 0.5 },
  }
}

function updateDeformationUniforms(
  uniforms: Record<string, THREE.IUniform> | undefined,
  radiusScale: number,
  heightScale: number,
  twist: number,
  unzip: number,
  scanProgress: number,
  scanStrength: number,
  scanAge: number,
  coreStrength: number,
  replicationStrength: number,
  replicationAge: number,
  replicationOrigin: number,
) {
  if (!uniforms) return
  uniforms.uRadiusScale.value = radiusScale
  uniforms.uHeightScale.value = heightScale
  uniforms.uTwist.value = twist
  uniforms.uUnzip.value = unzip
  uniforms.uScanProgress.value = scanProgress
  uniforms.uScanStrength.value = scanStrength
  uniforms.uScanAge.value = scanAge
  uniforms.uCoreStrength.value = coreStrength
  uniforms.uReplicationStrength.value = replicationStrength
  uniforms.uReplicationAge.value = replicationAge
  uniforms.uReplicationOrigin.value = replicationOrigin
}

export function DnaSystem() {
  const groupRef = useRef<THREE.Group>(null)
  const particleMaterialRef = useRef<THREE.ShaderMaterial>(null)
  const bondMaterialRef = useRef<THREE.ShaderMaterial>(null)
  const interactionFrame = useRef(createSceneInteractionFrame())
  const previousGesture = useRef<GestureType>('none')
  const previousVoidPhase = useRef<VoidCorePhase>('idle')
  const scanStartedAt = useRef(-100)
  const scanOrigin = useRef(0.5)
  const replicationStartedAt = useRef(-100)
  const replicationPeak = useRef(0)
  const replicationOrigin = useRef(0.5)
  const smoothRadius = useRef(1)
  const smoothHeight = useRef(1)
  const smoothTwist = useRef(0)
  const smoothUnzip = useRef(0)
  const smoothScan = useRef(0)
  const smoothCore = useRef(0)
  const smoothReplication = useRef(0)
  const smoothBreath = useRef(0.5)
  const smoothYaw = useRef(0)
  const localPoint = useRef(new THREE.Vector3())
  const corePoint = useRef(new THREE.Vector3())

  const geometry = useMemo(() => generateDnaGeometry(DNA_COUNTS.total), [])
  const particleUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.25) },
      uBreath: { value: 0.5 },
      ...createDeformationUniforms(),
    }),
    [],
  )
  const bondUniforms = useMemo(() => createDeformationUniforms(), [])

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime
    const dt = Math.min(delta, 0.05)
    const store = useAppStore.getState()
    const interaction = resolveSceneInteractionFrame(store, interactionFrame.current)
    const useSecondary = interaction.primaryGesture === 'none' && interaction.secondaryGesture !== 'none'
    const activeGesture = useSecondary ? interaction.secondaryGesture : interaction.primaryGesture
    const gestureStrength = useSecondary ? interaction.secondaryStrength : interaction.primaryStrength

    if (activeGesture === 'point') {
      const fingertip = useSecondary ? store.hand2FingertipPosition : store.fingertipPosition
      localPoint.current.set(fingertip.x, fingertip.y, fingertip.z)
      groupRef.current?.worldToLocal(localPoint.current)
      const nextOrigin = THREE.MathUtils.clamp(
        localPoint.current.y / (DNA_STRUCTURE.height * Math.max(0.5, smoothHeight.current)) + 0.5,
        0,
        1,
      )
      if (
        previousGesture.current !== 'point' ||
        Math.abs(nextOrigin - scanOrigin.current) >= DNA_GESTURE.scanRestartDistance
      ) {
        scanStartedAt.current = time
        scanOrigin.current = nextOrigin
      }
    }

    const coreEngaged = interaction.voidPhase === 'forming' || interaction.voidPhase === 'active'
    if (coreEngaged) {
      const source = interaction.dualActive ? interaction.midpoint : store.voidCenter
      corePoint.current.set(source.x, source.y, source.z)
      groupRef.current?.worldToLocal(corePoint.current)
      replicationOrigin.current = THREE.MathUtils.clamp(
        corePoint.current.y / (DNA_STRUCTURE.height * Math.max(0.5, smoothHeight.current)) + 0.5,
        0.08,
        0.92,
      )
    }

    if (interaction.voidPhase === 'exploding' && previousVoidPhase.current !== 'exploding') {
      replicationStartedAt.current = time
      replicationPeak.current = Math.max(0.8, interaction.voidStrength)
    }
    if (interaction.voidPhase === 'idle' && previousVoidPhase.current !== 'idle') {
      replicationPeak.current = 0
    }
    previousGesture.current = activeGesture
    previousVoidPhase.current = interaction.voidPhase

    const scanAge = Math.max(0, time - scanStartedAt.current)
    const replicationAge = Math.max(0, time - replicationStartedAt.current)
    const breathPhase = 0.5 + 0.5 * Math.sin(time * 1.18)
    smoothBreath.current = THREE.MathUtils.damp(smoothBreath.current, breathPhase, 3, dt)

    let targetRadius = 1
    let targetHeight = 1
    let targetTwist = 0
    let targetUnzip = 0
    const targetScan = activeGesture === 'point' && scanAge <= DNA_GESTURE.scanDuration ? gestureStrength : 0
    let targetCore = 0
    let targetReplication = 0

    if (activeGesture === 'fist') {
      targetRadius = THREE.MathUtils.lerp(1, DNA_GESTURE.fistRadiusScale, gestureStrength)
      targetHeight = THREE.MathUtils.lerp(1, DNA_GESTURE.fistHeightScale, gestureStrength)
      targetTwist = DNA_GESTURE.fistTwist * gestureStrength
      targetCore = gestureStrength * 0.32
    } else if (activeGesture === 'open_palm') {
      targetRadius = THREE.MathUtils.lerp(1, DNA_GESTURE.openRadiusScale, gestureStrength)
      targetHeight = THREE.MathUtils.lerp(1, DNA_GESTURE.openHeightScale, gestureStrength)
      targetUnzip = DNA_GESTURE.openUnzip * gestureStrength
    }

    if (interaction.dualActive) {
      targetHeight = THREE.MathUtils.lerp(
        DNA_GESTURE.dualCompressedHeight,
        DNA_GESTURE.dualOpenHeight,
        interaction.dualSpan,
      )
      targetRadius = THREE.MathUtils.lerp(
        DNA_GESTURE.dualCompressedRadius,
        DNA_GESTURE.dualOpenRadius,
        interaction.dualSpan,
      )
      targetTwist = Math.max(targetTwist, interaction.dualCompression * 0.38)
    }

    if (coreEngaged) {
      const fallbackFactor = interaction.singleFistFallback ? DNA_GESTURE.fallbackFactor : 1
      const coreStrength = interaction.voidStrength * fallbackFactor
      targetCore = Math.max(targetCore, coreStrength)
      targetTwist = Math.max(targetTwist, coreStrength * 0.62)
      targetRadius = THREE.MathUtils.lerp(targetRadius, 0.9, coreStrength * 0.58)
      targetHeight = THREE.MathUtils.lerp(targetHeight, 0.94, coreStrength * 0.46)
    }

    if (interaction.voidPhase === 'exploding') {
      replicationPeak.current = Math.max(replicationPeak.current, interaction.voidStrength)
    }
    if (replicationPeak.current > 0) {
      const tail = replicationAge <= DNA_GESTURE.replicationHoldSeconds
        ? 1
        : Math.exp(-(replicationAge - DNA_GESTURE.replicationHoldSeconds) * 1.2)
      targetReplication = replicationPeak.current * tail
      targetUnzip = Math.max(targetUnzip, targetReplication * 0.32)
      targetCore = Math.max(targetCore, targetReplication * 0.88)
    }

    smoothRadius.current = dampValue(smoothRadius.current, targetRadius, 8.2, 3.4, dt)
    smoothHeight.current = dampValue(smoothHeight.current, targetHeight, 8, 3.2, dt)
    smoothTwist.current = dampValue(smoothTwist.current, targetTwist, 9, 3.4, dt)
    smoothUnzip.current = dampValue(smoothUnzip.current, targetUnzip, 10, 4, dt)
    smoothScan.current = dampValue(smoothScan.current, targetScan, 12, 5, dt)
    smoothCore.current = dampValue(smoothCore.current, targetCore, 8.5, 3.5, dt)
    smoothReplication.current = dampValue(
      smoothReplication.current,
      targetReplication,
      14,
      4.5,
      dt,
    )

    const targetYaw = interaction.handCount > 0
      ? THREE.MathUtils.clamp(
        (interaction.dualActive ? interaction.midpoint.x : store.handPosition.x) / 7,
        -1,
        1,
      ) * 0.1
      : 0
    smoothYaw.current = THREE.MathUtils.damp(smoothYaw.current, targetYaw, 3.2, dt)
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(time * 0.17) * 0.09 + smoothYaw.current
    }

    const particle = particleMaterialRef.current?.uniforms
    updateDeformationUniforms(
      particle,
      smoothRadius.current,
      smoothHeight.current,
      smoothTwist.current,
      smoothUnzip.current,
      scanOrigin.current,
      smoothScan.current,
      scanAge,
      smoothCore.current,
      smoothReplication.current,
      replicationAge,
      replicationOrigin.current,
    )
    if (particle) {
      particle.uTime.value = time
      particle.uPixelRatio.value = Math.min(state.gl.getPixelRatio(), 1.25)
      particle.uBreath.value = smoothBreath.current
    }
    updateDeformationUniforms(
      bondMaterialRef.current?.uniforms,
      smoothRadius.current,
      smoothHeight.current,
      smoothTwist.current,
      smoothUnzip.current,
      scanOrigin.current,
      smoothScan.current,
      scanAge,
      smoothCore.current,
      smoothReplication.current,
      replicationAge,
      replicationOrigin.current,
    )
  })

  return (
    <group
      ref={groupRef}
      position={[0, DNA_POSE.positionY, 0]}
      rotation={[DNA_POSE.rotationX, 0, DNA_POSE.rotationZ]}
    >
      <points frustumCulled={false} renderOrder={1}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[geometry.basePositions, 3]} />
          <bufferAttribute attach="attributes-aBasePosition" args={[geometry.basePositions, 3]} />
          <bufferAttribute attach="attributes-aType" args={[geometry.types, 1]} />
          <bufferAttribute attach="attributes-aSeed" args={[geometry.seeds, 1]} />
          <bufferAttribute attach="attributes-aSize" args={[geometry.sizes, 1]} />
          <bufferAttribute attach="attributes-aBrightness" args={[geometry.brightness, 1]} />
          <bufferAttribute attach="attributes-aProgress" args={[geometry.progress, 1]} />
          <bufferAttribute attach="attributes-aPairClass" args={[geometry.pairClasses, 1]} />
          <bufferAttribute attach="attributes-aSide" args={[geometry.strandSides, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={particleMaterialRef}
          vertexShader={dnaVert}
          fragmentShader={dnaFrag}
          uniforms={particleUniforms}
          transparent
          depthTest
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>

      <lineSegments frustumCulled={false} renderOrder={2}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[geometry.bondPositions, 3]} />
          <bufferAttribute attach="attributes-aProgress" args={[geometry.bondProgress, 1]} />
          <bufferAttribute attach="attributes-aPairClass" args={[geometry.bondPairClasses, 1]} />
          <bufferAttribute attach="attributes-aSide" args={[geometry.bondSides, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={bondMaterialRef}
          vertexShader={dnaBondVert}
          fragmentShader={dnaBondFrag}
          uniforms={bondUniforms}
          transparent
          depthTest
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  )
}
