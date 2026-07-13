/* eslint-disable react-hooks/immutability -- R3F camera objects are intentionally mutated inside useFrame. */
import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { getSceneProfile } from '../scenes/sceneProfiles'
import { useAppStore } from '../store/appStore'

const CAMERA_FOCUS_BASE = new THREE.Vector3(0, 0.72, 0)

export function CinematicRig() {
  const { camera } = useThree()
  const desiredPosition = useRef(new THREE.Vector3())
  const desiredLookAt = useRef(new THREE.Vector3())

  useFrame((state) => {
    const store = useAppStore.getState()
    const {
      cinematicState,
      voidCenter,
      voidCorePhase,
      voidCoreStrength,
      handPosition,
      galleryMode,
      particleShape,
    } = store
    const voidActive = voidCorePhase !== 'idle'
    const formingWeight = voidCorePhase === 'forming' ? Math.pow(voidCoreStrength, 1.3) : 0
    const activeWeight = voidCorePhase === 'active' ? Math.pow(voidCoreStrength, 0.85) : 0
    const explosionWeight = voidCorePhase === 'exploding' ? Math.pow(voidCoreStrength, 0.62) : 0
    const profile = getSceneProfile(particleShape)
    const heroCamera = profile.heroCamera

    // Hero scenes keep a stable composition and only use subtle idle drift.
    if (heroCamera && !galleryMode) {
      const t = state.clock.elapsedTime
      desiredPosition.current.set(
        heroCamera.position[0] + Math.sin(t * 0.11) * heroCamera.sway,
        heroCamera.position[1] + Math.sin(t * 0.09 + 1.1) * heroCamera.lift,
        heroCamera.position[2] + Math.cos(t * 0.08 + 0.4) * heroCamera.depth,
      )
      desiredLookAt.current.set(
        heroCamera.lookAt[0] + Math.sin(t * 0.07) * 0.02,
        heroCamera.lookAt[1] + Math.sin(t * 0.1 + 0.6) * 0.015,
        heroCamera.lookAt[2],
      )

      camera.position.lerp(desiredPosition.current, 0.06)
      camera.lookAt(desiredLookAt.current)

      if ('fov' in camera) {
        const nextFov = THREE.MathUtils.lerp(camera.fov, heroCamera.fov, 0.06)
        if (Math.abs(nextFov - camera.fov) > 0.001) {
          camera.fov = nextFov
          camera.updateProjectionMatrix()
        }
      }
      return
    }

    if (galleryMode) {
      const pose = profile.camera
      const motionTime = state.clock.elapsedTime
      const microScale = 1 - activeWeight * 0.25 - explosionWeight * 0.18

      desiredPosition.current.set(
        pose.position[0] + Math.sin(motionTime * 0.15 + 0.4) * pose.sway * microScale,
        pose.position[1] + Math.sin(motionTime * 0.11 + 1.2) * pose.lift * microScale,
        pose.position[2] + Math.cos(motionTime * 0.09 + 0.7) * pose.depth * microScale + formingWeight * 0.18 - explosionWeight * 0.14,
      )

      desiredLookAt.current.set(
        pose.lookAt[0] + Math.sin(motionTime * 0.08 + 0.2) * pose.sway * 0.2,
        pose.lookAt[1] + Math.sin(motionTime * 0.12 + 1.4) * pose.lift * 0.28 + activeWeight * 0.06,
        pose.lookAt[2] + Math.cos(motionTime * 0.07 + 0.9) * pose.depth * 0.14 - explosionWeight * 0.08,
      )

      camera.position.lerp(desiredPosition.current, 0.085)
      camera.lookAt(desiredLookAt.current)

      if ('fov' in camera) {
        const targetFov = pose.fov - formingWeight * 0.5 - activeWeight * 0.8 + explosionWeight * 0.5
        const nextFov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.08)
        if (Math.abs(nextFov - camera.fov) > 0.001) {
          camera.fov = nextFov
          camera.updateProjectionMatrix()
        }
      }
      return
    }

    const anchor = voidActive
      ? new THREE.Vector3(voidCenter.x * 0.34, voidCenter.y * 0.2, voidCenter.z * 0.1)
      : new THREE.Vector3(handPosition.x * 0.08, handPosition.y * 0.05, handPosition.z * 0.03)

    const orbitAngle =
      state.clock.elapsedTime *
      (0.058 +
        cinematicState.drift * 0.018 +
        cinematicState.transition * 0.02 +
        explosionWeight * 0.015)
    const sideDrift =
      (Math.sin(state.clock.elapsedTime * 0.19 + 0.8) * (0.82 + cinematicState.drift * 0.62) +
        Math.sin(state.clock.elapsedTime * 0.43) * cinematicState.shock * 0.24) *
      (1 - formingWeight * 0.35)
    const verticalBreath =
      Math.sin(state.clock.elapsedTime * 0.28) * 0.24 +
      cinematicState.breath * (0.18 - formingWeight * 0.04) +
      cinematicState.transition * 0.14 +
      activeWeight * 0.12 -
      explosionWeight * 0.08
    const depthDrift = Math.cos(state.clock.elapsedTime * 0.14 + 1.4) * (0.92 + cinematicState.drift * 0.22)
    const radius =
      11.85 -
      cinematicState.zoom * 1.12 -
      cinematicState.energy * 0.62 -
      cinematicState.transition * 1.05 -
      formingWeight * 1.8 -
      activeWeight * 0.95 +
      explosionWeight * 1.2

    desiredPosition.current.set(
      Math.cos(orbitAngle) * (1.85 + cinematicState.drift * 0.34 + activeWeight * 0.12) +
        sideDrift +
        anchor.x * 0.74,
      1.16 + verticalBreath + anchor.y * 0.46 - formingWeight * 0.12,
      radius + depthDrift + anchor.z * 0.58,
    )

    desiredLookAt.current.copy(CAMERA_FOCUS_BASE)
    desiredLookAt.current.x += anchor.x * (1.38 + formingWeight * 0.22)
    desiredLookAt.current.y +=
      cinematicState.breath * 0.16 +
      anchor.y * 0.92 +
      activeWeight * 0.16 +
      cinematicState.shock * 0.1 -
      cinematicState.transition * 0.04
    desiredLookAt.current.z += anchor.z * 0.82 - cinematicState.transition * 0.34 - explosionWeight * 0.22

    camera.position.lerp(
      desiredPosition.current,
      0.026 + cinematicState.drift * 0.014 + formingWeight * 0.018 + explosionWeight * 0.012,
    )
    camera.lookAt(desiredLookAt.current)

    if ('fov' in camera) {
      const targetFov =
        32 -
        cinematicState.energy * 1.4 -
        cinematicState.transition * 1.2 -
        formingWeight * 1.2 -
        activeWeight * 0.6 +
        explosionWeight * 0.8
      const nextFov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.03)
      if (Math.abs(nextFov - camera.fov) > 0.001) {
        camera.fov = nextFov
        camera.updateProjectionMatrix()
      }
    }
  })

  return null
}
