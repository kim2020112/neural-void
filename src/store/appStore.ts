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
  setPhase: (phase: AppPhase) => void
  setCameraReady: (ready: boolean) => void
  setGestureData: (data: GestureData) => void
}

export const useAppStore = create<AppState>((set) => ({
  phase: 'idle',
  cameraReady: false,
  gestureData: {
    gestures: [],
    landmarks: [],
    handedness: [],
  },
  setPhase: (phase) => set({ phase }),
  setCameraReady: (ready) => set({ cameraReady: ready }),
  setGestureData: (data) => set({ gestureData: data }),
}))
