# Changelog

## 2026-07-13 — 四旗舰场景库与专用四维立方

### Added

- 场景目录新增 `featured` / `lab` 分层和固定旗舰顺序：土星环、双螺旋、四维立方、引力奇点
- 从运行 HUD 抽出响应式场景库：2×2 旗舰网格、Lab 折叠区、移动端成功切换后收起、加载失败保留原场景
- 新增 14,400 粒子的专用四维立方系统，包含 16 个节点、32 条四维边和内部维度尘埃
- 新增四维几何确定性测试、目录测试、Vitest 基线与 Playwright 三视口功能/视觉用例

### Changed

- 四个旗舰 HUD 编号统一为 01–04，新增 `S-03 / DIMENSIONAL LATTICE`
- 四维立方改为独立动态 chunk，XW/YW 旋转、透视投影、传播、碎裂和重组全部在 shader 中完成
- 旗舰 HUD 隐藏重复的顶部跟踪提示，移动端 HUD 下移避开常驻控制条
- 所有场景库与常驻控制按钮提供至少 44px 触控区域、键盘焦点和 ARIA 状态

### Verification

- Vitest：2 个测试文件、6 个用例通过
- `npx tsc --noEmit -p tsconfig.app.json`
- `npm run lint`
- `npm run build`
- Hypercube 独立 chunk：约 4.35 kB gzip；主入口原始增量约 4.39 kB
- Playwright 单个桌面功能用例通过；用户浏览器手动验收确认当前四旗舰版本基本可行

## 2026-07-13 — 专用双螺旋场景与场景分包

### Added

- 新增 14,000 粒子的专用双螺旋系统：双链骨架、配对碱基、序列热点、复制种子和 144 组碱基横梁
- 双螺旋支持握拳收束、掌心解旋、指尖序列扫描、双手尺度控制、单拳降级和复制解旋波
- 新增双螺旋专属镜头、Bloom、低干扰氛围、交互文案和 DNA HUD 图示

### Changed

- 土星、双螺旋和引力奇点改为按场景动态导入，并在场景按钮悬停、聚焦和按下时预取
- 场景切换等待目标模块就绪，加载失败保留当前场景并提供重试状态
- 场景 profile 统一管理雾层密度，避免在 Canvas 装配层继续增加场景判断

### Verification

- `npx tsc --noEmit -p tsconfig.app.json`
- `npm run lint`
- `npm run build`
- 浏览器手动检查：双螺旋基础效果可行

## 2026-07-13 — 专用土星与引力奇点场景

### Added

- 新增场景配置中心与统一交互帧，集中管理渲染器、镜头、后处理、氛围和 HUD
- 新增 18,000 粒子的专用土星系统：球体、分层环带、热点、轨道能量线和指尖牵引光效
- 新增 16,000 粒子的专用引力奇点系统：吸积盘、高温亮斑、引力晕、双向喷流、事件视界和光子环
- 奇点支持握拳收缩、张掌冲击、指尖引力透镜、双拳压缩、单拳降级与中心爆发
- 土星和奇点获得独立 HUD 图示、交互文案、Hero 镜头和 Bloom 参数
- 新增二维手部跟踪光标与场景库运行态控制

### Changed

- 双手距离、核心阶段和单拳降级统一由 `resolveSceneInteractionFrame()` 解析，专用场景不再重复计算
- 摄像头与 MediaPipe 初始化改为分阶段状态，使用本地 WASM、时间型手势稳定和自适应位置滤波
- 场景相机、背景、氛围、雾层和后处理改为按场景 profile 驱动
- 默认场景恢复为土星环；移动端 HUD 状态条避开顶部控制区
- 项目文档收敛为根 README、架构说明和变更记录，清理本地抓取与参考资料

### Verification

- `npx tsc --noEmit -p tsconfig.app.json`
- `npm run lint`
- `npm run build`

## 2026-07-11 — 中文文案与视觉层级收敛

- 产品名称统一为“星尘引擎”，启动页与运行状态改用动作和结果导向的中文表达
- “虚空核心、神经虚空、成核”等生硬术语替换为“能量汇聚、聚合体、粒子聚拢”等直观描述
- 默认形态改名为“能量球”，粒子分布收紧到致密中心、主体球壳和少量装饰轨道
- 移除与二维跟踪光标重复的三维手部球和大型参考环，避免反馈图形遮挡主体
- 环境粒子从 900 降为 520 并降低亮度，使背景、主体和手势反馈形成明确层级

## 2026-07-10 — Visual Readability / Performance Pass

### Fixed
- 背景着色器改为屏幕空间全屏绘制，不再被动态相机拍成中央矩形
- 默认结构从土星环切换为更适合交互测试的量子球，主体轮廓更容易辨认

### Performance
- 主粒子数从 20,000 下调到 10,000，并适当放大单粒子尺寸保持亮度和结构密度
- 氛围粒子从 3,600 下调到 900
- Canvas 最大 DPR 从 2 下调到 1.25，并关闭重复的 WebGL 抗锯齿
- 后处理关闭色差、噪点和 EffectComposer 多重采样，只保留 Bloom、对比度和暗角
- 手势推理上限从 30 FPS 调整为 24 FPS；电影状态同步降为 10 FPS
- MediaPipe 改为启动后动态加载，首屏主包不再包含完整手势识别运行时
- 移除 Google Fonts 网络依赖，优先使用本地中文系统字体

### Added
- 新增高对比度二维手势光标，显示主手/副手、手势名称和置信度
- 顶部常驻中文提示，明确显示未检测、已锁定和当前手势状态

### Changed
- 启动页、加载状态、手势说明和页面标题统一改为中文

## 2026-07-10 — Phase 1 Input Responsiveness Refactor

### Changed
- 摄像头申请统一交由 `useCamera` 管理，启动页不再重复调用 `getUserMedia`
- 启动状态细分为摄像头连接、模型加载、输入预热、就绪和错误
- MediaPipe WASM 改为从 `public/wasm` 本地加载；`postinstall` 改为跨平台 Node 复制命令
- 手势识别仅处理新的摄像头帧，并限制为最高约 30 FPS，避免与 60 FPS 渲染循环重复争抢主线程
- 帧数迟滞替换为时间型手势稳定器，不再因设备帧率不同而改变激活/释放时长
- 固定 EMA 替换为速度自适应位置滤波：慢速时抑制抖动，快速移动时提高跟随速度
- 主手优先使用 handedness 保持身份，短时识别丢失增加 120ms 容错
- 单帧手势数据改为一次 Zustand 快照提交，移除逐字段连续写入
- 手部光标、指尖和力场插值提速，力度改为快速进入、较快释放

### Fixed
- 修复检测到手但手势为 `none` 时仍进入吸引力分支的问题
- 修复启动按钮可重复申请摄像头以及模型尚未就绪就进入运行态的问题

### Added
- HUD 详细模式增加识别 FPS、单帧识别耗时和 GPU/CPU delegate 指标
- GPU delegate 初始化失败时自动回退 CPU

## 2026-07-12 — Runtime HUD / Gallery / Saturn Ring Foundation

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
