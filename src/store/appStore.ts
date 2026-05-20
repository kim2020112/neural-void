import { create } from 'zustand'

export type AppPhase = 'idle' | 'loading' | 'active'

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
  setPhase: (phase: AppPhase) => void
  setCameraReady: (ready: boolean) => void
  setGestureData: (data: GestureData) => void
  setMouse: (x: number, y: number) => void
}

export const useAppStore = create<AppState>((set) => ({
  phase: 'idle',
  cameraReady: false,
  gestureData: {
    gestures: [],
    landmarks: [],
    handedness: [],
  },
  mouse: { x: 0, y: 0 },
  setPhase: (phase) => set({ phase }),
  setCameraReady: (ready) => set({ cameraReady: ready }),
  setGestureData: (data) => set({ gestureData: data }),
  setMouse: (x, y) => set({ mouse: { x, y } }),
}))
