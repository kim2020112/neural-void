import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import atmosphereVert from '../shaders/atmosphere.vert'
import atmosphereFrag from '../shaders/atmosphere.frag'
import { getSceneProfile } from '../scenes/sceneProfiles'
import { useAppStore } from '../store/appStore'

const ATMOSPHERE_COUNT = 520

function generateAtmosphereField(count: number) {
  const positions = new Float32Array(count * 3)
  const scales = new Float32Array(count)
  const layers = new Float32Array(count)
  const randomness = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const cluster = i / count
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)

    let radius: number
    let layer: number
    let scale: number

    if (cluster < 0.44) {
      radius = 18 + Math.random() * 10
      layer = 0.18 + Math.random() * 0.16
      scale = 0.7 + Math.random() * 0.9
    } else if (cluster < 0.82) {
      radius = 28 + Math.random() * 12
      layer = 0.46 + Math.random() * 0.18
      scale = 0.9 + Math.random() * 1.2
    } else {
      radius = 40 + Math.random() * 16
      layer = 0.78 + Math.random() * 0.18
      scale = 1.25 + Math.random() * 1.8
    }

    positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius
    positions[i * 3 + 1] = Math.cos(phi) * radius * 0.55 + (Math.random() - 0.5) * 8
    positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius
    scales[i] = scale
    layers[i] = layer
    randomness[i] = Math.random()
  }

  return { positions, scales, layers, randomness }
}

export function SpaceAtmosphere() {
  const pointsRef = useRef<THREE.Points>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const geometryRef = useRef<THREE.BufferGeometry>(null)
  const particleShape = useAppStore((s) => s.particleShape)
  const profile = getSceneProfile(particleShape)

  const fullField = useMemo(() => generateAtmosphereField(ATMOSPHERE_COUNT), [])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPulse: { value: 0.6 },
      uEnergy: { value: 0.2 },
      uTurbulence: { value: 0.2 },
    }),
    [],
  )

  useFrame((state) => {
    const { cinematicState, particleShape: shape } = useAppStore.getState()
    const activeUniforms = materialRef.current?.uniforms
    if (!activeUniforms) return

    const atmosphere = getSceneProfile(shape).atmosphere
    activeUniforms.uTime.value = state.clock.elapsedTime
    activeUniforms.uPulse.value = cinematicState.pulse * atmosphere.pulseScale
    activeUniforms.uEnergy.value =
      atmosphere.energyBase +
      cinematicState.atmosphere * atmosphere.energyScale +
      cinematicState.transition * 0.18 * atmosphere.energyScale
    activeUniforms.uTurbulence.value =
      atmosphere.turbulenceBase +
      (cinematicState.turbulence + cinematicState.shock * 0.08) * atmosphere.turbulenceScale

    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * atmosphere.rotationSpeed + cinematicState.drift * 0.05
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.04) * atmosphere.rotationTilt
      pointsRef.current.position.y = cinematicState.breath * atmosphere.verticalDrift
      pointsRef.current.visible = true
    }
    geometryRef.current?.setDrawRange(0, atmosphere.count)
  })

  return (
    <points ref={pointsRef} renderOrder={-1} key={profile.id}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" args={[fullField.positions, 3]} />
        <bufferAttribute attach="attributes-aScale" args={[fullField.scales, 1]} />
        <bufferAttribute attach="attributes-aLayer" args={[fullField.layers, 1]} />
        <bufferAttribute attach="attributes-aRandom" args={[fullField.randomness, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={atmosphereVert}
        fragmentShader={atmosphereFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
