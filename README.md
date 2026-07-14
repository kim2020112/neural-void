# 星尘引擎

基于 React、Three.js 和 MediaPipe 的实时手势粒子实验。摄像头识别握拳、张掌、指向及双手组合动作，在 GPU 粒子场景中驱动吸引、扩散、牵引、聚能和爆发。

## 当前能力

- 8 个正式粒子场景，全部使用独立几何、shader、镜头、Bloom 和 HUD，默认场景为土星环
- 能量球由 15,000 粒子构成核心、双层 Fibonacci 球壳、交错轨道和径向能量波
- 能量纽结由 15,600 粒子构成三股 `p=2, q=3` 闭合轨迹、交叉热点和传播火花
- 黄金螺旋由 15,000 粒子构成四条黄金比例伴生丝、13 个尺度节点和增长前沿
- 旋臂星系由 18,000 粒子构成核球、盘面、双对数旋臂、暗尘带和星晕
- 双螺旋支持链体收束、掌心解旋、序列扫描、双手拉伸和复制解旋波
- 四维立方使用 14,400 个粒子构成 16 个节点与 32 条四维边，支持维度折叠、展开脉冲、节点传播与碎裂重组
- 握拳、张掌、指向三种单手控制
- 双拳聚能、双手距离控制、单拳长按降级和稳定核心后的张掌爆发
- 展示/交互双视角、摄像头状态、跟踪指标和响应式场景 HUD
- WebGL 粒子渲染，Canvas DPR 上限为 1.25
- 8 个专用场景均按需加载，切换前预取对应渲染模块
- 场景库以 2 列网格展示全部 8 个场景，移动端仅在成功切换后自动收起

## 本地运行

需要 Node.js、npm、OpenSSL，以及支持 WebGL 2 和 `getUserMedia` 的现代浏览器。

首次运行先生成本地 HTTPS 证书：

```powershell
New-Item -ItemType Directory -Force .cert
openssl req -x509 -newkey rsa:2048 -nodes -keyout .cert/key.pem -out .cert/cert.pem -days 365 -subj "/CN=localhost"
```

安装依赖并启动：

```bash
npm install
npm run dev
```

打开 `https://localhost:5173`，接受本地证书提示，点击“进入体验”并授权摄像头。端口被占用时以 Vite 输出的实际 HTTPS 地址为准。

## 验证

```bash
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run lint
npm run build
git diff --check
```

Playwright 功能基线使用本地 HTTPS。首次运行先安装 Chromium；也可通过 `PLAYWRIGHT_CHANNEL=msedge` 使用本机 Edge。视觉像素和截图检查为显式 opt-in：

```powershell
npx playwright install chromium
$env:PLAYWRIGHT_VISUAL='1'
npm run test:e2e -- --update-snapshots
```

## 文档

- [架构说明](docs/ARCHITECTURE.md)
- [变更记录](docs/CHANGELOG.md)
