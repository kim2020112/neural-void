# Changelog

## Unreleased — Runtime HUD / Gallery / Saturn Ring Convergence

### Added
- 右上角 HUD 接入 `展示 / 交互` 模式切换，与摄像头开关并列常驻
- `galleryMode` 正式作为独立运行态接入文档与场景控制链路
- 背景增加按场景聚焦的 `uSaturnFocus`，土星环场景下自动压低背景星点与雾层干扰

### Changed
- 默认运行态从 Gallery 展示态切回 Hero / 交互态，首屏优先展示主场景而不是样本陈列
- `CinematicRig` 收敛为双路径：
  - Gallery：固定机位、弱运动、结构展示优先
  - Hero：动态主视角、呼吸/聚能/回落优先
- `DebugOverlay` 收敛为低占位中文 HUD：状态面板、场景库、摄像头按钮、模式按钮、离线提示层
- `PostProcessingRig` 改为按结构分档调节 bloom / brightness / vignette，避免所有场景共用一套泛光阈值
- `ParticleUniverse` 将 `galleryMode`、interaction frame、cinematic envelope 解耦，避免继续把所有表现都堆回单个粒子组件

### Saturn Ring Scene
- `saturn_ring` 结构从通用散盘重建为：
  - 中心球核
  - 明黄色主环
  - 外圈递减稀疏尾部
- 土星环静态流动被单独压低，避免无交互时散成白色云团
- 土星环获得专属镜头构图、专属亮部阈值和专属背景降噪
- 参考环在土星环场景下抑制显示，避免和主体竞争注意力
- 手势控制链路保持有效，但默认观感优先保证“球核 + 黄环”结构可读性

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

## 2026-05-20 — Phase 3: Gesture Control System

### Added
- `appStore` 扩展：`GestureType`（none/fist/open_palm/point）、`Vec3` 类型、
  `handPosition`、`fingertipPosition`、`forceStrength`、`gestureScore`、`handDetected`
- `GestureRecognizer.ts` 重写：
  - MediaPipe 归一化坐标 → Three.js 世界空间映射函数 `toWorldSpace()`
  - 手部中心计算（手腕 + 中指 MCP）+ 食指尖提取（landmark 8）
  - EMA 指数平滑（factor=0.35）消除手部抖动
  - `mapGesture()` 将 MediaPipe 手势名映射为内部 `GestureType`
  - 迟滞状态机（activate=4帧, release=10帧, maxLock=30帧）稳定手势输出
- `particle.vert` 三种力场：
  - **attractForce** — 向心力，逆平方 + soft core + 径向衰减
  - **repelForce** — 排斥力，冲击波环效果（高斯峰 + 近场衰减）
  - **pointForce** — 指尖紧密跟随，近距离粒子增亮
  - 呼吸振荡 `breathe` + 鼠标权重随手势强度递减

### Changed
- `ParticleUniverse.tsx`：
  - 新增 `uHandPos`、`uForceType`、`uForceStrength`、`uFingertipPos` 四个 uniform
  - 力场强度使用平滑 ref 渐变（激活 0.08、被动 0.04、衰减 0.05）
  - 手部/指尖坐标独立二次平滑（lerp factor 0.15）
- `useGestureRecognizer` 改为单手模式（`numHands: 1`），专注交互质量
- 移除 `setPhase('idle')` catch 块（识别器失败不再回退首页）

### Fixed
- MediaPipe WASM CDN 路径与安装版本不匹配（0.10.22→0.10.35）导致初始化失败
- 手势输出在 "None" 和高置信度手势之间快速抖动（迟滞状态机修复）

### Added
- `src/core/HandCursor.tsx` — 青色球体追踪手部位置，用于调试坐标映射
- `src/core/ReferenceRing.tsx` — 白色圆环参考系，标示粒子宇宙原点
- `src/ui/DebugOverlay.tsx` — 诊断面板：FPS、Hand 状态、Gesture 类型、Force 强度、坐标

### Design Notes
- 两段式平滑：识别器 EMA(0.35) → store → useFrame lerp(0.15) → shader
- 迟滞状态机防止 MediaPipe 的 "None" 类输出覆盖有效手势
- 力场与 curl noise 根据 `forceStrength` 混合，低强度时自然流动保持可见

## 2026-05-21 — Phase 5: Cinematic Visual System Rewrite

### Changed — Shaders (complete rewrite)
- **`particle.vert`** — 顶点着色器全面重构：
  - 新增双色调距离映射调色板 `distancePalette()` — 极光冰蓝(核心)→流沙金→琥珀焰(边缘)
  - 力场曲线从线性衰减改为高斯/指数曲线：`attractForce`(高斯捕获环+近距指数真空)、`repelForce`(高斯推挤环+近距爆炸推力)、`pointForce`(紧焦高斯追踪)
  - 手势激活时噪声压制从 `0.4` 提升到 `(1-forceOn²)×0.12`，粒子瞬间脱离自然流动排列成磁力线
  - `gl_PointSize` 引入 `exp(vForceIntensity×0.55)` 指数膨胀因子
  - Void Core 色彩也改为新的白→冰蓝→紫→暗色调色板
