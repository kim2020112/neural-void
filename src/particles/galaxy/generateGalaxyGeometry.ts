import {
  GALAXY_COUNTS,
  GALAXY_ROLE,
  GALAXY_STRUCTURE,
  type GalaxyGeometryData,
} from './galaxyTypes'

const TAU = Math.PI * 2

function fract(value: number) {
  return value - Math.floor(value)
}

function hash(index: number, seed: number) {
  return fract(Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453123)
}

function signedHash(index: number, seed: number) {
  return hash(index, seed) * 2 - 1
}

export function galaxyArmAngle(radiusNormalized: number, arm: number) {
  const radius = GALAXY_STRUCTURE.armInnerRadius +
    Math.max(0, Math.min(1, radiusNormalized)) *
    (GALAXY_STRUCTURE.armOuterRadius - GALAXY_STRUCTURE.armInnerRadius)
  return Math.log(radius / GALAXY_STRUCTURE.armInnerRadius) * GALAXY_STRUCTURE.pitch + arm * Math.PI
}

export function generateGalaxyGeometry(): GalaxyGeometryData {
  const { total } = GALAXY_COUNTS
  const basePositions = new Float32Array(total * 3)
  const roles = new Float32Array(total)
  const arms = new Float32Array(total).fill(-1)
  const radii = new Float32Array(total)
  const seeds = new Float32Array(total)
  const sizes = new Float32Array(total)
  const temperatures = new Float32Array(total)
  let write = 0

  const add = (
    x: number,
    y: number,
    z: number,
    role: number,
    arm: number,
    radiusNormalized: number,
    seed: number,
    size: number,
    temperature: number,
  ) => {
    const offset = write * 3
    basePositions[offset] = x
    basePositions[offset + 1] = y
    basePositions[offset + 2] = z
    roles[write] = role
    arms[write] = arm
    radii[write] = radiusNormalized
    seeds[write] = seed
    sizes[write] = size
    temperatures[write] = temperature
    write += 1
  }

  for (let i = 0; i < GALAXY_COUNTS.bulge; i++) {
    const seed = hash(i, 1.7)
    const radius = Math.cbrt(hash(i, 2.3)) * GALAXY_STRUCTURE.coreRadius
    const theta = TAU * hash(i, 2.9)
    const cosPhi = 1 - 2 * hash(i, 3.5)
    const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi))
    add(
      Math.cos(theta) * sinPhi * radius,
      cosPhi * radius * 0.72,
      Math.sin(theta) * sinPhi * radius,
      GALAXY_ROLE.BULGE,
      -1,
      radius / GALAXY_STRUCTURE.armOuterRadius,
      seed,
      0.32 + seed * 0.7,
      0.72 + seed * 0.28,
    )
  }

  const diskStart = GALAXY_COUNTS.bulge
  for (let i = 0; i < GALAXY_COUNTS.disk; i++) {
    const index = diskStart + i
    const seed = hash(index, 4.1)
    const radiusNormalized = Math.sqrt(hash(index, 4.7))
    const radius = 0.45 + radiusNormalized * 5.55
    const angle = TAU * hash(index, 5.3)
    const thickness = (0.03 + (1 - radiusNormalized) * 0.19) * signedHash(index, 5.9)
    add(
      Math.cos(angle) * radius,
      thickness,
      Math.sin(angle) * radius,
      GALAXY_ROLE.DISK,
      -1,
      radiusNormalized,
      seed,
      0.16 + seed * 0.36,
      hash(index, 6.5),
    )
  }

  const armStart = diskStart + GALAXY_COUNTS.disk
  for (let arm = 0; arm < GALAXY_COUNTS.armCount; arm++) {
    for (let i = 0; i < GALAXY_COUNTS.particlesPerArm; i++) {
      const index = armStart + arm * GALAXY_COUNTS.particlesPerArm + i
      const seed = hash(index, 7.1)
      const radiusNormalized = Math.pow((i + 0.5) / GALAXY_COUNTS.particlesPerArm, 0.72)
      const radius = GALAXY_STRUCTURE.armInnerRadius + radiusNormalized *
        (GALAXY_STRUCTURE.armOuterRadius - GALAXY_STRUCTURE.armInnerRadius)
      const angle = galaxyArmAngle(radiusNormalized, arm) +
        signedHash(index, 7.7) * (0.035 + radiusNormalized * 0.075)
      const radialScatter = signedHash(index, 8.3) * (0.025 + radiusNormalized * 0.11)
      add(
        Math.cos(angle) * (radius + radialScatter),
        signedHash(index, 8.9) * (0.035 + radiusNormalized * 0.11),
        Math.sin(angle) * (radius + radialScatter),
        GALAXY_ROLE.ARM,
        arm,
        radiusNormalized,
        seed,
        0.2 + seed * 0.5,
        hash(index, 9.5),
      )
    }
  }

  const dustStart = armStart + GALAXY_COUNTS.arm
  for (let i = 0; i < GALAXY_COUNTS.dust; i++) {
    const index = dustStart + i
    const arm = i % GALAXY_COUNTS.armCount
    const seed = hash(index, 10.1)
    const radiusNormalized = Math.pow(hash(index, 10.7), 0.72)
    const radius = 0.86 + radiusNormalized * 5.42
    const angle = galaxyArmAngle(radiusNormalized, arm) + 0.15 + signedHash(index, 11.3) * 0.055
    add(
      Math.cos(angle) * radius,
      signedHash(index, 11.9) * (0.025 + radiusNormalized * 0.07),
      Math.sin(angle) * radius,
      GALAXY_ROLE.DUST,
      arm,
      radiusNormalized,
      seed,
      0.55 + seed * 0.85,
      0,
    )
  }

  const haloStart = dustStart + GALAXY_COUNTS.dust
  for (let i = 0; i < GALAXY_COUNTS.halo; i++) {
    const index = haloStart + i
    const seed = hash(index, 12.5)
    const radius = 4.8 + hash(index, 13.1) * (GALAXY_STRUCTURE.haloRadius - 4.8)
    const theta = TAU * hash(index, 13.7)
    const cosPhi = 1 - 2 * hash(index, 14.3)
    const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi))
    add(
      Math.cos(theta) * sinPhi * radius,
      cosPhi * radius * 0.42,
      Math.sin(theta) * sinPhi * radius,
      GALAXY_ROLE.HALO,
      -1,
      radius / GALAXY_STRUCTURE.haloRadius,
      seed,
      0.16 + seed * 0.34,
      0.3 + hash(index, 14.9) * 0.7,
    )
  }

  return { count: write, basePositions, roles, arms, radii, seeds, sizes, temperatures }
}
