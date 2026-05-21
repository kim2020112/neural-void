import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function ReferenceRing() {
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1
      ringRef.current.rotation.y = state.clock.elapsedTime * 0.05
    }
  })

  return (
    <mesh ref={ringRef} position={[0, 0, 0]}>
      <torusGeometry args={[10, 0.05, 16, 100]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.08} />
    </mesh>
  )
}