- **`particle.frag`** — 片元着色器全面重构：
  - 五层各向同性光晕：spike(exp(-d×10))→core(exp(-d×4.5))→glow→halo→feather
  - HDR 输出：受力时 `hdrBoost = 1.0 + vForceIntensity×4.5`，最高 5.5× 突破色彩天花板
  - 热核尖峰在受力时向纯白偏移，触发 Bloom 后处理
- **颜色哲学**：从 8 色随机霓虹调色板 → 统一的冰蓝到耀金距离渐变，`aColor` 属性仅保留微扰种子

### Added — Multi-Geometry Morphing System
- **`ParticleUniverse.tsx`** — 四种数学参数化粒子形态：
  - `generateSaturnRingPositions()` — 扁平同心环，内虚空+径向波形纹理
  - `generateDNAHelixPositions()` — 双轨螺旋+桥接粒子+沿Y轴上升
  - `generateFibonacciSpherePositions()` — 斐波那契球面+噪波扰动+多层壳
  - `generateGalaxyPositions()` — 增强版螺旋星系（保留）
- **形态渐变系统**：JS 侧 `morphRef` 管理缓入缓出（`easeInOutCubic`），~1.5s 完成几何过渡
- **`appStore` 新增**：`ParticleShape` 类型、`particleShape` 状态、`setParticleShape()` setter

### Changed — Interaction Dynamics
- **手势跟随插值提速**：`uHandPos` lerp 0.25→0.32, `uFingertipPos` 0.35→0.40, `uVoidCenter` 0.2→0.30
- **力场物理重写**：从线性衰减改为高斯铃曲线，产生"瞬间捕获"和"剧烈弹开"的戏剧性加速
- **噪声压制强化**：力量激活时粒子彻底脱离 curl noise，松开后如轻烟散开

### Changed — Post-Processing
- **Bloom 参数升级**：`luminanceThreshold` 0.15→0.08, `intensity` 2.5→3.0, `radius` 0.8→1.0
- 配合着色器 HDR 输出（最高 5.5×），产生"量子核爆"极光晕染效果

### Design Notes
- 着色器色彩逻辑从依赖 attribute 静态颜色 → 完全基于 `length(pos)` 动态计算
- 所有力场函数从 `1/(dist×k + c)` 改为 `exp(-(dist-opt)²/sigma²)` 高斯曲线
- 形态切换通过 JS 端 buffer lerp 而非着色器 morph target，保持 shader 简洁
- 后处理参数调整利用了 HDR 管线的全部能力：粒子值 >1.0 才触发 Bloom

### Added
- `appStore` 扩展：
  - `VoidCorePhase` 类型（idle/forming/active/exploding）
  - 双手追踪：`hand2Position`、`hand2GestureType`、`hand2Detected` 等
  - 虚空核心状态：`voidCenter`、`voidCoreStrength`、`voidExplosionTime`
- `GestureRecognizer.ts` 双手模式：
  - `numHands: 2`，独立迟滞状态机处理每只手
  - 触发条件：双手同时握拳（立即触发）或单手握拳 ≥ 2 秒
  - 爆炸触发：虚空核心激活状态下握拳变为张手
  - 中心点跟随双手中点或单手握拳位置

### Added (Shader — `particle.vert`)
- 虚空核心 uniform：`uVoidCenter`、`uVoidPhase`、`uVoidStrength`、`uVoidExplosionTime`
- **引力透镜** `lensingForce()` — 粒子围绕核心产生切向畸变，形成爱因斯坦环效果
- **涡流视界** `vortexForce()` — 粒子向内螺旋塌陷，吸积盘扁平化，事件视界极端引力
- **能量爆炸** `explosionForce()` — 径向爆发 + 扩展冲击波环，~3.5s 衰减
- **颜色演变** `voidCoreColor()` — 中心炽热白 → 电光蓝 → 深紫 → 暗蓝
- 主函数分支：`uForceType > 3.5` 时进入虚空核心物理，否则普通手势

### Changed
- `ParticleUniverse.tsx`：
  - 新增 4 个 uniform 映射 store 虚空核心状态
  - `smoothVoidStrengthRef` 控制虚空强度平滑渐变
  - 爆炸起始时间用 `uVoidExplosionTime` 捕获 R3F 时钟
- `DebugOverlay.tsx` — 新增 Hand2 状态和 Void Core 阶段/强度显示
- `particle.vert` 力场增强：attract(×3.3)、repel(×3.3)、point(×3.4)，覆盖范围扩大

### Removed
- `particle.vert` 中的红色 DEBUG 粒子颜色覆盖

### Design Notes
- 所有黑洞物理计算在 Vertex Shader 中数学完成，无 CPU 粒子遍历
- void center 通过 lerp(0.1) 平滑跟随手部，避免跳变
- 爆炸使用 sentinel 机制（`uVoidExplosionTime = -1` 表示未激活）
- 三种颜色区域通过 smoothstep 在距离域中自然过渡
