# Changelog

## 2026-05-20 — Phase 1: Scaffold & Foundation

### Added
- Vite 8 + React 19 + TypeScript 6 project initialization
- Dependencies: three 0.184, @react-three/fiber 9.6, @react-three/drei 10.7,
  @mediapipe/tasks-vision 0.10.35, zustand 5, vite-plugin-glsl 1.6
- `src/core/Scene.tsx` — R3F Canvas with antialias, camera at (0,0,5), fov=60
- `src/core/Background.tsx` — Full-screen shader plane with deep-space nebula,
  star field, energy wisps, and vignette
- `src/shaders/background.vert` — Pass-through vertex shader
- `src/shaders/background.frag` — Multi-octave noise + hash-based star field
- `src/store/appStore.ts` — Zustand store with `phase`, `cameraReady`, `gestureData`
- `src/ui/App.tsx` — Root component: renders Scene + conditional EnterScreen
- `src/ui/EnterScreen.tsx` — "ENTER THE VOID" start overlay with camera permission flow
- `src/hand/useCamera.ts` — Creates hidden `<video>` from `getUserMedia` stream
- `src/hand/GestureRecognizer.ts` — MediaPipe GestureRecognizer init with
  GPU delegate, RAF-based per-frame recognition, result dispatch to store
- `src/glsl.d.ts` — TypeScript declarations for `.glsl`, `.vert`, `.frag` imports
- `docs/README.md` — Project overview, quick start, tech stack
- `docs/ARCHITECTURE.md` — Full architecture, data flow, design decisions
- `docs/CHANGELOG.md` — This file

### Removed
- Vite template boilerplate (`App.tsx`, `App.css`, `assets/`)

### Technical Notes
- MediaPipe model loaded from CDN (`storage.googleapis.com/mediapipe-models/...`)
- WASM runtime loaded from jsDelivr CDN
- `numHands: 2`, `delegate: 'GPU'`, `runningMode: 'VIDEO'`
- Gesture data structure: `{ gestures, landmarks, handedness }` per frame
- Camera stream and video element stored on `window.__cameraStream` / `window.__videoElement`
  (not React state — they're non-serializable platform objects)
