import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  createSceneInteractionFrame,
  resolveSceneInteractionFrame,
} from '../../scenes/sceneInteraction'
import hypercubeVert from '../../shaders/hypercube.vert'
import hypercubeFrag from '../../shaders/hypercube.frag'
import { useAppStore, type GestureType, type VoidCorePhase } from '../../store/appStore'
import {
  generateHypercubeGeometry,
  projectHypercubePoint,
} from './generateHypercubeGeometry'
import {
  HYPERCUBE_GESTURE,
  HYPERCUBE_ROTATION,
  HYPERCUBE_VERTICES_4D,
} from './hypercubeTypes'

function dampValue(current: number, target: number, rise: number, fall: number, delta: number) {
  return THREE.MathUtils.damp(current, target, target > current ? rise : fall, delta)
}

export function HypercubeSystem() {
  const groupRef = useRef<THREE.Group>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const interactionFrame = useRef(createSceneInteractionFrame())
  const previousGesture = useRef<GestureType>('none')
  const previousVoidPhase = useRef<VoidCorePhase>('idle')
  const expansionStartedAt = useRef(-100)
  const pointStartedAt = useRef(-100)
  const explosionStartedAt = useRef(-100)
  const explosionPeak = useRef(0)
  const selectedVertex = useRef(-1)
  const smoothWScale = useRef(1)
  const smoothSpin = useRef(0)
  const smoothExpansion = useRef(0)
  const smoothPoint = useRef(0)
  const smoothCore = useRef(0)
  const smoothExplosion = useRef(0)
  const smoothAngleX = useRef(0)
  const smoothAngleY = useRef(0)
  const localPoint = useRef(new THREE.Vector3())
  const projectedVertex = useRef(new THREE.Vector3())

  const geometry = useMemo(() => generateHypercubeGeometry(), [])
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.25) },
      uAngleXW: { value: HYPERCUBE_ROTATION.initialXW },
      uAngleYW: { value: HYPERCUBE_ROTATION.initialYW },
      uWScale: { value: 1 },
      uExpansionStrength: { value: 0 },
      uExpansionAge: { value: 100 },
      uSelectedVertex: { value: -1 },
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

    if (
      activeGesture === 'open_palm' &&
      previousGesture.current !== 'open_palm' &&
      interaction.voidPhase !== 'exploding'
    ) {
      expansionStartedAt.current = time
    }

    if (activeGesture === 'point' && previousGesture.current !== 'point') {
      pointStartedAt.current = time
      const fingertip = useSecondary ? store.hand2FingertipPosition : store.fingertipPosition
      localPoint.current.set(fingertip.x, fingertip.y, fingertip.z)
      groupRef.current?.worldToLocal(localPoint.current)
      const angleXW = HYPERCUBE_ROTATION.initialXW +
        time * (HYPERCUBE_ROTATION.idleXW + smoothSpin.current * 0.34) + smoothAngleX.current
      const angleYW = HYPERCUBE_ROTATION.initialYW +
        time * (HYPERCUBE_ROTATION.idleYW + smoothSpin.current * 0.26) + smoothAngleY.current
      let closestDistance = Number.POSITIVE_INFINITY
      for (let index = 0; index < HYPERCUBE_VERTICES_4D.length; index++) {
        projectHypercubePoint(
          HYPERCUBE_VERTICES_4D[index],
          angleXW,
          angleYW,
          smoothWScale.current,
          projectedVertex.current,
        )
        const distance = projectedVertex.current.distanceToSquared(localPoint.current)
        if (distance < closestDistance) {
          closestDistance = distance
          selectedVertex.current = index
        }
      }
    }

    if (interaction.voidPhase === 'exploding' && previousVoidPhase.current !== 'exploding') {
      explosionStartedAt.current = time
      explosionPeak.current = Math.max(0.8, interaction.voidStrength)
    }
    if (interaction.voidPhase === 'idle' && previousVoidPhase.current !== 'idle') {
      explosionPeak.current = 0
    }
    previousGesture.current = activeGesture
    previousVoidPhase.current = interaction.voidPhase

    const expansionAge = Math.max(0, time - expansionStartedAt.current)
    const pointAge = Math.max(0, time - pointStartedAt.current)
    const explosionAge = Math.max(0, time - explosionStartedAt.current)
    let targetWScale = 1
    let targetSpin = 0
    let targetExpansion = 0
    let targetPoint = 0
    let targetCore = 0
    let targetExplosion = 0
    let targetAngleX = 0
    let targetAngleY = 0

    if (activeGesture === 'fist') {
      targetWScale = THREE.MathUtils.lerp(1, HYPERCUBE_GESTURE.fistWScale, gestureStrength)
      targetSpin = gestureStrength
    } else if (activeGesture === 'open_palm') {
      targetWScale = THREE.MathUtils.lerp(1, HYPERCUBE_GESTURE.openWScale, gestureStrength)
      if (expansionAge <= HYPERCUBE_GESTURE.expansionDuration) targetExpansion = gestureStrength
    } else if (activeGesture === 'point' && pointAge <= HYPERCUBE_GESTURE.pointDuration) {
      targetPoint = gestureStrength
    }

    if (interaction.dualActive) {
      targetWScale = THREE.MathUtils.lerp(
        HYPERCUBE_GESTURE.dualMinWScale,
        HYPERCUBE_GESTURE.dualMaxWScale,
        interaction.dualSpan,
      )
      targetAngleX = THREE.MathUtils.clamp(interaction.midpoint.x / 6.5, -1, 1) * 0.52
      targetAngleY = THREE.MathUtils.clamp(interaction.midpoint.y / 5.5, -1, 1) * 0.42
    }

    const coreEngaged = interaction.voidPhase === 'forming' || interaction.voidPhase === 'active'
    if (coreEngaged) {
      const fallbackFactor = interaction.singleFistFallback ? HYPERCUBE_GESTURE.fallbackFactor : 1
      const coreStrength = interaction.voidStrength * fallbackFactor
      targetCore = coreStrength
      targetWScale = THREE.MathUtils.lerp(targetWScale, 0.18, coreStrength)
      targetSpin = Math.max(targetSpin, coreStrength * 1.16)
    }

    if (interaction.voidPhase === 'exploding') {
      explosionPeak.current = Math.max(explosionPeak.current, interaction.voidStrength)
    }
    if (explosionPeak.current > 0 && explosionAge <= HYPERCUBE_GESTURE.rebuildDuration) {
      targetExplosion = explosionPeak.current
      targetSpin = Math.max(targetSpin, targetExplosion * 0.58)
    }

    smoothWScale.current = dampValue(smoothWScale.current, targetWScale, 8.8, 3.8, dt)
    smoothSpin.current = dampValue(smoothSpin.current, targetSpin, 9.5, 3.6, dt)
    smoothExpansion.current = dampValue(smoothExpansion.current, targetExpansion, 12, 5, dt)
    smoothPoint.current = dampValue(smoothPoint.current, targetPoint, 13, 5.4, dt)
    smoothCore.current = dampValue(smoothCore.current, targetCore, 9, 3.8, dt)
    smoothExplosion.current = dampValue(smoothExplosion.current, targetExplosion, 16, 7, dt)
    smoothAngleX.current = dampValue(smoothAngleX.current, targetAngleX, 7, 3.5, dt)
    smoothAngleY.current = dampValue(smoothAngleY.current, targetAngleY, 7, 3.5, dt)

    const activeUniforms = materialRef.current?.uniforms
    if (!activeUniforms) return
    activeUniforms.uTime.value = time
    activeUniforms.uPixelRatio.value = Math.min(state.gl.getPixelRatio(), 1.25)
    activeUniforms.uAngleXW.value = HYPERCUBE_ROTATION.initialXW +
      time * (HYPERCUBE_ROTATION.idleXW + smoothSpin.current * 0.34) + smoothAngleX.current
    activeUniforms.uAngleYW.value = HYPERCUBE_ROTATION.initialYW +
      time * (HYPERCUBE_ROTATION.idleYW + smoothSpin.current * 0.26) + smoothAngleY.current
    activeUniforms.uWScale.value = smoothWScale.current
    activeUniforms.uExpansionStrength.value = smoothExpansion.current
    activeUniforms.uExpansionAge.value = expansionAge
    activeUniforms.uSelectedVertex.value = selectedVertex.current
    activeUniforms.uPointStrength.value = smoothPoint.current
    activeUniforms.uPointAge.value = pointAge
    activeUniforms.uCoreStrength.value = smoothCore.current
    activeUniforms.uExplosionStrength.value = smoothExplosion.current
    activeUniforms.uExplosionAge.value = explosionAge
  })

  return (
    <group ref={groupRef} position={[0, 0.2, 0]} rotation={[0.06, 0, 0.025]}>
      <points frustumCulled={false} renderOrder={1}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[geometry.initialProjection, 3]} />
          <bufferAttribute attach="attributes-aPosition4d" args={[geometry.coordinates4d, 4]} />
          <bufferAttribute attach="attributes-aRole" args={[geometry.roles, 1]} />
          <bufferAttribute attach="attributes-aAxis" args={[geometry.axes, 1]} />
          <bufferAttribute attach="attributes-aSeed" args={[geometry.seeds, 1]} />
          <bufferAttribute attach="attributes-aSize" args={[geometry.sizes, 1]} />
          <bufferAttribute attach="attributes-aVertexA" args={[geometry.vertexA, 1]} />
          <bufferAttribute attach="attributes-aVertexB" args={[geometry.vertexB, 1]} />
          <bufferAttribute attach="attributes-aEdgeProgress" args={[geometry.edgeProgress, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          vertexShader={hypercubeVert}
          fragmentShader={hypercubeFrag}
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
