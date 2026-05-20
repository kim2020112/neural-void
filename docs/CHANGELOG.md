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

## 2026-05-20 — Dev Server & TLS Configuration

### Added
- 自签名 TLS 证书（`openssl` 生成），存放于 `.cert/`（已加入 `.gitignore`）
- `vite.config.ts` 配置 HTTPS + `host: '0.0.0.0'`，可从外网访问
- `.gitignore` 新增 `.cert` 忽略规则，避免证书文件进入版本控制

### Changed
- 开发服务器从 HTTP localhost-only → HTTPS + 绑定所有网络接口
  - 摄像头 API (`getUserMedia`) 要求安全上下文，HTTPS 是硬性条件

### Technical Notes
- MediaPipe model loaded from CDN (`storage.googleapis.com/mediapipe-models/...`)
- WASM runtime loaded from jsDelivr CDN
- `numHands: 2`, `delegate: 'GPU'`, `runningMode: 'VIDEO'`
- Gesture data structure: `{ gestures, landmarks, handedness }` per frame
- Camera stream and video element stored on `window.__cameraStream` / `window.__videoElement`
  (not React state — they're non-serializable platform objects)

## 2026-05-20 — Phase 2: GPU Particle System

### Added
- `@react-three/postprocessing` 3.0.4 — Bloom 泛光后处理
- `src/shaders/particle.vert` — 顶点着色器：3D Simplex noise + Curl noise 多尺度叠加
  - 粒子位置由 GPU 实时计算，无需 CPU 循环
  - 鼠标偏置影响流动方向
  - `gl_PointSize` 深度衰减，远处粒子更小
- `src/shaders/particle.frag` — 片元着色器：三层软粒子（核心 + 光晕 + 外辉）
  - `AdditiveBlending` 叠色产生霓虹发光效果
  - 低 alpha 片段 discard 提升性能
- `src/particles/ParticleUniverse.tsx` — GPU 粒子宇宙核心组件
  - 20000 粒子，BufferGeometry + ShaderMaterial + Points
  - 星系分布：65% 外壳 + 20% 核心 + 10% 旋臂 + 5% 外层弥散
  - 8 色霓虹调色板（青、品红、紫、蓝、绿、金、粉、天蓝）
  - 大小分布用幂函数：更多小粒子，少量大粒子
- `src/core/MouseTracker.tsx` — 将 R3F `state.pointer` 写入 Zustand store
- 鼠标状态集成到 `appStore`（`mouse: {x, y}`，归一化到 [-1, 1]）

### Changed
- `Scene.tsx` — 集成 ParticleUniverse + MouseTracker + EffectComposer(Bloom)
  - 相机调整为 (0, 1.5, 14) 展示完整粒子宇宙
  - Bloom: luminanceThreshold=0.2, intensity=1.2, mipmapBlur
