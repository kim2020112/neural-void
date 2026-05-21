# Architecture

## Directory Structure

```
src/
  core/           # Three.js / R3F scene infrastructure
    Scene.tsx       Canvas, camera, renderer, EffectComposer + Bloom
    Background.tsx  Full-screen shader plane (deep space)
    MouseTracker.tsx  Reads R3F pointer → Zustand store (per-frame)
    HandCursor.tsx  Cyan sphere tracking hand position (debug)
    ReferenceRing.tsx  Spatial reference torus at origin
  hand/           # MediaPipe gesture recognition
    useCamera.ts    Camera stream → hidden <video> element
    GestureRecognizer.ts  MediaPipe init + RAF loop + hysteresis + void core triggers
  particles/      # GPU particle system
    ParticleUniverse.tsx  20000 particles, BufferGeometry + ShaderMaterial
  shaders/        # GLSL shader source files
    background.vert  Pass-through vertex shader
    background.frag  Multi-layer noise nebula + star field
    particle.vert    3D Simplex + Curl noise, gesture force fields, void core physics
    particle.frag    Triple-layer soft particle, additive glow
  store/          # Zustand global state
    appStore.ts     App phase, camera, gesture data, hand tracking, void core state
  ui/             # React UI overlays
    App.tsx         Root orchestrator
    EnterScreen.tsx Welcome overlay with START button
    DebugOverlay.tsx  Real-time diagnostic panel (FPS, hands, gestures, void core)
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
          → Process Hand 0 (smooth, hysteresis → store.handPosition/gestureType)
          → Process Hand 1 (smooth, hysteresis → store.hand2Position/gestureType)
          → Evaluate void core triggers:
            - Both hands fist → instant FORMING phase
            - Single fist held 2s+ → delayed FORMING phase
            - Fist→open_palm during ACTIVE → EXPLODING phase
          → ParticleUniverse useFrame reads store:
            - Updates uHandPos, uForceType, uForceStrength for normal gestures
            - Updates uVoidCenter, uVoidPhase, uVoidStrength for void core
            - Captures uVoidExplosionTime on explosion trigger
          → Vertex shader dispatches between normal gesture force fields
            and void core physics (lensing / vortex / explosion)
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

### VoidCorePhase (`idle | forming | active | exploding`)

The void core is a sub-state-machine that operates when `phase === 'active'`:

```
IDLE ──(both fists or single fist 2s)──→ FORMING ──(0.5s)──→ ACTIVE
  ↑                                                             │
  └──────────────────────(3.5s explosion decay)←─── EXPLODING ←─┘
                                                          ↑ (fist→open_palm)
```

- **forming** — Gravitational lensing only: particles warp tangentially around the void center
- **active** — Full vortex + accretion disk + color zones: particles spiral into center
- **exploding** — Radial blast + expanding shockwave ring, auto-decays to idle after ~3.5s

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

### 5. `numHands: 2` with independent hysteresis
Dual-hand tracking for void core triggers (both-fists instant trigger, single-fist 2s
delayed trigger). Each hand has its own hysteresis state machine. The second hand's
gesture type is stored in `hand2GestureType` for independent phase evaluation.

### 6. Void Core: all physics in vertex shader
The void core feature adds 3 new force functions (lensing, vortex, explosion) and a
color remapping function, all implemented in GLSL. The CPU only updates 4 uniforms:
`uVoidCenter`, `uVoidPhase`, `uVoidStrength`, `uVoidExplosionTime`. This enables
20,000 particles to simulate black hole physics at 60fps with zero CPU iteration.

### 7. Explosion timing via sentinel uniform
The explosion uses a sentinel mechanism: `uVoidExplosionTime` starts at -1.0 (inactive).
When `ParticleUniverse` detects `voidCorePhase === 'exploding'`, it captures
`state.clock.elapsedTime` into the uniform (one-time assignment). The shader computes
`float age = uTime - uVoidExplosionTime` for the blast duration. Returning to idle
resets the sentinel.
`getUserMedia` is only available in [secure contexts](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#security).
Vite dev server is configured with a self-signed certificate (`.cert/`, gitignored)
so the project is testable from remote devices. On the first visit, the browser
will show a certificate warning — click "Advanced" → "Proceed" to bypass.

### 8. GPU particle computation (no CPU loops)
All 20,000 particle positions are computed on the GPU via Curl noise in the vertex
shader. The CPU only updates uniforms (`uTime`, `uMouse`). BufferGeometry
attributes (position, color, size) are uploaded once at init and never touched by
JS again. This is why we can hold 60fps with tens of thousands of particles.

### 9. AdditiveBlending + Bloom = neon glow
Particles use `THREE.AdditiveBlending` so overlapping particles accumulate
brightness. The `EffectComposer` + `Bloom` pass then amplifies bright areas,
creating the sci-fi neon energy look without expensive custom render targets.

### 10. Two-stage gesture smoothing pipeline
Raw MediaPipe coordinates are noisy. The pipeline smooths at two levels:
1. **EMA in GestureRecognizer** (factor=0.35) — reduces per-frame jitter before store write
2. **Lerp in useFrame** (factor=0.15) — prevents sudden position jumps in the shader
Additionally, a gesture stability filter requires 6 consecutive frames (~200ms)
of the same gesture before activating, preventing flicker between gesture states.
