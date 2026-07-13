# 星尘引擎

基于 React、Three.js 和 MediaPipe 的实时手势粒子实验。摄像头识别握拳、张掌、指向及双手组合动作，在 GPU 粒子场景中驱动吸引、扩散、牵引、聚能和爆发。

## 当前能力

- 8 个可切换粒子场景，默认场景为土星环
- 土星环与引力奇点使用独立的几何、shader、镜头、Bloom 和 HUD
- 握拳、张掌、指向三种单手控制
- 双拳聚能、双手距离控制、单拳长按降级和稳定核心后的张掌爆发
- 展示/交互双视角、摄像头状态、跟踪指标和响应式场景 HUD
- WebGL 粒子渲染，Canvas DPR 上限为 1.25

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
npm run lint
npm run build
```

## 文档

- [架构说明](docs/ARCHITECTURE.md)
- [变更记录](docs/CHANGELOG.md)
