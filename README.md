# Threadsmith

[![License: MIT](https://img.shields.io/badge/license-MIT-111827.svg)](LICENSE)
![Node.js >= 22](https://img.shields.io/badge/node-%3E%3D22-3c873a.svg)
![npm >= 11](https://img.shields.io/badge/npm-%3E%3D11-cb3837.svg)
![stable v0.2.1 Windows Launcher Parity](https://img.shields.io/badge/stable-v0.2.1%20Windows%20Launcher%20Parity-f59e0b.svg)
![dev v0.3.0 Skill Orchestrator](https://img.shields.io/badge/dev-v0.3.0%20Skill%20Orchestrator-7c3aed.svg)
![Web control deck](https://img.shields.io/badge/surface-web%20control%20deck-2563eb.svg)

> A local control deck for AI coding projects.
> Keep project truth, workflow state, evidence, and acceptance out of the long chat fog.

Threadsmith 是一个面向 AI coding workflow 的 **local web control deck**。

它不替代 Codex Desktop、Codex CLI、Claude Code 或你的主聊天窗口。它站在旁边，读取项目里的 `.threadsmith` truth，把目标、阶段、执行、证据、路由和验收状态整理成一个可看的控制台。

如果你已经在用 vibe coding / agentic coding，Threadsmith 主要回答四个问题：

- 当前项目的真实目标、阶段和验收标准是什么？
- 下一步为什么是这一步，应该由哪个角色推进？
- 最近一次执行、证据、失败或 closeout 到底写回了吗？
- 哪些结论已经进入 `.threadsmith` truth，哪些还只是聊天里的临时想法？

## How It Fits Your Coding Loop

```mermaid
flowchart LR
  A["Conductor chat<br/>Codex / CLI / Claude"] --> B["Your project"]
  B --> C[".threadsmith truth"]
  C --> D["Threadsmith Control Deck"]
  D --> A
```

You still talk to your conductor. Threadsmith makes the durable project state visible.

当前稳定线：`v0.2.1 Windows Launcher Parity`，基于 `v0.2.0 Context OS` 增补 Windows PowerShell 启动支持。最新已发布稳定标签仍以 GitHub Releases 为准。

当前开发线：`v0.3.0 Harness Skill Orchestrator`，baseline 已合并到 `main`，但尚未 tag / GitHub Release，也尚未作为推荐稳定版发布。

## Features

- **Project front door**: choose a real project before entering the deck.
- **Truth-first workflow**: keep Project Brief, Current Phase, Acceptance State, roadmap, runs, events, and closeout in `.threadsmith`.
- **Single-screen supervision**: see command, roadmap, judgement, collaboration, and acceptance without digging through logs.
- **Context OS**: use Context Packet, Repo Map, Evidence Summary, Context Budget Ledger, and Role-specific Packets to reduce long-thread context drag.
- **Skill Orchestrator foundation**: discover local Codex skills, explain route health, and fall back to built-in mini protocols when external skills are unavailable.
- **Threadsmith skill protocol**: `$threadsmith` can sync, drive, continue, or recover from committed truth instead of replaying a huge chat history.
- **Windows and macOS launchers**: open the local web deck from PowerShell or shell launchers.
- **Local-first web app**: run it against your own project folder; no hosted backend is required.

![Threadsmith control deck screenshot](docs/assets/threadsmith-open-source-surface.png)

## Current Status

Latest stable release: `v0.2.1 Windows Launcher Parity`.

Active development line: `v0.3.0 Harness Skill Orchestrator`, merged to `main` as a candidate baseline but not tagged or published as the recommended public release.

Important boundary: v0.3.0 can discover and route local Codex skills as metadata, but it does **not** automatically execute arbitrary external skills or replace your conductor chat. The stable automatic execution path is still Codex-first.

Useful docs:

- Usage and LLM configuration: [docs/guides/usage-and-llm-configuration.md](docs/guides/usage-and-llm-configuration.md)
- Truth boundary: [docs/architecture/threadsmith-truth-boundary.md](docs/architecture/threadsmith-truth-boundary.md)
- Changelog: [CHANGELOG.md](CHANGELOG.md)
- v0.2.1 release notes: [docs/releases/threadsmith-v0.2.1.md](docs/releases/threadsmith-v0.2.1.md)
- v0.2.1 release checklist: [docs/checklists/release-v0.2.1.md](docs/checklists/release-v0.2.1.md)
- v0.2.0 release notes: [docs/releases/threadsmith-v0.2.0.md](docs/releases/threadsmith-v0.2.0.md)
- v0.3.0 internal notes: [docs/releases/threadsmith-v0.3.0.md](docs/releases/threadsmith-v0.3.0.md)

## 快速开始

### 1. 环境要求

- Node.js `22+`
- npm `11+`

### 2. 安装依赖

如果你是从 GitHub 第一次拉取：

```bash
git clone https://github.com/Teddy-creator/Threadsmith-control-deck.git
cd Threadsmith-control-deck
```

```bash
npm ci
```

### 3. 所有平台先跑起来

这条路径适合 macOS、Windows 和 Linux：

```bash
npm run start
```

然后打开：

```text
http://127.0.0.1:5173/?appHome=1
```

这里会进入 Threadsmith 前门。第一次使用时，建议先在页面里连接真实项目，再初始化或查看该项目的 `.threadsmith` truth。

如果你还没有真实项目可连，可以先打开 `项目与来源` 里的 demo mode：

- `Demo：已收口项目` 展示一条已经完成验收、closeout 和 handoff 的项目线
- `Demo：过期交接点` 展示 truth 已更新但 handoff packet 落后的风险态

Demo mode 只用于学习页面含义；正式工作时，请连接你的真实项目目录。

如果 `5173` 被占用，可以用 Vite 参数换端口：

```bash
npm run dev --workspace @threadsmith/control-deck -- --host 127.0.0.1 --port 5174
```

然后打开：

```text
http://127.0.0.1:5174/?appHome=1
```

### 4. Windows 快捷入口

PowerShell 用户可以用 Windows 启动器打开 Threadsmith：

```powershell
.\Launch-Threadsmith.ps1
```

第一次上手或想先决定今天进入哪个项目时，优先打开产品前门：

```powershell
.\Open-Threadsmith-App.ps1
```

如果你已经明确知道这轮只做某个项目：

```powershell
.\Launch-Threadsmith.ps1 "C:\path\to\your-project"
```

也可以使用环境变量：

```powershell
$env:THREADSMITH_PROJECT_ROOT = "C:\path\to\your-project"
.\Launch-Threadsmith.ps1
```

默认端口是 `5173`。如果端口被占用：

```powershell
$env:THREADSMITH_PORT = "5174"
.\Launch-Threadsmith.ps1
```

### 5. macOS 快捷入口

```bash
./Launch-Threadsmith.command
```

如果没有显式项目参数，这个命令会遵循你在 Threadsmith 里保存的 `日常打开方式`。第一次上手或想先决定今天从哪条线进入时，优先用下面这个 Threadsmith 前门更直观。

### 6. macOS 作为“产品前门”打开

```bash
./Open-Threadsmith-App.command
```

这会先进入 Threadsmith 前门，再从前门决定今天进入哪个真实项目。

### 7. macOS 显式直达某个项目

```bash
./Launch-Threadsmith.command "/path/to/your-project"
```

也可以使用环境变量：

```bash
THREADSMITH_PROJECT_ROOT="/path/to/your-project" ./Launch-Threadsmith.command
```

Linux 用户可以先用 `npm run start` 打开前门，再在页面里输入真实项目根目录。

## 典型使用路径

推荐日常路径：

1. 用 `Open-Threadsmith-App.ps1` 或 `Open-Threadsmith-App.command` 打开前门
2. 在 `项目与来源` 里确认今天要进入的真实项目
3. 需要时把当前项目设成 `默认进入`
4. 在首页和侧边工作台里确认真相、证据和下一步
5. 回到 `Codex Desktop`、`Codex CLI` 等 conductor surface 继续主要开发对话

如果你已经明确知道这轮只做某个项目，也可以直接使用：

```bash
./Launch-Threadsmith.command "/path/to/your-project"
```

Windows:

```powershell
.\Launch-Threadsmith.ps1 "C:\path\to\your-project"
```

### 使用 `$threadsmith` skill

如果你把 `codex/skills/threadsmith` 安装到本机 Codex skills 目录，可以在 Codex Desktop 中显式调用：

```bash
mkdir -p ~/.codex/skills/threadsmith
cp -R codex/skills/threadsmith/. ~/.codex/skills/threadsmith/
```

如果你已经手动改过本机全局 skill，覆盖前先备份：

```bash
cp -R ~/.codex/skills/threadsmith ~/.codex/skills/threadsmith.backup
```

```text
使用 $threadsmith，先同步当前项目状态，不开始实现，只汇报 current phase / acceptance / next best step。
```

推进时可以说：

```text
使用 $threadsmith，按当前 Project Brief / Current Phase / Acceptance State 推进下一刀。
```

如果目标、范围、Done when 和验证命令已经清楚，也可以要求连续推进：

```text
使用 $threadsmith，连续推进当前 phase，直到 accepted、paused、需要我决策、或遇到安全 stop condition。
```

CLI 侧可以使用 autopilot continuation：

```bash
npm run threadsmith:autopilot -- continue "/path/to/your-project"
```

`$threadsmith` v2 会优先读取 `.threadsmith` committed truth；如果项目已经生成 Context Packet 和 Role-specific Packets，它会用这些 packet 压缩工作上下文，但不会让 packet 覆盖 committed truth。

## 第一次连接真实项目

进入后优先看 `项目与来源` 工作台：

- 如果是第一次使用，先看 `首次上手引导`
- 如果当前还是示例来源，切换到 `自定义项目`
- 输入项目根目录并点击 `连接项目`

如果项目还没有 `.threadsmith`：

- 点击 `初始化 Threadsmith`
- Threadsmith 会创建最小状态文件
- 初始化完成后，再回到该项目继续推进

## Threadsmith 怎么工作

Threadsmith 的核心边界是：

- 主聊天面负责对话、指挥和代码推进
- Threadsmith 负责监督、展示、解释和对齐 truth

```mermaid
flowchart LR
  A["Conductor Surface<br/>Codex / Claude / CLI"] --> B["真实项目目录<br/>含 .threadsmith"]
  B --> C["Threadsmith packages<br/>domain / fs-bridge / runtime / orchestrator"]
  C --> D["Control Deck Web App"]
  D --> A
```

更具体地说：

- `.threadsmith` 保存项目真相、阶段、验收、事件和运行记录
- `packages/domain` 定义状态对象和 schema
- `packages/fs-bridge` 负责读写项目 truth
- `packages/runtime` 负责把底层 truth 组装成可展示的监督状态
- `packages/orchestrator` 负责自动执行桥接与运行编排
- `apps/control-deck` 提供你实际看到的 UI

## 当前默认路由

当前稳定线和 v0.3.0 内部开发线都仍然是 `Codex-only`：

- `planner / executor / reviewer / verifier / closeout` 的默认 provider 都是 `codex`
- 主 conductor surface 的默认值是 `codex-desktop`
- 当前自动执行桥真正稳定支持的是 `Codex` 路径，尤其是 executor run
- 项目工作台里的 provider routing 主要用于把项目当前 truth 讲清楚，并为后续扩展预留；它不代表 `multi-provider` 已经是当前交付承诺

## Codex / `$threadsmith` 接入边界

Threadsmith 的页面负责显示和配置，真正的主对话仍然发生在你的 conductor surface，例如 Codex Desktop 或 Codex CLI。

如果你安装了 Codex skill，可以在重要边界显式调用 `$threadsmith`：

```text
使用 $threadsmith，更新当前项目状态，不开始实现，只同步 truth 并汇报 current phase / acceptance / next best step。
```

或者：

```text
使用 $threadsmith，按当前 Project Brief / Current Phase / Acceptance State 推进下一刀。
```

不需要每句话都调用 `$threadsmith`。更推荐在阶段开始、阶段结束、验收变化、方向改变、发现 blocker、closeout 或准备提交时写回 `.threadsmith`。

## 状态刷新与 truth 来源

Threadsmith 会自动轮询当前项目，也可以用顶部的 `刷新状态` 立即重读 `.threadsmith`。

如果页面看起来没更新，优先检查三件事：

- 顶部显示的项目是否是你真正想看的项目
- `刷新状态` 后的上次读取时间是否变化
- conductor 是否已经把新的 phase、acceptance、run 或 evidence 写回 `.threadsmith`

页面不会凭空知道聊天线程里的临时讨论。只有写回项目 truth 的内容，才会稳定出现在 control deck 里。

如果你没有安装 skill，Threadsmith 仍然可以作为本地 control deck 使用：连接项目、初始化 `.threadsmith`、查看 truth、刷新状态、检查证据和验收位置。只是 AI conductor 不会自动帮你写回每次任务边界。

## 仓库结构

```text
apps/control-deck/   Web control deck 与本地 bridge server
packages/domain/     共享 schema 与核心状态对象
packages/runtime/    监督状态推导与 UI-facing selectors
packages/fs-bridge/  .threadsmith 文件读写与 truth bridge
packages/orchestrator/ 自动执行与 bridge 编排
examples/            示例项目状态
tests/               E2E 与 smoke tests
docs/                面向用户和发布的文档
```

## 开发与验证

常用命令：

```bash
npm run start
npm run dev
npm run test
npm run build
npm run test:e2e
npm run verify:release
npm run smoke:self-host
```

默认的 `npm run smoke:self-host` 会先把当前仓库的 committed truth 快照复制到隔离的 runtime workspace，再在那里跑一轮真实 executor smoke，这样不会默认把主仓库 `.threadsmith` 的 committed truth 再弄脏。

如果你想显式对当前项目根目录运行 smoke，可使用：

```bash
npm run smoke:self-host -- .
```

如果你只想打开产品面而不是进入纯开发模式，也可以继续使用：

```bash
./Launch-Threadsmith.command
./Open-Threadsmith-App.command
```

## 产品边界

Threadsmith 当前优先是一个可长期使用、可安装、可公开发布的 web control deck。

当前稳定线和 v0.3.0 内部开发线明确不追求：

- 原生桌面壳
- 完整替代主聊天入口
- 在这一步就覆盖所有 provider 的全自动执行
- 把 provider routing 界面误读成“非 Codex provider 已正式可用”

## 贡献

欢迎围绕以下方向贡献：

- workflow 监督与 truth surface
- onboarding / install / repo surface
- execution bridge、route truth 与 operator guidance
- tests、smoke、release hygiene

## 开源入口

如果你想参与反馈或提交改动，优先使用仓库里的标准入口：

- 提交 bug：Issues 里的 `Bug report`
- 提需求：Issues 里的 `Feature request`
- 发 PR：仓库里的 Pull Request template
- 涉及安全问题：优先查看 [SECURITY.md](SECURITY.md)

如果你只是想先看 Threadsmith 是否适合自己，最直接的方式还是先读 README、再跑一次 `Launch-Threadsmith.command` 或 `Open-Threadsmith-App.command`。

参与方式见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## License

本仓库采用 [MIT License](LICENSE)。
