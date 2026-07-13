import { useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore, type GestureType, type VoidCorePhase } from '../../store/appStore'
import {
  createSceneInteractionFrame,
  resolveSceneInteractionFrame,
} from '../../scenes/sceneInteraction'
import { generateSaturnGeometry } from './generateSaturnGeometry'
import {
  SATURN_COUNTS,
  SATURN_GESTURE,
  SATURN_MOTION,
  SATURN_PLANET,
  SATURN_POSE,
  type SaturnGeometryData,
} from './saturnTypes'
import saturnVert from '../../shaders/saturn.vert'
import saturnFrag from '../../shaders/saturn.frag'
import energyRingVert from '../../shaders/saturnEnergyRing.vert'
import energyRingFrag from '../../shaders/saturnEnergyRing.frag'
import planetVert from '../../shaders/saturnPlanet.vert'
import planetFrag from '../../shaders/saturnPlanet.frag'

const ENERGY_RING_LINES = [
  { radius: 1.86, tube: 0.008, opacity: 0.18, speed: 0.18, color: '#38c8ff', arc: Math.PI * 1.38, phase: 0.45 },
  { radius: 2.5, tube: 0.009, opacity: 0.21, speed: 0.25, color: '#72dfff', arc: Math.PI * 1.62, phase: 1.1 },
  { radius: 3.42, tube: 0.01, opacity: 0.24, speed: -0.16, color: '#ffe5a3', arc: Math.PI * 1.54, phase: 1.65 },
  { radius: 4.35, tube: 0.008, opacity: 0.18, speed: 0.13, color: '#ffb855', arc: Math.PI * 1.3, phase: 2.5 },
] as const

function sliceGeometry(
  geometry: SaturnGeometryData,
  start: number,
  count: number,
): SaturnGeometryData {
  const end = start + count
  return {
    count,
    basePositions: geometry.basePositions.subarray(start * 3, end * 3),
    types: geometry.types.subarray(start, end),
    lanes: geometry.lanes.subarray(start, end),
    seeds: geometry.seeds.subarray(start, end),
    sizes: geometry.sizes.subarray(start, end),
    brightness: geometry.brightness.subarray(start, end),
    angularSpeeds: geometry.angularSpeeds.subarray(start, end),
  }
}

