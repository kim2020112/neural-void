import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import backgroundVert from '../shaders/background.vert'
import backgroundFrag from '../shaders/background.frag'
import { useAppStore } from '../store/appStore'

export function Background() {
  const { viewport } = useThree()

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(viewport.width, viewport.height) },
      uPulse: { value: 0.6 },
      uEnergy: { value: 0.2 },
      uSaturnFocus: { value: 0 },
    }),
    [viewport.width, viewport.height],
  )

  useFrame((state) => {
    const { cinematicState, particleShape } = useAppStore.getState()

    uniforms.uTime.value = state.clock.elapsedTime
    uniforms.uPulse.value = cinematicState.pulse + cinematicState.transition * 0.12
    uniforms.uEnergy.value = cinematicState.atmosphere + cinematicState.energy * 0.15
    uniforms.uSaturnFocus.value = particleShape === 'saturn_ring' ? 1 : 0
  })

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        vertexShader={backgroundVert}
        fragmentShader={backgroundFrag}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  )
}