import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { computeCinematicEnvelope } from '../core/cinematic'
import { useAppStore } from '../store/appStore'
import type { ParticleShape } from './shapes/types'
import { DEFAULT_PARTICLE_SHAPE } from './shapes/catalog'
import {
  PARTICLE_COUNT,
  SHAPE_MODE,
  SHAPE_TRANSITION_DURATION,
  resolveParticleEngineFrame,
} from './engine'
import { SHAPE_GENERATORS } from './shapes/registry'
import particleVert from '../shaders/particle.vert'
import particleFrag from '../shaders/particle.frag'

function generateSeeds(count: number) {
  const colors = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    colors[i * 3] = 0.5 + (Math.random() - 0.5) * 0.2
    colors[i * 3 + 1] = 0.5 + (Math.random() - 0.5) * 0.2
    colors[i * 3 + 2] = 0.5 + (Math.random() - 0.5) * 0.2
  }

  return colors
}

function generateSizes(count: number) {
  const sizes = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const base = Math.pow(Math.random(), 2.8)
    sizes[i] = 0.16 + base * 1.55
  }

  return sizes
}

function generateRandoms(count: number) {
  const randoms = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    randoms[i] = Math.random()
  }

  return randoms
}

function getShapeProfile(shape: ParticleShape) {
  switch (shape) {
    case 'saturn_ring':
      return { rotX: 1.08, rotZ: -0.06, yLift: 0.02, scale: 1.34 }
    case 'dna_helix':
      return { rotX: 0.18, rotZ: 0.26, yLift: 0.04, scale: 0.98 }
    case 'golden_spiral':
      return { rotX: 0.24, rotZ: -0.1, yLift: -0.02, scale: 1.04 }
    case 'hypercube':
      return { rotX: 0.18, rotZ: 0.34, yLift: 0.02, scale: 0.92 }
    case 'galaxy':
      return { rotX: 0.46, rotZ: -0.18, yLift: -0.06, scale: 1.02 }
    case 'singularity':
      return { rotX: 0.68, rotZ: 0.06, yLift: -0.02, scale: 0.86 }
    case 'knot_torus':
      return { rotX: 0.4, rotZ: 0.28, yLift: 0, scale: 0.96 }
    case 'quantum_sphere':
    default:
      return { rotX: 0.2, rotZ: 0.08, yLift: 0, scale: 1 }
  }
}

