import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { useAppStore } from '../store/appStore'

function getGestureColor(gesture: string) {
  switch (gesture) {
    case 'fist':
      return new THREE.Color('#ff8b4d')
    case 'open_palm':
      return new THREE.Color('#7de0ff')
    case 'point':
      return new THREE.Color('#ffe07d')
    default:
      return new THREE.Color('#7ea0c8')
  }
}

export function HandCursor() {
  const primaryRef = useRef<THREE.Mesh>(null)
  const primaryHaloRef = useRef<THREE.Mesh>(null)
  const secondaryRef = useRef<THREE.Mesh>(null)
  const secondaryHaloRef = useRef<THREE.Mesh>(null)
  const primaryMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const primaryHaloMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const secondaryMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const secondaryHaloMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const targetPrimary = useRef(new THREE.Vector3())
  const targetSecondary = useRef(new THREE.Vector3())

  useFrame((state) => {
    const store = useAppStore.getState()
    const { interactionState, cinematicState } = store
    const primaryColor = getGestureColor(store.gestureType)
    const secondaryColor = getGestureColor(store.hand2GestureType)

    if (primaryRef.current && primaryHaloRef.current && primaryMaterialRef.current && primaryHaloMaterialRef.current) {
      primaryRef.current.visible = store.handDetected
      primaryHaloRef.current.visible = store.handDetected

      if (store.handDetected) {
        targetPrimary.current.set(store.handPosition.x, store.handPosition.y, store.handPosition.z)
        primaryRef.current.position.lerp(targetPrimary.current, 0.5)
        primaryHaloRef.current.position.lerp(targetPrimary.current, 0.34)

        const primaryScale = 0.7 + interactionState.depth * 0.55 + cinematicState.energy * 0.22
        primaryRef.current.scale.setScalar(primaryScale * 0.5)
        primaryHaloRef.current.scale.setScalar(1 + interactionState.focus * 0.34 + cinematicState.pulse * 0.16)
        primaryHaloRef.current.rotation.z = state.clock.elapsedTime * (0.5 + interactionState.orbit * 0.8)

        primaryMaterialRef.current.color.copy(primaryColor)
        primaryMaterialRef.current.opacity = 0.42 + interactionState.presence * 0.5
        primaryHaloMaterialRef.current.color.copy(primaryColor)
        primaryHaloMaterialRef.current.opacity = 0.18 + interactionState.focus * 0.28 + cinematicState.pulse * 0.08
      }
    }

    if (secondaryRef.current && secondaryHaloRef.current && secondaryMaterialRef.current && secondaryHaloMaterialRef.current) {
      secondaryRef.current.visible = store.hand2Detected
      secondaryHaloRef.current.visible = store.hand2Detected

      if (store.hand2Detected) {
        targetSecondary.current.set(store.hand2Position.x, store.hand2Position.y, store.hand2Position.z)
        secondaryRef.current.position.lerp(targetSecondary.current, 0.5)
        secondaryHaloRef.current.position.lerp(targetSecondary.current, 0.34)

        const secondaryScale = 0.62 + interactionState.depth * 0.42 + interactionState.duality * 0.28
        secondaryRef.current.scale.setScalar(secondaryScale * 0.44)
        secondaryHaloRef.current.scale.setScalar(0.88 + interactionState.duality * 0.48 + cinematicState.energy * 0.12)
        secondaryHaloRef.current.rotation.z = -state.clock.elapsedTime * (0.42 + interactionState.orbit * 0.75)

        secondaryMaterialRef.current.color.copy(secondaryColor)
        secondaryMaterialRef.current.opacity = 0.32 + interactionState.duality * 0.42
        secondaryHaloMaterialRef.current.color.copy(secondaryColor)
        secondaryHaloMaterialRef.current.opacity = 0.14 + interactionState.duality * 0.26
      }
    }
  })

  return (
    <group renderOrder={3}>
      <mesh ref={primaryRef} visible={false}>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshBasicMaterial ref={primaryMaterialRef} color="#7de0ff" transparent opacity={0.8} />
      </mesh>
      <mesh ref={primaryHaloRef} visible={false} rotation={[Math.PI * 0.5, 0, 0]}>
        <torusGeometry args={[0.7, 0.03, 16, 64]} />
        <meshBasicMaterial ref={primaryHaloMaterialRef} color="#7de0ff" transparent opacity={0.25} />
      </mesh>

      <mesh ref={secondaryRef} visible={false}>
        <sphereGeometry args={[0.24, 16, 16]} />
        <meshBasicMaterial ref={secondaryMaterialRef} color="#ffd680" transparent opacity={0.65} />
      </mesh>
      <mesh ref={secondaryHaloRef} visible={false} rotation={[Math.PI * 0.5, 0, 0]}>
        <torusGeometry args={[0.56, 0.025, 16, 64]} />
        <meshBasicMaterial ref={secondaryHaloMaterialRef} color="#ffd680" transparent opacity={0.18} />
      </mesh>
    </group>
  )
}
