import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import particleVert from '../shaders/particle.vert'
import particleFrag from '../shaders/particle.frag'
import { useAppStore } from '../store/appStore'
import type { GestureType, ParticleShape } from '../store/appStore'

const PARTICLE_COUNT = 20000
const MORPH_SPEED = 0.022

// ─── Geometry Generators ──────────────────────────────────────

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

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
      positions[i * 3] = Math.cos(spiralAngle) * armRadius
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.8
      positions[i * 3 + 2] = Math.sin(spiralAngle) * armRadius
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

// Saturn Ring: extremely flat concentric rings in XZ with inner void + outer fade
function generateSaturnRingPositions(count: number): Float32Array {
  const positions = new Float32Array(count * 3)
  const innerEdge = 2.5
  const mainRing = 7.0
  const outerEdge = 13.0

  for (let i = 0; i < count; i++) {
    const r = Math.random()

    // Radial distribution: dense main ring, inner gap, fading outer
    let radius: number
    if (r < 0.15) {
      // Inner faint ring
      radius = innerEdge + Math.random() * 1.5
    } else if (r < 0.75) {
      // Main dense ring (Gaussian-like distribution around 6.5)
      radius = mainRing + (Math.random() - 0.5) * 3.5
    } else {
      // Outer fading ring
      radius = 9.0 + Math.random() * (outerEdge - 9.0)
    }

    const theta = Math.random() * Math.PI * 2

    // Extremely flat: tiny Y variation
    const y = (Math.random() - 0.5) * 0.4

    // Ring gap (inner void) density modulation
    if (radius < innerEdge + 0.6 && Math.random() < 0.6) {
      // Push particles to either side of the inner void
      const pushed = innerEdge + 0.8 + Math.random() * 0.5
      positions[i * 3] = Math.cos(theta) * pushed
      positions[i * 3 + 1] = y * 0.5
      positions[i * 3 + 2] = Math.sin(theta) * pushed
      continue
    }

    // Subtle radial wave pattern for ring texture
    const wave = Math.sin(radius * 2.5 + theta * 3.0) * 0.15
    const rFinal = radius + wave

    positions[i * 3] = Math.cos(theta) * rFinal
    positions[i * 3 + 1] = y + Math.sin(radius * 2.0) * 0.08
    positions[i * 3 + 2] = Math.sin(theta) * rFinal
  }

  return positions
}

// DNA Double Helix: two interwoven spirals along Y axis
function generateDNAHelixPositions(count: number): Float32Array {
  const positions = new Float32Array(count * 3)
  const helixRadius = 3.5
  const helixHeight = 16.0
  const turns = 5.0

  for (let i = 0; i < count; i++) {
    const strand = i % 2 // 0 or 1 for two strands
    const phaseOffset = strand * Math.PI

    // Uniform t along the helix, with some random jitter
    const t = (i / count) * 2.0 - 1.0 // -1 to 1
    const y = t * helixHeight * 0.5
    const angle = t * Math.PI * 2.0 * turns + phaseOffset

    // Add bridge connections between strands (10% of particles)
    const isBridge = Math.random() < 0.08
    let r: number
    let a: number
    let yPos: number

    if (isBridge) {
      // Bridge particle: linear interpolation between strands
      const bridgeT = Math.random()
      const strand0Angle = t * Math.PI * 2.0 * turns
      const strand1Angle = strand0Angle + Math.PI
      a = strand0Angle + (strand1Angle - strand0Angle) * bridgeT
      r = helixRadius * (0.2 + Math.random() * 0.6)
      yPos = y
    } else {
      // Regular strand particle with slight jitter
      a = angle + (Math.random() - 0.5) * 0.4
      r = helixRadius + (Math.random() - 0.5) * 0.8
      yPos = y + (Math.random() - 0.5) * 0.6
    }

    positions[i * 3] = Math.cos(a) * r
    positions[i * 3 + 1] = yPos
    positions[i * 3 + 2] = Math.sin(a) * r
  }

  return positions
}

