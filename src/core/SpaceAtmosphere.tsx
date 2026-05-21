import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import atmosphereVert from '../shaders/atmosphere.vert'
import atmosphereFrag from '../shaders/atmosphere.frag'
import { useAppStore } from '../store/appStore'

const ATMOSPHERE_COUNT = 3600

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
  const { positions, scales, layers, randomness } = useMemo(() => generateAtmosphereField(ATMOSPHERE_COUNT), [])

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
    const { cinematicState } = useAppStore.getState()

    uniforms.uTime.value = state.clock.elapsedTime
    uniforms.uPulse.value = cinematicState.pulse
    uniforms.uEnergy.value = cinematicState.atmosphere + cinematicState.transition * 0.18
    uniforms.uTurbulence.value = cinematicState.turbulence + cinematicState.shock * 0.08

    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.01 + cinematicState.drift * 0.05
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.04) * 0.03
      pointsRef.current.position.y = cinematicState.breath * 0.2
    }
  })

  return (
    <points ref={pointsRef} renderOrder={-1}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aScale" args={[scales, 1]} />
        <bufferAttribute attach="attributes-aLayer" args={[layers, 1]} />
        <bufferAttribute attach="attributes-aRandom" args={[randomness, 1]} />
      </bufferGeometry>
      <shaderMaterial
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