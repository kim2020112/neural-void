# Architecture

## Directory Structure

```
src/
  core/           # Three.js / R3F scene infrastructure
    Scene.tsx       Canvas, camera, renderer config
    Background.tsx  Full-screen shader plane (deep space)
  hand/           # MediaPipe gesture recognition
    useCamera.ts    Camera stream → hidden <video> element
    GestureRecognizer.ts  GestureRecognizer init + RAF loop
  particles/      # (Phase 2) GPU particle system
  shaders/        # GLSL shader source files
    background.vert  Pass-through vertex shader
    background.frag  Multi-layer noise nebula + star field
  store/          # Zustand global state
    appStore.ts     App phase, camera readiness, gesture data
  ui/             # React UI overlays
    App.tsx         Root orchestrator
    EnterScreen.tsx Welcome overlay with START button
  utils/          # Shared utilities
  glsl.d.ts       # TS declarations for .glsl/.vert/.frag imports
  index.css       # Global reset + font imports
  main.tsx        # React entry point
```

## Data Flow

```
User clicks "START"
  → EnterScreen calls getUserMedia()
    → stream stored on window.__cameraStream
    → appStore.phase = 'active'
      → useCamera: creates <video>, attaches stream, stores on window.__videoElement
      → useGestureRecognizer: loads MediaPipe WASM + model, starts RAF loop
        → each frame: recognizer.recognizeForVideo(video, timestamp)
          → appStore.setGestureData(results)
            → (Phase 2) particle system reads gestureData and reacts
```

## State Machine

```
idle ──[START click]──→ loading ──[getUserMedia OK]──→ active
  ↑                        │                              │
  └──[camera denied]───────┘                              │
                                                          │
                                     [page unload / error] → cleanup
```

### AppPhase (`idle | loading | active`)

- **idle** — EnterScreen visible, no camera, no MediaPipe
- **loading** — awaiting `getUserMedia` promise
- **active** — camera streaming, gesture recognition running, scene visible

## Key Design Decisions

### 1. MediaPipe runs on the main thread (for now)
`recognizeForVideo` is synchronous and blocks. At ~30fps with a 640×480 feed
this is acceptable during development. Before production, the recognizer should
move into a Web Worker to keep the render loop at 60fps.

### 2. Stream/video stored on `window` rather than React state
The camera `MediaStream` and hidden `<video>` element are not serializable and
don't trigger re-renders. Storing them on `window` (namespaced with `__` prefix)
keeps them accessible to both the camera hook and the gesture loop without
fighting React's rendering model.

### 3. Shader-based background (not texture)
The deep-space nebula background is a full-screen `shaderMaterial` on a
`planeGeometry`. This means zero network requests, continuous animation, and
a consistent visual language for the particle system to match.

### 4. Zustand over Context
Gesture data updates at 30fps. Zustand's selector-based subscriptions let
the particle system subscribe to only the fields it needs without re-rendering
the React tree.

### 5. `numHands: 2` and `delegate: 'GPU'`
The MediaPipe recognizer is configured for both hands with GPU inference.
On devices without WebGL, fall back to `'CPU'` delegate.