// Fibonacci Sphere: golden-angle surface distribution with noise perturbation
function generateFibonacciSpherePositions(count: number): Float32Array {
  const positions = new Float32Array(count * 3)
  const goldenRatio = (1 + Math.sqrt(5)) / 2
  const sphereRadius = 8.0

  for (let i = 0; i < count; i++) {
    // Fibonacci lattice on sphere
    const theta = 2 * Math.PI * i / goldenRatio
    const phi = Math.acos(1 - 2 * (i + 0.5) / count)

    // Multiple shell layers for depth (core, mid, surface)
    const shellRng = Math.random()
    let radiusMult: number
    if (shellRng < 0.3) {
      radiusMult = 0.7 + Math.random() * 0.25 // Inner shell
    } else if (shellRng < 0.75) {
      radiusMult = 0.92 + Math.random() * 0.12 // Main surface
    } else {
      radiusMult = 1.05 + Math.random() * 0.25 // Outer halo
    }

    // Add Perlin-like perturbation to break lattice regularity
    const noiseFreq = 3.0
    const noiseAmp = 0.6
    const nx = Math.sin(phi * noiseFreq) * Math.cos(theta * noiseFreq) * noiseAmp
    const ny = Math.cos(phi * noiseFreq) * noiseAmp * 0.5
    const nz = Math.sin(phi * noiseFreq) * Math.sin(theta * noiseFreq) * noiseAmp

    const r = sphereRadius * radiusMult
    const x = Math.sin(phi) * Math.cos(theta)
    const y = Math.cos(phi)
    const z = Math.sin(phi) * Math.sin(theta)

    positions[i * 3] = x * r + nx
    positions[i * 3 + 1] = y * r + ny
    positions[i * 3 + 2] = z * r + nz
  }

  return positions
}

// ─── Shape → Generator lookup ──────────────────────────────────

const shapeGenerators: Record<ParticleShape, (count: number) => Float32Array> = {
  galaxy: generateGalaxyPositions,
  saturn_ring: generateSaturnRingPositions,
  dna_helix: generateDNAHelixPositions,
  fibonacci_sphere: generateFibonacciSpherePositions,
}

// ─── Subtle per-particle variation seeds (not random neon) ─────

function generateSeeds(count: number): Float32Array {
  const colors = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    // Each channel is a small random offset around 0.5 for subtle tint variation
    colors[i * 3] = 0.5 + (Math.random() - 0.5) * 0.2
    colors[i * 3 + 1] = 0.5 + (Math.random() - 0.5) * 0.2
    colors[i * 3 + 2] = 0.5 + (Math.random() - 0.5) * 0.2
  }

  return colors
}