function SaturnParticleLayer({
  geometry,
  uniforms,
  depthTest,
  renderOrder,
  materialRef,
}: {
  geometry: SaturnGeometryData
  uniforms: Record<string, THREE.IUniform>
  depthTest: boolean
  renderOrder: number
  materialRef: RefObject<THREE.ShaderMaterial | null>
}) {
  return (
    <points frustumCulled={false} renderOrder={renderOrder}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[geometry.basePositions, 3]} />
        <bufferAttribute attach="attributes-aBasePosition" args={[geometry.basePositions, 3]} />
        <bufferAttribute attach="attributes-aType" args={[geometry.types, 1]} />
        <bufferAttribute attach="attributes-aLane" args={[geometry.lanes, 1]} />
        <bufferAttribute attach="attributes-aSeed" args={[geometry.seeds, 1]} />
        <bufferAttribute attach="attributes-aSize" args={[geometry.sizes, 1]} />
        <bufferAttribute attach="attributes-aBrightness" args={[geometry.brightness, 1]} />
        <bufferAttribute attach="attributes-aAngularSpeed" args={[geometry.angularSpeeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={saturnVert}
        fragmentShader={saturnFrag}
        uniforms={uniforms}
        transparent
        depthTest={depthTest}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}

export function SaturnSystem() {
  const groupRef = useRef<THREE.Group>(null)
  const occluderRef = useRef<THREE.Mesh>(null)
  const planetShellRef = useRef<THREE.Mesh>(null)
  const energyLineRefs = useRef<Array<THREE.Mesh | null>>([])
  const energyMaterialRefs = useRef<Array<THREE.ShaderMaterial | null>>([])
  const planetMaterialRef = useRef<THREE.ShaderMaterial>(null)
  const ringMaterialRef = useRef<THREE.ShaderMaterial>(null)
  const shellMaterialRef = useRef<THREE.ShaderMaterial>(null)
  const pointFxRef = useRef<THREE.Group>(null)
  const pointCoreMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const pointHaloMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const pointInnerRingRef = useRef<THREE.Mesh>(null)
  const pointOuterRingRef = useRef<THREE.Mesh>(null)
  const pointInnerRingMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const pointOuterRingMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const pointBeamRef = useRef<THREE.LineSegments>(null)
  const pointBeamMaterialRef = useRef<THREE.LineBasicMaterial>(null)

  const smoothRingScale = useRef(1)
  const smoothSpinBoost = useRef(0)
  const smoothWave = useRef(0)
  const smoothPoint = useRef(0)
  const smoothBreath = useRef(0.5)
  const smoothCoreBoost = useRef(0)
  const smoothYaw = useRef(0)
  const smoothVortex = useRef(0)
  const smoothBlast = useRef(0)
  const waveOrigin = useRef(0)
  const waveStartedAt = useRef(-100)
  const releaseStartedAt = useRef(-100)
  const releaseStrength = useRef(0)
  const lastFistStrength = useRef(0)
  const previousGesture = useRef<GestureType>('none')
  const previousVoidPhase = useRef<VoidCorePhase>('idle')
  const interactionFrame = useRef(createSceneInteractionFrame())
  const pointPos = useRef(new THREE.Vector3())
  const handLocal = useRef(new THREE.Vector3())
  const blastOrigin = useRef(new THREE.Vector3())
  const beamTarget = useRef(new THREE.Vector3())

  const geometry = useMemo(() => generateSaturnGeometry(SATURN_COUNTS.total), [])
  const planetGeometry = useMemo(
    () => sliceGeometry(geometry, 0, SATURN_COUNTS.planet),
    [geometry],
  )
  const ringGeometry = useMemo(
    () => sliceGeometry(geometry, SATURN_COUNTS.planet, SATURN_COUNTS.total - SATURN_COUNTS.planet),
    [geometry],
  )
  const beamPositions = useMemo(() => new Float32Array(6), [])

  const particleUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.25) },
      uBreath: { value: 0.5 },
      uRingScale: { value: 1 },
      uSpinBoost: { value: 0 },
      uWave: { value: 0 },
      uWaveOrigin: { value: 0 },
      uWaveAge: { value: 0 },
      uPointPos: { value: new THREE.Vector3() },
      uPointStrength: { value: 0 },
      uPointRadius: { value: SATURN_GESTURE.pointRadius },
      uPointMaxDisplace: { value: SATURN_GESTURE.pointMaxDisplace },
      uCoreBoost: { value: 0 },
      uReleaseAge: { value: 100 },
      uReleaseStrength: { value: 0 },
      uVortexStrength: { value: 0 },
      uVortexCenter: { value: new THREE.Vector3() },
      uBlastStrength: { value: 0 },
      uBlastOrigin: { value: new THREE.Vector3() },
    }),
    [],
  )

  const shellUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBreath: { value: 0.5 },
      uCoreBoost: { value: 0 },
      uReleasePulse: { value: 0 },
    }),
    [],
  )

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const dt = Math.min(delta, 0.05)
    const store = useAppStore.getState()
    const { gestureType, forceStrength, handDetected, fingertipPosition, handPosition } = store
    const interaction = resolveSceneInteractionFrame(store, interactionFrame.current)
    const activeGesture: GestureType =
      handDetected && gestureType !== 'none' && forceStrength > 0.05 ? gestureType : 'none'
    const gestureStrength =
      activeGesture === 'none' ? 0 : THREE.MathUtils.smoothstep(forceStrength, 0.05, 0.92)

    if (activeGesture === 'open_palm' && previousGesture.current !== 'open_palm') {
      waveStartedAt.current = t
    }
    if (interaction.voidPhase === 'exploding' && previousVoidPhase.current !== 'exploding') {
      releaseStartedAt.current = t
      releaseStrength.current = 1
      blastOrigin.current.set(0, 0, 0)
    }
    if (previousGesture.current === 'fist' && activeGesture !== 'fist') {
      releaseStartedAt.current = t
      releaseStrength.current = Math.max(0.58, lastFistStrength.current)
    }
    if (activeGesture === 'fist') lastFistStrength.current = gestureStrength
    previousGesture.current = activeGesture
    previousVoidPhase.current = interaction.voidPhase

    const releaseAge = Math.max(0, t - releaseStartedAt.current)
    if (releaseAge > SATURN_GESTURE.releaseSeconds) releaseStrength.current = 0
    const releasePulse = releaseStrength.current * Math.exp(-releaseAge * 1.65)
    const waveAge = Math.max(0, t - waveStartedAt.current)
    const breathPhase = 0.5 + 0.5 * Math.sin((t * Math.PI * 2) / SATURN_MOTION.breathPeriod + 0.4)
    smoothBreath.current = THREE.MathUtils.damp(smoothBreath.current, breathPhase, 3.5, dt)

    let targetScale = 1
    let targetSpin = 0
    let targetWave = 0
    let targetPoint = 0
    let targetCore = 0
    let targetVortex = 0
    let targetBlast = 0

    if (activeGesture === 'fist') {
      targetScale = 1 - SATURN_GESTURE.fistTighten * gestureStrength
      targetSpin = SATURN_GESTURE.fistSpinBoost * gestureStrength
      targetCore = gestureStrength
      targetVortex = gestureStrength
    } else if (activeGesture === 'open_palm') {
      targetScale = 1 + Math.min(SATURN_GESTURE.openMaxExpand, SATURN_GESTURE.openExpand * gestureStrength)
      targetWave = gestureStrength
      targetBlast = gestureStrength
      handLocal.current.set(handPosition.x, handPosition.y, handPosition.z)
      groupRef.current?.worldToLocal(handLocal.current)
      waveOrigin.current = Math.atan2(handLocal.current.z, handLocal.current.x)
      blastOrigin.current.copy(handLocal.current)
    } else if (activeGesture === 'point') {
      targetPoint = gestureStrength
      pointPos.current.set(fingertipPosition.x, fingertipPosition.y, fingertipPosition.z)
      groupRef.current?.worldToLocal(pointPos.current)
    }

    const coreEngaged = interaction.voidPhase === 'forming' || interaction.voidPhase === 'active'
    if (coreEngaged) {
      const coreStrength = interaction.voidStrength
      const fallbackFactor = interaction.singleFistFallback ? SATURN_GESTURE.fallbackCoreFactor : 1
      const dualScale = THREE.MathUtils.lerp(
        SATURN_GESTURE.dualCompressedScale,
        SATURN_GESTURE.dualOpenScale,
        interaction.dualSpan,
      )
      const coreScale = interaction.dualActive ? dualScale : SATURN_GESTURE.fallbackCoreScale

      targetScale = THREE.MathUtils.lerp(1, coreScale, coreStrength)
      targetSpin = Math.max(
        targetSpin,
        coreStrength * fallbackFactor * (0.58 + interaction.dualCompression * 0.52),
      )
      targetCore = Math.max(targetCore, coreStrength * fallbackFactor)
      targetVortex = Math.max(
        targetVortex,
        coreStrength * fallbackFactor * (0.72 + interaction.dualCompression * 0.28),
      )
    } else if (interaction.voidPhase === 'exploding') {
      const explosionStrength = Math.pow(interaction.voidStrength, 0.62)
      targetScale = 1 + SATURN_GESTURE.explosionExpand * explosionStrength
      targetSpin = Math.max(targetSpin, explosionStrength * 0.46)
      targetCore = Math.max(targetCore, explosionStrength)
      targetVortex = explosionStrength * 0.16
      targetBlast = Math.max(targetBlast, explosionStrength)
      blastOrigin.current.set(0, 0, 0)
    }

    const recoverRate = 1 / SATURN_GESTURE.recoverSeconds
    const damp = (current: number, target: number, rise: number, fall: number) =>
      THREE.MathUtils.damp(current, target, recoverRate * (target > current ? rise : fall), dt)
    smoothRingScale.current = damp(smoothRingScale.current, targetScale, 7.4, 3.4)
    smoothSpinBoost.current = damp(smoothSpinBoost.current, targetSpin, 8.5, 3.2)
    smoothWave.current = damp(smoothWave.current, targetWave, 8, 3)
    smoothPoint.current = damp(smoothPoint.current, targetPoint, 10, 3.8)
    smoothCoreBoost.current = damp(smoothCoreBoost.current, targetCore, 8.5, 3.4)
    smoothVortex.current = damp(smoothVortex.current, targetVortex, 9.5, 4.2)
    smoothBlast.current = damp(smoothBlast.current, targetBlast, 12, 5)

    const yawPositionX = interaction.dualActive ? interaction.midpoint.x : handPosition.x
    const targetYaw = interaction.handCount > 0
      ? THREE.MathUtils.clamp(yawPositionX / 7, -1, 1) * SATURN_GESTURE.handYaw
      : 0
    smoothYaw.current = THREE.MathUtils.damp(smoothYaw.current, targetYaw, 3.2, dt)
    if (groupRef.current) groupRef.current.rotation.y = smoothYaw.current

    const coreEnergy = Math.min(1.35, smoothCoreBoost.current + releasePulse * 0.42)
    for (const material of [planetMaterialRef.current, ringMaterialRef.current]) {
      if (!material) continue
      const u = material.uniforms
      u.uTime.value = t
      u.uPixelRatio.value = Math.min(state.gl.getPixelRatio(), 1.25)
      u.uBreath.value = smoothBreath.current
      u.uRingScale.value = smoothRingScale.current
      u.uSpinBoost.value = smoothSpinBoost.current
      u.uWave.value = smoothWave.current
      u.uWaveOrigin.value = waveOrigin.current
      u.uWaveAge.value = waveAge
      u.uPointPos.value.copy(pointPos.current)
      u.uPointStrength.value = smoothPoint.current
      u.uCoreBoost.value = coreEnergy
      u.uReleaseAge.value = releaseAge
      u.uReleaseStrength.value = releaseStrength.current
      u.uVortexStrength.value = smoothVortex.current
      u.uBlastStrength.value = smoothBlast.current
      u.uBlastOrigin.value.copy(blastOrigin.current)
    }

    if (shellMaterialRef.current) {
      const u = shellMaterialRef.current.uniforms
      u.uTime.value = t
      u.uBreath.value = smoothBreath.current
      u.uCoreBoost.value = coreEnergy
      u.uReleasePulse.value = releasePulse
    }

    const corePulse = SATURN_PLANET.radius *
      (0.955 + smoothBreath.current * 0.025 + coreEnergy * 0.045 + releasePulse * 0.02)
    if (occluderRef.current) {
      occluderRef.current.scale.set(corePulse, corePulse * SATURN_PLANET.yScale, corePulse)
    }
    if (planetShellRef.current) {
      planetShellRef.current.scale.set(corePulse, corePulse * SATURN_PLANET.yScale, corePulse)
    }

    const pointAngle = Math.atan2(pointPos.current.z, pointPos.current.x)
    energyLineRefs.current.forEach((line, index) => {
      const spec = ENERGY_RING_LINES[index]
      const material = energyMaterialRefs.current[index]
      if (!line || !material || !spec) return
      const layer = index / Math.max(1, ENERGY_RING_LINES.length - 1)
      const gestureScale =
        1 + smoothWave.current * (0.012 + layer * 0.008) + releasePulse * 0.025 -
        smoothVortex.current * (0.018 + layer * 0.012) + smoothBlast.current * 0.022 +
        smoothPoint.current * Math.sin(t * 2.4 + index) * 0.004
      const scale = smoothRingScale.current * gestureScale
      line.scale.setScalar(scale)
      line.rotation.z = spec.phase + t * spec.speed *
        (1 + smoothSpinBoost.current * 0.9 + smoothVortex.current * 1.25)

      const u = material.uniforms
      u.uTime.value = t
      u.uGesture.value = Math.max(smoothSpinBoost.current, smoothBlast.current)
      u.uWave.value = Math.max(smoothWave.current, releasePulse)
      u.uPointStrength.value = smoothPoint.current
      u.uPointAngle.value = pointAngle - line.rotation.z
    })

    const pointVisible = smoothPoint.current > 0.008
    if (pointFxRef.current) {
      pointFxRef.current.visible = pointVisible
      pointFxRef.current.position.copy(pointPos.current)
      const pulse = 0.94 + Math.sin(t * 5.2) * 0.06
      pointFxRef.current.scale.setScalar(pulse * (0.82 + smoothPoint.current * 0.28))
    }
    if (pointInnerRingRef.current) pointInnerRingRef.current.rotation.z = t * 2
    if (pointOuterRingRef.current) pointOuterRingRef.current.rotation.z = -t * 1.5
    if (pointCoreMaterialRef.current) pointCoreMaterialRef.current.opacity = smoothPoint.current * 0.92
    if (pointHaloMaterialRef.current) pointHaloMaterialRef.current.opacity = smoothPoint.current * 0.28
    if (pointInnerRingMaterialRef.current) pointInnerRingMaterialRef.current.opacity = smoothPoint.current * 0.68
    if (pointOuterRingMaterialRef.current) pointOuterRingMaterialRef.current.opacity = smoothPoint.current * 0.42
    if (pointBeamMaterialRef.current) pointBeamMaterialRef.current.opacity = smoothPoint.current * 0.22

    if (pointBeamRef.current) {
      pointBeamRef.current.visible = pointVisible
      beamTarget.current.set(Math.cos(pointAngle) * 3.35, 0, Math.sin(pointAngle) * 3.35)
      beamPositions.set([
        pointPos.current.x, pointPos.current.y, pointPos.current.z,
        beamTarget.current.x, beamTarget.current.y, beamTarget.current.z,
      ])
      const position = pointBeamRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
      position.needsUpdate = true
    }
  })

  return (
    <group
      ref={groupRef}
      position={[0, SATURN_POSE.positionY, 0]}
      rotation={[SATURN_POSE.rotationX, 0, SATURN_POSE.rotationZ]}
    >
      <mesh ref={occluderRef} renderOrder={0}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshBasicMaterial colorWrite={false} depthWrite depthTest side={THREE.FrontSide} />
      </mesh>

      <mesh ref={planetShellRef} renderOrder={1}>
        <sphereGeometry args={[1, 48, 36]} />
        <shaderMaterial
          ref={shellMaterialRef}
          vertexShader={planetVert}
          fragmentShader={planetFrag}
          uniforms={shellUniforms}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={THREE.NormalBlending}
          toneMapped={false}
        />
      </mesh>

      {ENERGY_RING_LINES.map((ring, index) => (
        <mesh
          key={`${ring.radius}-${ring.arc}`}
          ref={(node) => { energyLineRefs.current[index] = node }}
          rotation={[Math.PI / 2, 0, ring.phase]}
          renderOrder={1}
        >
          <torusGeometry args={[ring.radius, ring.tube, 5, 128, ring.arc]} />
          <shaderMaterial
            ref={(node) => { energyMaterialRefs.current[index] = node }}
            vertexShader={energyRingVert}
            fragmentShader={energyRingFrag}
            uniforms={{
              uTime: { value: 0 },
              uColor: { value: new THREE.Color(ring.color) },
              uOpacity: { value: ring.opacity },
              uFlowSpeed: { value: Math.abs(ring.speed) * 10 + 0.8 },
              uArc: { value: ring.arc },
              uPhase: { value: ring.phase },
              uGesture: { value: 0 },
              uWave: { value: 0 },
              uPointAngle: { value: 0 },
              uPointStrength: { value: 0 },
            }}
            transparent
            depthWrite={false}
            depthTest
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}

      <SaturnParticleLayer
        geometry={planetGeometry}
        uniforms={particleUniforms}
        depthTest={false}
        renderOrder={2}
        materialRef={planetMaterialRef}
      />
      <SaturnParticleLayer
        geometry={ringGeometry}
        uniforms={particleUniforms}
        depthTest
        renderOrder={3}
        materialRef={ringMaterialRef}
      />

      <group ref={pointFxRef} visible={false} renderOrder={4}>
        <mesh>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshBasicMaterial ref={pointCoreMaterialRef} color="#fff5e6" transparent depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.24, 12, 12]} />
          <meshBasicMaterial ref={pointHaloMaterialRef} color="#ffe07d" transparent depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        <mesh ref={pointInnerRingRef} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.35, 0.012, 5, 32]} />
          <meshBasicMaterial ref={pointInnerRingMaterialRef} color="#ffcc66" transparent depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        <mesh ref={pointOuterRingRef} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.5, 0.008, 4, 32]} />
          <meshBasicMaterial ref={pointOuterRingMaterialRef} color="#ffa84d" transparent depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      </group>

      <lineSegments ref={pointBeamRef} visible={false} renderOrder={4}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[beamPositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial ref={pointBeamMaterialRef} color="#ffe07d" transparent depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </lineSegments>
    </group>
  )
}
