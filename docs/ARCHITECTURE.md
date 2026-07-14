# Architecture

## Overview

星尘引擎是一个 React 19 + Three.js 的实时手势粒子应用。MediaPipe 在摄像头帧到达时识别手势，Zustand 保存跟踪与交互状态，React Three Fiber 在独立的渲染循环中更新 shader uniform。

系统包含 8 个场景：

- 土星环 `saturn_ring`
- 双螺旋 `dna_helix`
- 四维立方 `hypercube`
- 引力奇点 `singularity`
- 能量球 `quantum_sphere`
- 能量纽结 `knot_torus`
- 黄金螺旋 `golden_spiral`
- 旋臂星系 `galaxy`

8 个场景均为正式产品场景，拥有独立的确定性几何生成器、R3F 系统、shader、镜头、Bloom、氛围和 HUD。`ParticleUniverse` 与 `SHAPE_GENERATORS` 继续保留作兼容实现，但不再由场景 profile 引用。

## Directory Structure

```text
src/
  core/
    Scene.tsx                 R3F Canvas、动态雾层和场景装配
    CinematicRig.tsx          Hero / Gallery 镜头
    Background.tsx            屏幕空间深空背景
    SpaceAtmosphere.tsx       按场景裁剪的氛围粒子
    PostProcessingRig.tsx     Bloom、亮度、对比度和暗角
    MouseTracker.tsx          指针状态同步
  hand/
    useCamera.ts              摄像头生命周期
    GestureRecognizer.ts      MediaPipe 初始化、推理和核心状态机
    gestureEngine.ts          手势映射、稳定器、位置滤波和双手尺度常量
  particles/
    ParticleUniverse.tsx      通用 10,000 粒子渲染器
    engine.ts                 通用 shader uniform 帧解析
    shapes/                   8 个兼容形态的目录和几何生成器
    saturn/                   18,000 粒子的专用土星系统
    dna/                      14,000 粒子的专用双螺旋系统
    hypercube/                14,400 粒子的专用四维立方系统
    singularity/              16,000 粒子的专用奇点系统
    quantum/                  15,000 粒子的专用能量球系统
    knot/                     15,600 粒子的专用能量纽结系统
    spiral/                   15,000 粒子的专用黄金螺旋系统
    galaxy/                   18,000 粒子的专用旋臂星系系统
  scenes/
    sceneProfiles.ts          渲染器、镜头、后处理、氛围和 HUD 配置中心
    sceneInteraction.ts       场景无关的交互帧解析
  shaders/
    particle.*                通用粒子 shader
    saturn*                   土星粒子、行星壳和能量环 shader
    dna*                      DNA 粒子与碱基横梁 shader
    hypercube.*               四维旋转、投影、传播与重组 shader
    singularity*              奇点粒子和光子环 shader
    quantum.*                 球壳、透镜、径向波与重组 shader
    knot.*                    三股纽结、曲线传播与拓扑重组 shader
    spiral.*                  黄金增长、尺度扫描与回卷 shader
    galaxy.*                  差速旋转、密度波与暗尘带 shader
    background.*              深空背景 shader
    atmosphere.*              氛围粒子 shader
  store/
    appStore.ts               应用、摄像头、双手、核心和场景状态
  ui/
    App.tsx                   根装配
    EnterScreen.tsx           进入和加载状态
    DebugOverlay.tsx          模式、摄像头和诊断控制
    SceneLibrary.tsx          8 场景目录与异步切换状态
    SceneHud.tsx              8 个正式场景的产品 HUD
    TrackingCursorOverlay.tsx 二维手部跟踪反馈
```

## Runtime Flow

```text
用户点击“进入体验”
  -> phase = loading
  -> useCamera 请求摄像头并创建隐藏 video
  -> GestureRecognizer 加载本地 MediaPipe WASM 和模型
  -> 新摄像头帧触发 recognizeForVideo（最高约 30 FPS）
  -> gestureEngine 稳定手势并过滤双手位置
  -> 单次 Zustand 快照提交 HandTrackingFrame
  -> GestureRecognizer 更新聚能/爆发状态机
  -> R3F 以显示帧率读取 store
  -> 当前 SceneProfile 选择渲染器、镜头、氛围和后处理
  -> 渲染器更新预分配 uniform、BufferAttribute 和对象引用
```

摄像头推理和 WebGL 渲染使用不同节奏。识别只处理新的 `video.currentTime`，渲染循环在两次识别之间平滑追踪位置和强度。