function generateSizes(count: number): Float32Array {
  const sizes = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const base = Math.pow(Math.random(), 2.5)
    sizes[i] = 0.25 + base * 2.8
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

// ─── Component ─────────────────────────────────────────────────

export function ParticleUniverse() {
  const meshRef = useRef<THREE.Points>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const { gl } = useThree()

  const smoothForceRef = useRef(0)
  const smoothVoidStrengthRef = useRef(0)
  const prevShapeRef = useRef<ParticleShape>('galaxy')

  // Morph state
  const morphRef = useRef({
    from: null as Float32Array | null,
    to: null as Float32Array | null,
    progress: 0.0,
    active: false,
  })

  const { positions, colors, sizes } = useMemo(
    () => ({
      positions: generateGalaxyPositions(PARTICLE_COUNT),
      colors: generateSeeds(PARTICLE_COUNT),
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

  // Shape switching: morph to new geometry
  const morphTo = (targetShape: ParticleShape) => {
    const geo = meshRef.current?.geometry
    if (!geo) return
    const posAttr = geo.attributes.position
    const currentArray = posAttr.array as Float32Array

    morphRef.current.from = new Float32Array(currentArray)
    morphRef.current.to = shapeGenerators[targetShape](PARTICLE_COUNT)
    morphRef.current.progress = 0
    morphRef.current.active = true
  }

  // Watch store for shape changes
  useEffect(() => {
    const unsub = useAppStore.subscribe(
      (state) => state.particleShape,
      (shape) => {
        if (shape !== prevShapeRef.current && shape in shapeGenerators) {
          prevShapeRef.current = shape
          morphTo(shape)
        }
      }
    )
    return unsub
  }, [])

  const diagRef = useRef(0)

  useFrame((state) => {
    if (!materialRef.current) return
    const activeUniforms = materialRef.current.uniforms

    const store = useAppStore.getState()

    // ── Morph animation ────────────────────────────────────
    const morph = morphRef.current
    if (morph.active && morph.from && morph.to && meshRef.current) {
      morph.progress += MORPH_SPEED
      const t = Math.min(easeInOutCubic(morph.progress), 1.0)

      const posAttr = meshRef.current.geometry.attributes.position
      const arr = posAttr.array as Float32Array
      const from = morph.from
      const to = morph.to
      for (let i = 0; i < arr.length; i++) {
        arr[i] = from[i] + (to[i] - from[i]) * t
      }
      posAttr.needsUpdate = true

      if (morph.progress >= 1.0) {
        morph.active = false
        morph.from = null
        morph.to = null
      }
    }

    // ── Uniform updates ────────────────────────────────────
    activeUniforms.uTime.value = state.clock.elapsedTime

    activeUniforms.uMouse.value.lerp(
      new THREE.Vector2(store.mouse.x, store.mouse.y),
      0.15
    )

    // Faster hand tracking — "咬合" snap response
    activeUniforms.uHandPos.value.lerp(
      new THREE.Vector3(store.handPosition.x, store.handPosition.y, store.handPosition.z),
      0.32
    )
    activeUniforms.uFingertipPos.value.lerp(
      new THREE.Vector3(store.fingertipPosition.x, store.fingertipPosition.y, store.fingertipPosition.z),
      0.40
    )

    // ── Void Core lifecycle ────────────────────────────────
    const vcp = store.voidCorePhase
    const phaseMap: Record<string, number> = { idle: 0, forming: 1, active: 2, exploding: 3 }
    activeUniforms.uVoidPhase.value = phaseMap[vcp] ?? 0

    activeUniforms.uVoidCenter.value.lerp(
      new THREE.Vector3(store.voidCenter.x, store.voidCenter.y, store.voidCenter.z),
      0.30
    )

    if (vcp === 'forming' || vcp === 'active') {
      smoothVoidStrengthRef.current += (1.0 - smoothVoidStrengthRef.current) * 0.06
    } else if (vcp === 'exploding') {
      smoothVoidStrengthRef.current += (0.0 - smoothVoidStrengthRef.current) * 0.015
    } else {
      smoothVoidStrengthRef.current += (0.0 - smoothVoidStrengthRef.current) * 0.04
    }
    activeUniforms.uVoidStrength.value = smoothVoidStrengthRef.current

    if (vcp === 'exploding' && activeUniforms.uVoidExplosionTime.value < 0.0) {
      activeUniforms.uVoidExplosionTime.value = state.clock.elapsedTime
    }
    if (vcp === 'idle') {
      activeUniforms.uVoidExplosionTime.value = -1.0
    }

    const explosionAge =
      vcp === 'exploding' && activeUniforms.uVoidExplosionTime.value > 0
        ? state.clock.elapsedTime - activeUniforms.uVoidExplosionTime.value
        : 0
    const effectiveVcp = explosionAge > 5.0 ? 'idle' : vcp

    // ── Gesture force dispatch ─────────────────────────────
    if (effectiveVcp !== 'idle') {
      activeUniforms.uForceType.value = 4.0
      smoothForceRef.current += (0.0 - smoothForceRef.current) * 0.05
    } else {
      const gestureType = store.handDetected ? store.gestureType : 'none'
      activeUniforms.uForceType.value = gestureToForceType(gestureType)

      if (gestureType !== 'none') {
        smoothForceRef.current += (1.0 - smoothForceRef.current) * 0.08
      } else if (store.handDetected) {
        smoothForceRef.current += (0.25 - smoothForceRef.current) * 0.04
      } else {
        smoothForceRef.current += (0.0 - smoothForceRef.current) * 0.05
      }
    }

    activeUniforms.uForceStrength.value = smoothForceRef.current

    // ── Diagnostic ─────────────────────────────────────────
    diagRef.current++
    if (diagRef.current % 60 === 1) {
      console.log(
        `[ParticleUniverse] frame=${diagRef.current} ` +
          `vcp=${vcp} effectiveVcp=${effectiveVcp} ` +
          `gesture=${store.gestureType} handDet=${store.handDetected} ` +
          `shape=${store.particleShape} ` +
          `forceType=${activeUniforms.uForceType.value.toFixed(1)} ` +
          `forceStr=${activeUniforms.uForceStrength.value.toFixed(3)} ` +
          `voidStr=${activeUniforms.uVoidStrength.value.toFixed(3)}`
      )
    }
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
