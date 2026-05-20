import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import particleVert from '../shaders/particle.vert'
import particleFrag from '../shaders/particle.frag'
import { useAppStore } from '../store/appStore'
import type { GestureType } from '../store/appStore'

const PARTICLE_COUNT = 20000

const NEON_PALETTE = [
  new THREE.Color('#00ffff'),
  new THREE.Color('#ff44ff'),
  new THREE.Color('#8844ff'),
  new THREE.Color('#4488ff'),
  new THREE.Color('#00ff88'),
  new THREE.Color('#ffaa44'),
  new THREE.Color('#ff4488'),
  new THREE.Color('#44ddff'),
]

function generateGalaxyPositions(count: number): Float32Array {
  const positions = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const r = Math.random()

    let radius: number
    let ySpread: number

    if (r < 0.65) {
      radius = 8 + Math.random() * 8
      ySpread = (Math.random() - 0.5) * 3
    } else if (r < 0.85) {
      radius = 2 + Math.random() * 6
      ySpread = (Math.random() - 0.5) * 1.5
    } else if (r < 0.95) {
      const angle = Math.random() * Math.PI * 2
      const armRadius = 5 + Math.random() * 10
      const spiralAngle = angle + armRadius * 0.4
      radius = armRadius
      const twistX = Math.cos(spiralAngle) * armRadius
      const twistZ = Math.sin(spiralAngle) * armRadius
      positions[i * 3] = twistX
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.8
      positions[i * 3 + 2] = twistZ
      continue
    } else {
      radius = 14 + Math.random() * 10
      ySpread = (Math.random() - 0.5) * 6
    }

    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.4 + ySpread
    positions[i * 3 + 2] = radius * Math.cos(phi)
  }

  return positions
}

function generateColors(count: number): Float32Array {
  const colors = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const paletteIndex = Math.floor(Math.random() * NEON_PALETTE.length)
    const color = NEON_PALETTE[paletteIndex].clone()

    color.r += (Math.random() - 0.5) * 0.1
    color.g += (Math.random() - 0.5) * 0.1
    color.b += (Math.random() - 0.5) * 0.1

    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  return colors
}

function generateSizes(count: number): Float32Array {
  const sizes = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const base = Math.pow(Math.random(), 2.5)
    sizes[i] = 0.3 + base * 3.5
  }

  return sizes
}

function gestureToForceType(gesture: GestureType): number {
  switch (gesture) {
    case 'fist':
      return 1.0
    case 'open_palm':
      return 2.0
    case 'point':
      return 3.0
    default:
      return 0.0
  }
}

export function ParticleUniverse() {
  const meshRef = useRef<THREE.Points>(null)
  const { gl } = useThree()

  // Refs for smooth lerp (avoid re-renders from store subscriptions)
  const smoothForceRef = useRef(0)
  const prevGestureRef = useRef<GestureType>('none')
  const gestureStabilityRef = useRef(0) // frames current gesture has been held
  const activeGestureRef = useRef<GestureType>('none')

  const { positions, colors, sizes } = useMemo(
    () => ({
      positions: generateGalaxyPositions(PARTICLE_COUNT),
      colors: generateColors(PARTICLE_COUNT),
      sizes: generateSizes(PARTICLE_COUNT),
    }),
    []
  )

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: gl.getPixelRatio() },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uParticleCount: { value: PARTICLE_COUNT },
      uHandPos: { value: new THREE.Vector3(0, 0, 0) },
      uForceType: { value: 0.0 },
      uForceStrength: { value: 0.0 },
      uFingertipPos: { value: new THREE.Vector3(0, 0, 0) },
    }),
    [gl]
  )

  useFrame((state) => {
    const store = useAppStore.getState()

    uniforms.uTime.value = state.clock.elapsedTime

    uniforms.uMouse.value.lerp(
      new THREE.Vector2(store.mouse.x, store.mouse.y),
      0.05
    )

    // Hand + fingertip position with smooth lerp
    uniforms.uHandPos.value.lerp(
      new THREE.Vector3(store.handPosition.x, store.handPosition.y, store.handPosition.z),
      0.15
    )
    uniforms.uFingertipPos.value.lerp(
      new THREE.Vector3(store.fingertipPosition.x, store.fingertipPosition.y, store.fingertipPosition.z),
      0.15
    )

    // ── Gesture stability filter ──────────────────────────
    const rawGesture = store.handDetected ? store.gestureType : 'none'

    if (rawGesture === prevGestureRef.current && rawGesture !== 'none') {
      gestureStabilityRef.current++
    } else if (rawGesture === 'none' && prevGestureRef.current === 'none') {
      // Hand detected but no specific gesture — accumulate passive frames
      if (store.handDetected) {
        gestureStabilityRef.current++
      } else {
        gestureStabilityRef.current = 0
      }
    } else {
      gestureStabilityRef.current = 0
    }
    prevGestureRef.current = rawGesture

    // Activate specific gesture after 4 stable frames (~130ms)
    if (gestureStabilityRef.current >= 4 && rawGesture !== 'none') {
      activeGestureRef.current = rawGesture
    } else if (rawGesture === 'none' && gestureStabilityRef.current >= 12) {
      // Fall back to passive after ~400ms of no specific gesture
      activeGestureRef.current = 'none'
    }

    // ── Force type & strength ─────────────────────────────
    if (activeGestureRef.current !== 'none') {
      // Specific gesture active → full force
      uniforms.uForceType.value = gestureToForceType(activeGestureRef.current)
      const targetStrength = 1.0
      smoothForceRef.current += (targetStrength - smoothForceRef.current) * 0.06
    } else if (store.handDetected) {
      // Hand present, no specific gesture → subtle passive attraction
      uniforms.uForceType.value = 1.0 // attract
      const targetStrength = 0.25 // subtle
      smoothForceRef.current += (targetStrength - smoothForceRef.current) * 0.03
    } else {
      // No hand → decay force
      smoothForceRef.current += (0.0 - smoothForceRef.current) * 0.04
    }

    uniforms.uForceStrength.value = smoothForceRef.current
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aColor"
          count={PARTICLE_COUNT}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={PARTICLE_COUNT}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
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