## Scene Profiles

`src/scenes/sceneProfiles.ts` 是场景配置的唯一入口。每个 `SceneProfile` 包含：

- `Renderer`：专用 React Three Fiber 组件
- `camera` / `heroCamera`：场景镜头和运动幅度
- `post`：Bloom、亮度、对比度和暗角偏置
- `atmosphere`：背景聚焦、粒子数量、能量和运动权重
- `hud`：场景控制文案和动态结构图

场景切换会重新挂载不同的专用渲染器，不尝试在场景之间进行 morph。8 个渲染器全部使用动态导入；场景库在悬停、聚焦或按下时预取目标模块，模块就绪后才提交场景切换。

`SHAPE_OPTIONS` 是唯一正式目录，`featuredOrder` 必填且固定为 1–8。UI 不维护派生 Lab 列表；移动端仅在目标模块成功加载并完成场景切换后关闭面板。

## Rendering Boundaries

### Compatibility Layer

`ParticleUniverse`、通用 shader 和 8 个旧形态生成器保留用于兼容形态数据。正式运行时全部由专用渲染器接管，profile 不再导入通用组件。

### SaturnSystem

- 18,000 粒子，拆分为行星与环带两个 `points` 层
- 预生成核心、表面、环带、碎屑和热点属性
- 独立行星壳、遮挡球和轨道能量线
- 专属 Bloom、Hero 镜头和轨道 HUD

### DnaSystem

- 14,000 粒子，包含两条骨架、碱基粒子、序列热点和复制种子
- 144 组独立碱基横梁，A-T 与 C-G 使用不同的配对色组
- GPU 负责链体收束、解旋、序列扫描和由激活位点向两端推进的复制波
- 复制种子平时隐藏在同一粒子缓冲中，复制阶段形成临时新链
- 专属 Bloom、纵向 Hero 镜头和序列 HUD

### HypercubeSystem

- 单个 `points` draw call 渲染 14,400 个粒子：10,240 个边粒子、2,560 个顶点粒子和 1,600 个内部维度尘埃
- 几何保存四维坐标、初始三维投影、角色、所属轴、种子、尺寸和边端点信息
- 16 个四维顶点与 32 条边由确定性生成器构造；旧的通用 `generateHypercube()` 继续保留作形态兼容
- shader 完成 XW/YW 旋转、四维透视投影、第四维尺度、节点传播、核心压缩、0.45 秒碎裂和 2.4 秒重组
- CPU 每帧只更新 uniform；进入指向时最多比较 16 个投影节点，不执行逐粒子物理
- 专属镜头、Bloom、低雾层、低氛围粒子和嵌套立方 HUD

### SingularitySystem

- 单个 `points` draw call 渲染 16,000 粒子
- 粒子类型为吸积盘、高温亮斑、引力晕和双向喷流
- 黑色事件视界先写入深度，再渲染前景吸积盘和光子环
- 专属 Bloom、低雾层、低氛围粒子和奇点 HUD

### QuantumSystem

- 单个 `points` draw call 渲染 15,000 粒子：3,000 核心、两层各 4,200 的 Fibonacci 球壳、2,400 轨道和 1,200 脉冲粒子
- shader 完成壳层压缩、交错轨道旋进、径向能量波、局部透镜、核心聚能和分阶段重组
- 双手跨度控制球壳尺度，中点控制结构倾角；单拳聚能严格乘以 `0.65`

### KnotSystem

- 单个 `points` draw call 渲染 15,600 粒子：12,600 三股轨迹、1,800 交叉热点和 1,200 传播火花
- 三股轨迹使用闭合的 `p=2, q=3` 环面纽结参数，进入指向时从 96 个曲线采样中选择最近参数
- shader 完成收紧、展开、沿曲线双向传播、交叉增亮、爆发和拓扑重组

### SpiralSystem

- 单个 `points` draw call 渲染 15,000 粒子：1,800 核心、10,400 四条伴生丝、1,400 增长前沿和 1,400 尺度尘埃
- 黄金对数半径每四分之一圈按 `φ` 增长，13 个尺度节点支持指向扫描
- shader 完成向种子回卷、增长前沿、双手定标、聚能、外爆和重组

### GalaxySystem

- 单个 `points` draw call 渲染 18,000 粒子：3,000 核球、3,000 盘面、8,400 双臂、2,400 尘埃带和 1,200 星晕
- 双对数旋臂相差 `π`，shader 按半径执行差速旋转、旋臂收紧、密度波和局部引力扰动
- 尘埃角色在同一 draw call 内使用普通混合输出暗带，不增加独立几何层

