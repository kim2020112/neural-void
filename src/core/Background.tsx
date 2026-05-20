import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import backgroundVert from '../shaders/background.vert'
import backgroundFrag from '../shaders/background.frag'

export function Background() {
  const meshRef = useRef<THREE.Mesh>(null)
  const { viewport } = useThree()

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(viewport.width, viewport.height) },
    }),
    [viewport.width, viewport.height]
  )

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <mesh ref={meshRef} scale={[viewport.width, viewport.height, 1]}>
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
