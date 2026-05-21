import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { useAppStore } from '../store/appStore'

export function ReferenceRing() {
  const shellRef = useRef<THREE.Mesh>(null)
  const orbitRef = useRef<THREE.Mesh>(null)
  const shellMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const orbitMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const target = useRef(new THREE.Vector3())

  useFrame((state) => {
    const store = useAppStore.getState()
    const { interactionState, cinematicState, voidCorePhase, particleShape } = store
    const hasHands = store.handDetected || store.hand2Detected
    const saturnScene = particleShape === 'saturn_ring'

    const anchor = voidCorePhase !== 'idle'
      ? store.voidCenter
      : store.handDetected && store.hand2Detected
        ? {
            x: (store.handPosition.x + store.hand2Position.x) * 0.5,
            y: (store.handPosition.y + store.hand2Position.y) * 0.5,
            z: (store.handPosition.z + store.hand2Position.z) * 0.5,
          }
        : store.handDetected
          ? store.handPosition
          : { x: 0, y: 0, z: 0 }

    target.current.set(anchor.x, anchor.y, anchor.z)

    if (shellRef.current && orbitRef.current && shellMaterialRef.current && orbitMaterialRef.current) {
      shellRef.current.visible = !saturnScene && (hasHands || voidCorePhase !== 'idle')
      orbitRef.current.visible = !saturnScene && (hasHands || voidCorePhase !== 'idle')

      shellRef.current.position.lerp(target.current, 0.12)
      orbitRef.current.position.lerp(target.current, 0.12)

      const shellScale = 0.82 + interactionState.depth * 0.68 + cinematicState.energy * 0.18
      const orbitScale = 1.1 + interactionState.duality * 0.95 + interactionState.orbit * 0.5
      shellRef.current.scale.setScalar(shellScale)
      orbitRef.current.scale.setScalar(orbitScale)

      shellRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.26) * 0.4 + interactionState.orbit * 0.25
      shellRef.current.rotation.y = state.clock.elapsedTime * (0.18 + interactionState.duality * 0.2)
      orbitRef.current.rotation.z = state.clock.elapsedTime * (0.22 + cinematicState.pulse * 0.1)
      orbitRef.current.rotation.x = Math.PI * 0.5 + Math.sin(state.clock.elapsedTime * 0.14) * 0.2

      shellMaterialRef.current.opacity = 0.06 + interactionState.presence * 0.1 + cinematicState.atmosphere * 0.04
      orbitMaterialRef.current.opacity = 0.08 + interactionState.duality * 0.12 + cinematicState.pulse * 0.04
    }
  })

  return (
    <group renderOrder={2}>
      <mesh ref={shellRef} visible={false}>
        <torusGeometry args={[1.3, 0.04, 16, 96]} />
        <meshBasicMaterial ref={shellMaterialRef} color="#7dc9ff" transparent opacity={0.08} />
      </mesh>
      <mesh ref={orbitRef} visible={false} rotation={[Math.PI * 0.5, 0, 0]}>
        <torusGeometry args={[1.8, 0.025, 16, 96]} />
        <meshBasicMaterial ref={orbitMaterialRef} color="#ffd36b" transparent opacity={0.1} />
      </mesh>
    </group>
  )
}