## Interaction Model

`resolveSceneInteractionFrame()` 将 store 状态解析为可复用的 `SceneInteractionFrame`：

- 主/副手手势与强度
- 手数量、双手激活和双拳状态
- 双手距离、跨度和压缩度
- 双手中点
- 单拳长按降级状态
- 核心阶段和核心强度

专用场景必须消费该交互帧，不应再次计算双手距离或重新解释核心阶段。

### Gesture Semantics

| 输入 | 通用语义 | 土星 | 双螺旋 | 四维立方 | 引力奇点 |
|---|---|---|---|---|---|
| 握拳 | 吸引/压缩 | 环带收缩、涡旋加速 | 半径收紧、螺距压缩 | 第四维折叠、旋转加速 | 吸积盘收缩、螺旋吸入 |
| 张掌 | 排斥/释放 | 环带扩张、冲击 | 双链解旋、碱基键减弱 | 第四维展开与 1.1 秒结构脉冲 | 盘面扩张、径向冲击 |
| 指向 | 局部牵引 | 指尖光球和牵引弧 | 锁定序列并发出双向扫描脉冲 | 锁定最近节点并沿相邻四边传播 | 局部引力透镜和牵引弧 |
| 双拳 | 聚能 | 中心核心与环带尺度 | 双手距离控制链体长度与扭转 | 双手距离与中点控制四维尺度和投影角 | 中心奇点与吸积盘尺度 |
| 稳定后张掌 | 爆发 | 中心轨道爆发 | 复制解旋波由激活位点向两端推进 | 确定性碎裂并沿原边重组 | 光子环、冲击波和喷流爆发 |

| 输入 | 能量球 | 能量纽结 | 黄金螺旋 | 旋臂星系 |
|---|---|---|---|---|
| 握拳 | 压缩双层球壳 | 收紧纽结并加速 | 向种子回卷 | 收紧旋臂并提高核心转速 |
| 张掌 | 释放径向能量波 | 展开三股轨迹 | 推进增长前沿 | 释放盘面密度波 |
| 指向 | 局部透镜牵引 | 选择最近曲线参数并传播 | 扫描最近尺度节点 | 局部引力扰动 |
| 双手 | 跨度控制壳层、中点控制倾角 | 跨度控制展幅、中点控制倾角 | 跨度控制尺度、中点控制倾角 | 跨度控制盘面、中点控制倾角与作用中心 |
| 稳定后张掌 | 壳层外爆并重组 | 拓扑外爆并重组 | 生长外爆并回归比例 | 旋臂外爆、冲击波和重组 |

### Core State Machine

```text
idle
  -> 双拳保持约 820ms，或单拳保持约 2200ms
forming
  -> 聚能完成
active
  -> 至少稳定 160ms 后检测到张掌
exploding
  -> 约 4200ms 衰减并复位到 idle
```

单拳长按保留为无双手识别时的降级入口。专用场景将其视觉强度限制为完整双手效果的约 65%。

## Performance Contracts

- Canvas DPR 限制为 `1.25`，关闭 WebGL 多重采样和重复抗锯齿
- shader 承担粒子变形，CPU 不逐粒子执行物理计算
- 几何、材质、TypedArray、Vector 和临时对象在挂载时预分配
- `useFrame` 内不创建几何、材质、数组或向量
- 高频 store 更新使用单次快照写入
- Bloom 仅捕获 HDR 亮部，避免整个场景过曝
- 专用场景拆分为独立异步 chunk，避免场景代码继续扩大初始入口
- 移动端 HUD 使用稳定尺寸，并避开顶部控制区

## Local HTTPS

摄像头需要安全上下文。Vite 使用 `.cert/key.pem` 和 `.cert/cert.pem` 启动 HTTPS；证书、本地 WASM 复制结果、构建产物和会话交接文件均不进入 Git。

## Verification

提交前至少运行：

```bash
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run lint
npm run build
git diff --check
```

Playwright 配置覆盖桌面、手机竖屏和手机横屏，并验证 8 场景目录、异步切换、S-01 至 S-08 HUD、布局、画布像素和截图基线。视觉检查通过 `PLAYWRIGHT_VISUAL=1` 显式启用；摄像头手势仍需浏览器实机覆盖短暂丢失、双手距离极值和关闭恢复。
