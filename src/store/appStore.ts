import { create } from 'zustand'

export type AppPhase = 'idle' | 'loading' | 'active'
export type GestureType = 'none' | 'fist' | 'open_palm' | 'point'

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

  setPhase: (phase: AppPhase) => void
  setCameraReady: (ready: boolean) => void
  setGestureData: (data: GestureData) => void
  setMouse: (x: number, y: number) => void
  setHandPosition: (pos: Vec3) => void
  setFingertipPosition: (pos: Vec3) => void
  setGestureType: (type: GestureType, score: number) => void
  setHandDetected: (detected: boolean) => void
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

  setPhase: (phase) => set({ phase }),
  setCameraReady: (ready) => set({ cameraReady: ready }),
  setGestureData: (data) => set({ gestureData: data }),
  setMouse: (x, y) => set({ mouse: { x, y } }),
  setHandPosition: (pos) => set({ handPosition: pos }),
  setFingertipPosition: (pos) => set({ fingertipPosition: pos }),
  setGestureType: (type, score) => set({ gestureType: type, gestureScore: score }),
  setHandDetected: (detected) => set({ handDetected: detected }),
}))
