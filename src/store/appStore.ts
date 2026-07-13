import { create } from 'zustand'
import { DEFAULT_PARTICLE_SHAPE } from '../particles/shapes/catalog'
import type { ParticleShape } from '../particles/shapes/types'

export type AppPhase = 'idle' | 'loading' | 'active'
export type GestureType = 'none' | 'fist' | 'open_palm' | 'point'
export type VoidCorePhase = 'idle' | 'forming' | 'active' | 'exploding'
export type TrackingStatus =
  | 'idle'
  | 'requesting_camera'
  | 'camera_ready'
  | 'loading_model'
  | 'warming_up'
  | 'ready'
  | 'error'
export type TrackingDelegate = 'none' | 'gpu' | 'cpu'
export type InteractionMode =
  | 'idle'
  | 'attract'
  | 'repel'
  | 'point'
  | 'duality'
  | 'forming_void'
  | 'void_core'
  | 'exploding'

export interface CinematicState {
  breath: number
  pulse: number
  energy: number
  drift: number
  zoom: number
  atmosphere: number
  turbulence: number
  shock: number
  settle: number
  transition: number
}

export interface InteractionState {
  mode: InteractionMode
  presence: number
  duality: number
  depth: number
  focus: number
  orbit: number
}

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface GestureResult {
  categoryName: string
  score: number
  handedness: string
}

interface HandLandmark {
  x: number
  y: number
  z: number
}

export interface GestureData {
  gestures: GestureResult[]
  landmarks: HandLandmark[][]
  handedness: string[]
}

export interface TrackingMetrics {
  inferenceFps: number
  inferenceMs: number
  delegate: TrackingDelegate
}

export interface HandTrackingFrame {
  gestureData: GestureData
  handPosition: Vec3
  fingertipPosition: Vec3
  gestureType: GestureType
  gestureScore: number
  handDetected: boolean
  hand2Position: Vec3
  hand2FingertipPosition: Vec3
  hand2GestureType: GestureType
  hand2GestureScore: number
  hand2Detected: boolean
  forceStrength: number
  interactionState: InteractionState
}

interface AppState {
  phase: AppPhase
  cameraReady: boolean
  cameraEnabled: boolean
  trackingStatus: TrackingStatus
  trackingError: string | null
  trackingMetrics: TrackingMetrics
  galleryMode: boolean
  gestureData: GestureData
  mouse: { x: number; y: number }
  cinematicState: CinematicState
  interactionState: InteractionState

  handPosition: Vec3
  fingertipPosition: Vec3
  gestureType: GestureType
  gestureScore: number
  forceStrength: number
  handDetected: boolean

  hand2Position: Vec3
  hand2FingertipPosition: Vec3
  hand2GestureType: GestureType
  hand2GestureScore: number
  hand2Detected: boolean

  voidCorePhase: VoidCorePhase
  voidCenter: Vec3
  voidCoreStrength: number
  voidExplosionTime: number

  particleShape: ParticleShape
  setParticleShape: (shape: ParticleShape) => void

  setPhase: (phase: AppPhase) => void
  setCameraReady: (ready: boolean) => void
  setCameraEnabled: (enabled: boolean) => void
  setTrackingStatus: (status: TrackingStatus, error?: string | null) => void
  setTrackingMetrics: (metrics: Partial<TrackingMetrics>) => void
  setHandTrackingFrame: (frame: HandTrackingFrame) => void
  setGalleryMode: (enabled: boolean) => void
  setMouse: (x: number, y: number) => void
  setCinematicState: (state: Partial<CinematicState>) => void
  setVoidCorePhase: (phase: VoidCorePhase) => void
  setVoidCenter: (pos: Vec3) => void
  setVoidCoreStrength: (s: number) => void
  setVoidExplosionTime: (t: number) => void
}

const ZERO_VEC3: Vec3 = { x: 0, y: 0, z: 0 }

const DEFAULT_CINEMATIC_STATE: CinematicState = {
  breath: 0.5,
  pulse: 0.6,
  energy: 0.2,
  drift: 0.34,
  zoom: 0.3,
  atmosphere: 0.45,
  turbulence: 0.2,
  shock: 0,
  settle: 1,
  transition: 0,
}

const DEFAULT_INTERACTION_STATE: InteractionState = {
  mode: 'idle',
  presence: 0,
  duality: 0,
  depth: 0,
  focus: 0,
  orbit: 0,
}

export const useAppStore = create<AppState>((set) => ({
  phase: 'idle',
  cameraReady: false,
  cameraEnabled: true,
  trackingStatus: 'idle',
  trackingError: null,
  trackingMetrics: { inferenceFps: 0, inferenceMs: 0, delegate: 'none' },
  galleryMode: false,
  gestureData: { gestures: [], landmarks: [], handedness: [] },
  mouse: { x: 0, y: 0 },
  cinematicState: DEFAULT_CINEMATIC_STATE,
  interactionState: DEFAULT_INTERACTION_STATE,

  handPosition: ZERO_VEC3,
  fingertipPosition: ZERO_VEC3,
  gestureType: 'none',
  gestureScore: 0,
  forceStrength: 0,
  handDetected: false,

  hand2Position: ZERO_VEC3,
  hand2FingertipPosition: ZERO_VEC3,
  hand2GestureType: 'none',
  hand2GestureScore: 0,
  hand2Detected: false,

  voidCorePhase: 'idle',
  voidCenter: ZERO_VEC3,
  voidCoreStrength: 0,
  voidExplosionTime: -1,

  particleShape: DEFAULT_PARTICLE_SHAPE,

  setPhase: (phase) => set({ phase }),
  setCameraReady: (ready) => set({ cameraReady: ready }),
  setCameraEnabled: (cameraEnabled) => set({ cameraEnabled }),
  setTrackingStatus: (trackingStatus, trackingError = null) =>
    set({ trackingStatus, trackingError }),
  setTrackingMetrics: (trackingMetrics) =>
    set((state) => ({ trackingMetrics: { ...state.trackingMetrics, ...trackingMetrics } })),
  setHandTrackingFrame: (frame) => set(frame),
  setGalleryMode: (galleryMode) => set({ galleryMode }),
  setMouse: (x, y) => set({ mouse: { x, y } }),
  setCinematicState: (cinematicState) =>
    set((state) => ({ cinematicState: { ...state.cinematicState, ...cinematicState } })),
  setVoidCorePhase: (phase) => set({ voidCorePhase: phase }),
  setVoidCenter: (pos) => set({ voidCenter: pos }),
  setVoidCoreStrength: (voidCoreStrength) => set({ voidCoreStrength }),
  setVoidExplosionTime: (voidExplosionTime) => set({ voidExplosionTime }),
  setParticleShape: (shape) => set({ particleShape: shape }),
}))
