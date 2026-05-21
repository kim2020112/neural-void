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

  const smoothForceRef = useRef(0)
  const smoothVoidStrengthRef = useRef(0)

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
      uVoidCenter: { value: new THREE.Vector3(0, 0, 0) },
      uVoidPhase: { value: 0.0 },
      uVoidStrength: { value: 0.0 },
      uVoidExplosionTime: { value: -1.0 },
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

    uniforms.uHandPos.value.lerp(
      new THREE.Vector3(store.handPosition.x, store.handPosition.y, store.handPosition.z),
      0.15
    )
    uniforms.uFingertipPos.value.lerp(
      new THREE.Vector3(store.fingertipPosition.x, store.fingertipPosition.y, store.fingertipPosition.z),
      0.15
    )

    // ── Void Core lifecycle ──────────────────────────────────
    const vcp = store.voidCorePhase
    const phaseMap: Record<string, number> = { idle: 0, forming: 1, active: 2, exploding: 3 }
    uniforms.uVoidPhase.value = phaseMap[vcp] ?? 0

    // Lerp void center toward store value
    uniforms.uVoidCenter.value.lerp(
      new THREE.Vector3(store.voidCenter.x, store.voidCenter.y, store.voidCenter.z),
      0.1
    )

    // Smooth void core strength based on phase
    if (vcp === 'forming' || vcp === 'active') {
      smoothVoidStrengthRef.current += (1.0 - smoothVoidStrengthRef.current) * 0.06
    } else if (vcp === 'exploding') {
      smoothVoidStrengthRef.current += (0.0 - smoothVoidStrengthRef.current) * 0.015
    } else {
      smoothVoidStrengthRef.current += (0.0 - smoothVoidStrengthRef.current) * 0.04
    }
    uniforms.uVoidStrength.value = smoothVoidStrengthRef.current

    // Capture explosion start time on the first frame of explosion
    if (vcp === 'exploding' && uniforms.uVoidExplosionTime.value < 0.0) {
      uniforms.uVoidExplosionTime.value = state.clock.elapsedTime
    }
    // Reset sentinel when returning to idle
    if (vcp === 'idle') {
      uniforms.uVoidExplosionTime.value = -1.0
    }

    // ── Gesture force (overridden by void core) ─────────────
    if (vcp !== 'idle') {
      // Void core active — override normal gesture force
      uniforms.uForceType.value = 4.0
      smoothForceRef.current += (0.0 - smoothForceRef.current) * 0.05
    } else {
      const gestureType = store.handDetected ? store.gestureType : 'none'
      uniforms.uForceType.value = gestureToForceType(gestureType)

      if (gestureType !== 'none') {
        smoothForceRef.current += (1.0 - smoothForceRef.current) * 0.08
      } else if (store.handDetected) {
        smoothForceRef.current += (0.25 - smoothForceRef.current) * 0.04
      } else {
        smoothForceRef.current += (0.0 - smoothForceRef.current) * 0.05
      }
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
