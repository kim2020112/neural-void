import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import backgroundVert from '../shaders/background.vert'
import backgroundFrag from '../shaders/background.frag'
import { getSceneProfile } from '../scenes/sceneProfiles'
import { useAppStore } from '../store/appStore'

export function Background() {
  const { size } = useThree()
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uPulse: { value: 0.6 },
      uEnergy: { value: 0.2 },
      uSceneFocus: { value: 0 },
    }),
    [size.height, size.width],
  )

  useFrame((state) => {
    const { cinematicState, particleShape } = useAppStore.getState()
    const activeUniforms = materialRef.current?.uniforms
    if (!activeUniforms) return

    activeUniforms.uTime.value = state.clock.elapsedTime
    activeUniforms.uPulse.value = cinematicState.pulse + cinematicState.transition * 0.12
    activeUniforms.uEnergy.value = cinematicState.atmosphere + cinematicState.energy * 0.15
    activeUniforms.uSceneFocus.value = getSceneProfile(particleShape).atmosphere.focus
  })

  return (
    <mesh frustumCulled={false} renderOrder={-100}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={backgroundVert}
        fragmentShader={backgroundFrag}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
        fog={false}
      />
    </mesh>
  )
}
