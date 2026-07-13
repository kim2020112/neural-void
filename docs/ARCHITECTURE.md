# Architecture

## Overview

星尘引擎是一个 React 19 + Three.js 的实时手势粒子应用。MediaPipe 在摄像头帧到达时识别手势，Zustand 保存跟踪与交互状态，React Three Fiber 在独立的渲染循环中更新 shader uniform。

系统包含 8 个场景：

- 土星环 `saturn_ring`
- 能量球 `quantum_sphere`
- 能量纽结 `knot_torus`
- 双螺旋 `dna_helix`
- 黄金螺旋 `golden_spiral`
- 四维立方 `hypercube`
- 旋臂星系 `galaxy`
- 引力奇点 `singularity`

土星环和引力奇点拥有专用渲染器。其余场景继续共享通用 `ParticleUniverse` 和形态注册表。

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
    singularity/              16,000 粒子的专用奇点系统
  scenes/
    sceneProfiles.ts          渲染器、镜头、后处理、氛围和 HUD 配置中心
    sceneInteraction.ts       场景无关的交互帧解析
  shaders/
    particle.*                通用粒子 shader
    saturn*                   土星粒子、行星壳和能量环 shader
    singularity*              奇点粒子和光子环 shader
    background.*              深空背景 shader
    atmosphere.*              氛围粒子 shader
  store/
    appStore.ts               应用、摄像头、双手、核心和场景状态
  ui/
    App.tsx                   根装配
    EnterScreen.tsx           进入和加载状态
    DebugOverlay.tsx          场景库、模式、摄像头和诊断控制
    SceneHud.tsx              土星/奇点产品 HUD
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

- `Renderer`：通用或专用 React Three Fiber 组件
- `camera` / `heroCamera`：场景镜头和运动幅度
- `post`：Bloom、亮度、对比度和暗角偏置
- `atmosphere`：背景聚焦、粒子数量、能量和运动权重
- `hud`：仅完整产品场景使用的控制文案和结构图

场景切换会重新挂载不同的专用渲染器，不尝试在通用粒子和专用几何之间进行 morph。

## Rendering Boundaries

### ParticleUniverse

通用场景共享 10,000 粒子、通用 shader 和形态缓动。旧的土星和奇点形态生成器仍保留在注册表中，用于兼容形态数据，但运行时由专用渲染器接管。

### SaturnSystem

- 18,000 粒子，拆分为行星与环带两个 `points` 层
- 预生成核心、表面、环带、碎屑和热点属性
- 独立行星壳、遮挡球和轨道能量线
- 专属 Bloom、Hero 镜头和轨道 HUD

### SingularitySystem

- 单个 `points` draw call 渲染 16,000 粒子
- 粒子类型为吸积盘、高温亮斑、引力晕和双向喷流
- 黑色事件视界先写入深度，再渲染前景吸积盘和光子环
- 专属 Bloom、低雾层、低氛围粒子和奇点 HUD

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

| 输入 | 通用语义 | 土星 | 引力奇点 |
|---|---|---|---|
| 握拳 | 吸引/压缩 | 环带收缩、涡旋加速 | 吸积盘收缩、螺旋吸入 |
| 张掌 | 排斥/释放 | 环带扩张、冲击 | 盘面扩张、径向冲击 |
| 指向 | 局部牵引 | 指尖光球和牵引弧 | 局部引力透镜和牵引弧 |
| 双拳 | 聚能 | 中心核心与环带尺度 | 中心奇点与吸积盘尺度 |
| 稳定后张掌 | 爆发 | 中心轨道爆发 | 光子环、冲击波和喷流爆发 |

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
- 移动端 HUD 使用稳定尺寸，并避开顶部控制区

## Local HTTPS

摄像头需要安全上下文。Vite 使用 `.cert/key.pem` 和 `.cert/cert.pem` 启动 HTTPS；证书、本地 WASM 复制结果、构建产物和会话交接文件均不进入 Git。

## Verification

提交前至少运行：

```bash
npx tsc --noEmit -p tsconfig.app.json
npm run lint
npm run build
```

摄像头与 WebGL 视觉仍需在浏览器中手动检查，重点覆盖场景双向切换、手势短暂丢失、双手距离极值以及桌面/手机竖屏/手机横屏布局。
