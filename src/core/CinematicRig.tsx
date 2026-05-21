import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import type { ParticleShape } from '../particles/shapes/types'
import { useAppStore } from '../store/appStore'

const CAMERA_FOCUS_BASE = new THREE.Vector3(0, 0.72, 0)

interface GalleryPose {
  position: readonly [number, number, number]
  lookAt: readonly [number, number, number]
  fov: number
  sway: number
  lift: number
  depth: number
}

const GALLERY_POSES: Record<ParticleShape, GalleryPose> = {
  saturn_ring: {
    position: [3.9, 2.2, 10.9],
    lookAt: [0, 0.18, 0],
    fov: 38,
    sway: 0.1,
    lift: 0.05,
    depth: 0.08,
  },
  quantum_sphere: {
    position: [1.8, 2.0, 12.1],
    lookAt: [0, 0.52, 0],
    fov: 40,
    sway: 0.08,
    lift: 0.06,
    depth: 0.08,
  },
  knot_torus: {
    position: [4.6, 2.4, 11.6],
    lookAt: [0, 0.15, 0],
    fov: 39,
    sway: 0.08,
    lift: 0.05,
    depth: 0.07,
  },
  dna_helix: {
    position: [4.1, 1.9, 13.2],
    lookAt: [0, 0.45, 0],
    fov: 34,
    sway: 0.06,
    lift: 0.05,
    depth: 0.06,
  },
  golden_spiral: {
    position: [3.1, 2.0, 12.2],
    lookAt: [0.2, 0.18, 0],
    fov: 37,
    sway: 0.08,
    lift: 0.04,
    depth: 0.06,
  },
  hypercube: {
    position: [4.8, 3.1, 13.4],
    lookAt: [0, 0.3, 0],
    fov: 33,
    sway: 0.06,
    lift: 0.04,
    depth: 0.05,
  },
  galaxy: {
    position: [2.7, 3.0, 14.6],
    lookAt: [0, 0.28, 0],
    fov: 32,
    sway: 0.08,
    lift: 0.05,
    depth: 0.08,
  },
  singularity: {
    position: [2.4, 2.5, 10.6],
    lookAt: [0, 0.2, 0],
    fov: 36,
    sway: 0.06,
    lift: 0.04,
    depth: 0.06,
  },
}

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

    if (galleryMode) {
      const pose = GALLERY_POSES[particleShape]
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
    const saturnHero = particleShape === 'saturn_ring'
    const saturnOrbit = state.clock.elapsedTime * 0.024 + 0.62
    const depthDrift = Math.cos(state.clock.elapsedTime * 0.14 + 1.4) * (saturnHero ? 0.42 : 0.92 + cinematicState.drift * 0.22)
    const radius =
      (saturnHero ? 9.6 : 11.85) -
      cinematicState.zoom * (saturnHero ? 0.92 : 1.12) -
      cinematicState.energy * (saturnHero ? 0.48 : 0.62) -
      cinematicState.transition * (saturnHero ? 0.88 : 1.05) -
      formingWeight * (saturnHero ? 1.45 : 1.8) -
      activeWeight * (saturnHero ? 0.72 : 0.95) +
      explosionWeight * (saturnHero ? 1.05 : 1.2)

    desiredPosition.current.set(
      saturnHero
        ? Math.cos(saturnOrbit) * 4.4 + anchor.x * 0.34
        : Math.cos(orbitAngle) * (1.85 + cinematicState.drift * 0.34 + activeWeight * 0.12) +
            sideDrift +
            anchor.x * 0.74,
      saturnHero
        ? 0.38 + verticalBreath * 0.36 + anchor.y * 0.2
        : 1.16 + verticalBreath + anchor.y * 0.46 - formingWeight * 0.12,
      saturnHero
        ? 8.25 + Math.sin(saturnOrbit) * 1.6 + depthDrift + anchor.z * 0.24
        : radius + depthDrift + anchor.z * 0.58,
    )

    desiredLookAt.current.copy(CAMERA_FOCUS_BASE)
    desiredLookAt.current.x += saturnHero ? anchor.x * 0.42 : anchor.x * (1.38 + formingWeight * 0.22)
    desiredLookAt.current.y +=
      saturnHero
        ? -0.16 + cinematicState.breath * 0.04 + anchor.y * 0.22
        : cinematicState.breath * 0.16 +
            anchor.y * 0.92 +
            activeWeight * 0.16 +
            cinematicState.shock * 0.1 -
            cinematicState.transition * 0.04
    desiredLookAt.current.z += saturnHero
      ? anchor.z * 0.18
      : anchor.z * 0.82 - cinematicState.transition * 0.34 - explosionWeight * 0.22

    camera.position.lerp(
      desiredPosition.current,
      0.026 + cinematicState.drift * 0.014 + formingWeight * 0.018 + explosionWeight * 0.012,
    )
    camera.lookAt(desiredLookAt.current)

    if ('fov' in camera) {
      const saturnHero = particleShape === 'saturn_ring'
      const targetFov =
        (saturnHero ? 24 : 32) -
        cinematicState.energy * (saturnHero ? 0.72 : 1.4) -
        cinematicState.transition * (saturnHero ? 0.52 : 1.2) -
        formingWeight * (saturnHero ? 0.52 : 1.2) -
        activeWeight * (saturnHero ? 0.3 : 0.6) +
        explosionWeight * (saturnHero ? 0.4 : 0.8)
      const nextFov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.03)
      if (Math.abs(nextFov - camera.fov) > 0.001) {
        camera.fov = nextFov
        camera.updateProjectionMatrix()
      }
    }
  })

  return null
}