export function ParticleUniverse() {
  const meshRef = useRef<THREE.Points>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const mouseTargetRef = useRef(new THREE.Vector2())
  const handTargetRef = useRef(new THREE.Vector3())
  const hand2TargetRef = useRef(new THREE.Vector3())
  const fingertipTargetRef = useRef(new THREE.Vector3())
  const voidCenterTargetRef = useRef(new THREE.Vector3())
  const motionSeedRef = useRef(Math.random() * 100)
  const smoothForceRef = useRef(0)
  const smoothVoidStrengthRef = useRef(0)
  const storeSyncFrameRef = useRef(0)
  const activeShapeRef = useRef<ParticleShape>(DEFAULT_PARTICLE_SHAPE)
  const transitionRef = useRef({
    active: false,
    progress: 0,
    targetShape: DEFAULT_PARTICLE_SHAPE as ParticleShape,
  })
  const diagRef = useRef(0)
  const { gl } = useThree()

  const { positions, targetPositions, colors, sizes, randoms } = useMemo(() => {
    const initialPositions = SHAPE_GENERATORS[DEFAULT_PARTICLE_SHAPE](PARTICLE_COUNT)

    return {
      positions: initialPositions,
      targetPositions: new Float32Array(initialPositions),
      colors: generateSeeds(PARTICLE_COUNT),
      sizes: generateSizes(PARTICLE_COUNT),
      randoms: generateRandoms(PARTICLE_COUNT),
    }
  }, [])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: gl.getPixelRatio() },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uParticleCount: { value: PARTICLE_COUNT },
      uHandPos: { value: new THREE.Vector3(0, 0, 0) },
      uHand2Pos: { value: new THREE.Vector3(0, 0, 0) },
      uForceType: { value: 0 },
      uForceStrength: { value: 0 },
      uFingertipPos: { value: new THREE.Vector3(0, 0, 0) },
      uVoidCenter: { value: new THREE.Vector3(0, 0, 0) },
      uVoidPhase: { value: 0 },
      uVoidStrength: { value: 0 },
      uVoidExplosionTime: { value: -1 },
      uShapeTransition: { value: 0 },
      uShapeMode: { value: SHAPE_MODE[DEFAULT_PARTICLE_SHAPE] },
      uCinematicPulse: { value: 0.6 },
      uCinematicEnergy: { value: 0.2 },
      uInteractionMode: { value: 0 },
      uInteractionPresence: { value: 0 },
      uDuality: { value: 0 },
      uDepthBias: { value: 0 },
      uFlowWeight: { value: 0.3 },
      uMorphTension: { value: 0 },
      uGalleryMode: { value: 1 },
    }),
    [gl],
  )

  const morphTo = (targetShape: ParticleShape) => {
    const geometry = meshRef.current?.geometry
    if (!geometry) return

    const targetAttribute = geometry.attributes.aTargetPosition as THREE.BufferAttribute | undefined
    if (!targetAttribute) return

    const nextTarget = SHAPE_GENERATORS[targetShape](PARTICLE_COUNT)
    ;(targetAttribute.array as Float32Array).set(nextTarget)
    targetAttribute.needsUpdate = true

    transitionRef.current.active = true
    transitionRef.current.progress = 0
    transitionRef.current.targetShape = targetShape
  }

  useEffect(() => {
    const unsubscribe = useAppStore.subscribe((state) => {
      const shape = state.particleShape
      if (shape !== activeShapeRef.current && shape in SHAPE_GENERATORS) {
        morphTo(shape)
      }
    })

    return unsubscribe
  }, [])

  useFrame((state, delta) => {
    if (!meshRef.current || !materialRef.current) return

    const store = useAppStore.getState()
    const activeUniforms = materialRef.current.uniforms
    const transition = transitionRef.current
    const phaseMap: Record<string, number> = { idle: 0, forming: 1, active: 2, exploding: 3 }

    if (transition.active) {
      transition.progress = Math.min(transition.progress + delta / SHAPE_TRANSITION_DURATION, 1)
      activeUniforms.uShapeTransition.value = transition.progress
      activeUniforms.uShapeMode.value = SHAPE_MODE[transition.targetShape]

      if (transition.progress >= 1) {
        const geometry = meshRef.current.geometry
        const positionAttribute = geometry.attributes.position as THREE.BufferAttribute
        const targetAttribute = geometry.attributes.aTargetPosition as THREE.BufferAttribute
        ;(positionAttribute.array as Float32Array).set(targetAttribute.array as Float32Array)
        positionAttribute.needsUpdate = true

        activeShapeRef.current = transition.targetShape
        transition.active = false
        transition.progress = 0
        activeUniforms.uShapeTransition.value = 0
        activeUniforms.uShapeMode.value = SHAPE_MODE[activeShapeRef.current]
      }
    } else {
      activeUniforms.uShapeTransition.value = 0
      activeUniforms.uShapeMode.value = SHAPE_MODE[activeShapeRef.current]
    }

    activeUniforms.uTime.value = state.clock.elapsedTime

    mouseTargetRef.current.set(store.mouse.x, store.mouse.y)
    activeUniforms.uMouse.value.lerp(mouseTargetRef.current, 0.14)

    handTargetRef.current.set(store.handPosition.x, store.handPosition.y, store.handPosition.z)
    activeUniforms.uHandPos.value.lerp(handTargetRef.current, 0.28)

    hand2TargetRef.current.set(store.hand2Position.x, store.hand2Position.y, store.hand2Position.z)
    activeUniforms.uHand2Pos.value.lerp(hand2TargetRef.current, 0.24)

    fingertipTargetRef.current.set(
      store.fingertipPosition.x,
      store.fingertipPosition.y,
      store.fingertipPosition.z,
    )
    activeUniforms.uFingertipPos.value.lerp(fingertipTargetRef.current, 0.34)

    voidCenterTargetRef.current.set(store.voidCenter.x, store.voidCenter.y, store.voidCenter.z)
    activeUniforms.uVoidCenter.value.lerp(voidCenterTargetRef.current, 0.22)

    if (store.voidCorePhase === 'exploding' && activeUniforms.uVoidExplosionTime.value < 0) {
      activeUniforms.uVoidExplosionTime.value = state.clock.elapsedTime
    }
    if (store.voidCorePhase === 'idle') {
      activeUniforms.uVoidExplosionTime.value = -1
    }

    const explosionAge =
      store.voidCorePhase === 'exploding' && activeUniforms.uVoidExplosionTime.value > 0
        ? state.clock.elapsedTime - activeUniforms.uVoidExplosionTime.value
        : 0
    const effectivePhase = explosionAge > 5 ? 'idle' : store.voidCorePhase

    const engineFrame = resolveParticleEngineFrame({
      gestureType: store.gestureType,
      gestureScore: store.gestureScore,
      handDetected: store.handDetected,
      hand2Detected: store.hand2Detected,
      voidCorePhase: effectivePhase,
      interactionState: store.interactionState,
      transition: transition.active ? transition.progress : 0,
    })

    const targetVoidStrength = effectivePhase === 'idle' ? 0 : store.voidCoreStrength
    const voidEaseIn =
      effectivePhase === 'forming' ? 0.05 : effectivePhase === 'active' ? 0.08 : effectivePhase === 'exploding' ? 0.18 : 0.03
    const voidEaseOut = effectivePhase === 'exploding' ? 0.045 : 0.02

    smoothVoidStrengthRef.current +=
      (targetVoidStrength - smoothVoidStrengthRef.current) *
      (targetVoidStrength > smoothVoidStrengthRef.current ? voidEaseIn : voidEaseOut)
    smoothForceRef.current += (engineFrame.forceStrength - smoothForceRef.current) * 0.08

    activeUniforms.uVoidPhase.value = phaseMap[effectivePhase] ?? 0
    activeUniforms.uVoidStrength.value = smoothVoidStrengthRef.current
    activeUniforms.uForceType.value = engineFrame.forceType
    activeUniforms.uForceStrength.value = smoothForceRef.current
    activeUniforms.uInteractionMode.value = engineFrame.interactionMode
    activeUniforms.uInteractionPresence.value = engineFrame.interactionPresence
    activeUniforms.uDuality.value = engineFrame.duality
    activeUniforms.uDepthBias.value = engineFrame.depthBias
    activeUniforms.uFlowWeight.value = engineFrame.flowWeight
    activeUniforms.uMorphTension.value = engineFrame.morphTension
    activeUniforms.uGalleryMode.value = store.galleryMode ? 1 : 0

    const envelope = computeCinematicEnvelope({
      time: state.clock.elapsedTime,
      force: Math.max(smoothForceRef.current, store.forceStrength),
      voidStrength: smoothVoidStrengthRef.current,
      transition: transition.active ? transition.progress : 0,
      handDetected: store.handDetected || store.hand2Detected,
      phase: effectivePhase as 'idle' | 'forming' | 'active' | 'exploding',
    })

    const formingCompression =
      effectivePhase === 'forming' ? Math.pow(smoothVoidStrengthRef.current, 1.45) : 0
    const activeCore = effectivePhase === 'active' ? Math.pow(smoothVoidStrengthRef.current, 0.82) : 0
    const explosionPulse =
      effectivePhase === 'exploding' ? Math.pow(smoothVoidStrengthRef.current, 0.62) : 0
    const settleTail = effectivePhase === 'exploding' ? (1 - explosionPulse) * envelope.settle : envelope.settle

    activeUniforms.uCinematicPulse.value =
      envelope.pulse +
      store.interactionState.orbit * 0.08 +
      formingCompression * 0.06 +
      explosionPulse * 0.16
    activeUniforms.uCinematicEnergy.value =
      envelope.energy +
      engineFrame.morphTension * 0.18 +
      store.interactionState.depth * 0.08 +
      envelope.shock * 0.12 +
      activeCore * 0.08 +
      explosionPulse * 0.12

    const currentProfile = getShapeProfile(activeShapeRef.current)
    const targetProfile = getShapeProfile(transition.active ? transition.targetShape : activeShapeRef.current)
    const profileBlend = transition.active ? transition.progress : 0
    const galleryMix = store.galleryMode ? 1 : 0
    const galleryMotionScale = THREE.MathUtils.lerp(1.32, 0.24, galleryMix)
    const galleryDriftScale = THREE.MathUtils.lerp(1.24, 0.3, galleryMix)
    const shapeProfile = {
      rotX: THREE.MathUtils.lerp(currentProfile.rotX, targetProfile.rotX, profileBlend),
      rotZ: THREE.MathUtils.lerp(currentProfile.rotZ, targetProfile.rotZ, profileBlend),
      yLift: THREE.MathUtils.lerp(currentProfile.yLift, targetProfile.yLift, profileBlend),
      scale: THREE.MathUtils.lerp(currentProfile.scale, targetProfile.scale, profileBlend),
    }

    const universeLift = Math.sin(state.clock.elapsedTime * 0.18 + motionSeedRef.current) * 0.05 * galleryMotionScale
    meshRef.current.rotation.y =
      state.clock.elapsedTime *
        (0.0046 +
          store.interactionState.orbit * 0.006 * galleryDriftScale +
          explosionPulse * 0.005 +
          activeCore * 0.002 -
          formingCompression * 0.0016) +
      envelope.drift * 0.026 * galleryDriftScale
    meshRef.current.rotation.x =
      shapeProfile.rotX +
      Math.sin(state.clock.elapsedTime * 0.05 + motionSeedRef.current) * 0.012 * galleryMotionScale +
      store.interactionState.depth * 0.015 * galleryDriftScale +
      explosionPulse * 0.022 -
      formingCompression * 0.012
    meshRef.current.rotation.z =
      shapeProfile.rotZ +
      Math.sin(state.clock.elapsedTime * 0.03 + motionSeedRef.current * 0.7) * 0.006 * galleryMotionScale +
      store.interactionState.orbit * 0.008 * galleryDriftScale
    meshRef.current.position.y =
      shapeProfile.yLift +
      universeLift +
      envelope.breath * 0.02 * galleryMotionScale +
      activeCore * 0.018 +
      settleTail * 0.008 -
      formingCompression * 0.06 -
      explosionPulse * 0.04 +
      envelope.shock * 0.008 * galleryDriftScale +
      store.interactionState.depth * 0.018 * galleryDriftScale
    meshRef.current.scale.setScalar(
      Math.max(
        0.84,
        shapeProfile.scale *
          (1 +
            envelope.breath * 0.008 * galleryMotionScale +
            envelope.energy * 0.015 * galleryMotionScale +
            engineFrame.morphTension * 0.018 * galleryMotionScale +
            envelope.shock * 0.02 * galleryDriftScale +
            activeCore * 0.018 +
            explosionPulse * 0.08 +
            settleTail * 0.012 -
            formingCompression * 0.04),
      ),
    )

    storeSyncFrameRef.current = (storeSyncFrameRef.current + 1) % 2
    if (storeSyncFrameRef.current === 0) {
      if (Math.abs(store.forceStrength - smoothForceRef.current) > 0.015) {
        store.setForceStrength(smoothForceRef.current)
      }

      store.setCinematicState({
        ...envelope,
        transition: transition.active ? transition.progress : 0,
      })
    }

    diagRef.current += 1
    if (diagRef.current % 90 === 1) {
      console.log(
        `[ParticleUniverse] frame=${diagRef.current} ` +
          `phase=${store.voidCorePhase} effective=${effectivePhase} ` +
          `mode=${store.interactionState.mode} shape=${activeShapeRef.current} ` +
          `target=${transition.targetShape} trans=${activeUniforms.uShapeTransition.value.toFixed(2)} ` +
          `force=${activeUniforms.uForceStrength.value.toFixed(3)} void=${activeUniforms.uVoidStrength.value.toFixed(3)}`,
      )
    }
  })

  return (
    <points ref={meshRef} renderOrder={1}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aTargetPosition" args={[targetPositions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aRandom" args={[randoms, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={particleVert}
        fragmentShader={particleFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}