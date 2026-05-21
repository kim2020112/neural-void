import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '../store/appStore'

export function HandCursor() {
  const meshRef = useRef<THREE.Mesh>(null)
  const targetPos = useRef(new THREE.Vector3())

  useFrame(() => {
    const store = useAppStore.getState()
    if (!store.handDetected || !meshRef.current) return

    targetPos.current.set(
      store.handPosition.x,
      store.handPosition.y,
      store.handPosition.z
    )
    meshRef.current.position.lerp(targetPos.current, 0.2)
    meshRef.current.visible = true
  })

  return (
    <mesh ref={meshRef} visible={false}>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshBasicMaterial color="#00ffff" transparent opacity={0.8} />
    </mesh>
  )
}
