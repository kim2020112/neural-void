import { create } from 'zustand'

export type AppPhase = 'idle' | 'loading' | 'active'
export type GestureType = 'none' | 'fist' | 'open_palm' | 'point'
export type VoidCorePhase = 'idle' | 'forming' | 'active' | 'exploding'
export type ParticleShape = 'galaxy' | 'saturn_ring' | 'dna_helix' | 'fibonacci_sphere'

export interface Vec3 {
  x: number
  y: number
  z: number
}

interface GestureResult {
  categoryName: string
  score: number
  handedness: string
}

interface HandLandmark {
  x: number
  y: number
  z: number
}

interface GestureData {
  gestures: GestureResult[]
  landmarks: HandLandmark[][]
  handedness: string[]
}

interface AppState {
  phase: AppPhase
  cameraReady: boolean
  gestureData: GestureData
  mouse: { x: number; y: number }

  // Smoothed hand position in Three.js world space
  handPosition: Vec3
  // Index fingertip position in Three.js world space
  fingertipPosition: Vec3
  // Current detected gesture
  gestureType: GestureType
  // Gesture confidence 0-1
  gestureScore: number
  // Smoothed force strength 0-1 (lerps toward target)
  forceStrength: number
  // Is a hand currently detected?
  handDetected: boolean

  // Second hand tracking (for void core dual-fist detection)
  hand2Position: Vec3
  hand2FingertipPosition: Vec3
  hand2GestureType: GestureType
  hand2Detected: boolean

  // Void core state
  voidCorePhase: VoidCorePhase
  voidCenter: Vec3
  voidCoreStrength: number
  voidExplosionTime: number

  // Particle shape / morphology
  particleShape: ParticleShape
  setParticleShape: (shape: ParticleShape) => void

  setPhase: (phase: AppPhase) => void
  setCameraReady: (ready: boolean) => void
  setGestureData: (data: GestureData) => void
  setMouse: (x: number, y: number) => void
  setHandPosition: (pos: Vec3) => void
  setFingertipPosition: (pos: Vec3) => void
  setGestureType: (type: GestureType, score: number) => void
  setHandDetected: (detected: boolean) => void
  setHand2Position: (pos: Vec3) => void
  setHand2FingertipPosition: (pos: Vec3) => void
  setHand2GestureType: (type: GestureType) => void
  setHand2Detected: (detected: boolean) => void
  setVoidCorePhase: (phase: VoidCorePhase) => void
  setVoidCenter: (pos: Vec3) => void
  setVoidCoreStrength: (s: number) => void
  setVoidExplosionTime: (t: number) => void
}

const ZERO_VEC3: Vec3 = { x: 0, y: 0, z: 0 }

export const useAppStore = create<AppState>((set) => ({
  phase: 'idle',
  cameraReady: false,
  gestureData: { gestures: [], landmarks: [], handedness: [] },
  mouse: { x: 0, y: 0 },

  handPosition: ZERO_VEC3,
  fingertipPosition: ZERO_VEC3,
  gestureType: 'none',
  gestureScore: 0,
  forceStrength: 0,
  handDetected: false,
  hand2Position: ZERO_VEC3,
  hand2FingertipPosition: ZERO_VEC3,
  hand2GestureType: 'none',
  hand2Detected: false,
  voidCorePhase: 'idle',
  voidCenter: ZERO_VEC3,
  voidCoreStrength: 0,
  voidExplosionTime: -1,

  particleShape: 'galaxy',

  setPhase: (phase) => set({ phase }),
  setCameraReady: (ready) => set({ cameraReady: ready }),
  setGestureData: (data) => set({ gestureData: data }),
  setMouse: (x, y) => set({ mouse: { x, y } }),
  setHandPosition: (pos) => set({ handPosition: pos }),
  setFingertipPosition: (pos) => set({ fingertipPosition: pos }),
  setGestureType: (type, score) => set({ gestureType: type, gestureScore: score }),
  setHandDetected: (detected) => set({ handDetected: detected }),
  setHand2Position: (pos) => set({ hand2Position: pos }),
  setHand2FingertipPosition: (pos) => set({ hand2FingertipPosition: pos }),
  setHand2GestureType: (type) => set({ hand2GestureType: type }),
  setHand2Detected: (detected) => set({ hand2Detected: detected }),
  setVoidCorePhase: (phase) => set({ voidCorePhase: phase }),
  setVoidCenter: (pos) => set({ voidCenter: pos }),
  setVoidCoreStrength: (s) => set({ voidCoreStrength: s }),
  setVoidExplosionTime: (t) => set({ voidExplosionTime: t }),
  setParticleShape: (shape) => set({ particleShape: shape }),
}))
