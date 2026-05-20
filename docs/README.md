# Neural Void — Project Overview

**Control a living particle universe with your hands.**

Neural Void is a sci-fi interactive web experience that uses real-time hand gesture
recognition (via webcam + MediaPipe) to control a GPU-rendered particle universe.
The visual target is cinematic cyberpunk / dark energy / hologram aesthetics.

## Quick Start

```bash
npm install
npm run dev       # → http://localhost:5173
npm run build     # → dist/
npm run preview   # → serve dist/ locally
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Bundler | Vite | 8.x |
| UI Framework | React | 19.x |
| Language | TypeScript | 6.x |
| 3D Renderer | Three.js (via R3F) | 0.184 |
| React 3D | @react-three/fiber | 9.6 |
| 3D Helpers | @react-three/drei | 10.7 |
| Hand Tracking | @mediapipe/tasks-vision | 0.10.35 |
| Post Processing | @react-three/postprocessing | 3.0 |
| State | zustand | 5.x |
| Shader Imports | vite-plugin-glsl | 1.6 |

## Project Goals

1. **Phase 1** — Scaffold: R3F scene, camera, gesture recognition skeleton ✅
2. **Phase 2** — GPU particle system (20,000 particles, Bloom, shader-driven) ✅
3. **Phase 3** — Gesture-to-effect mapping (fist = attract, palm = repulse, etc.) ✅
4. **Phase 4** — Post-processing, hologram overlays, cinematic polish

## Browser Support

Modern browsers with WebGL 2.0 and `getUserMedia`. WebGPU readiness planned.
