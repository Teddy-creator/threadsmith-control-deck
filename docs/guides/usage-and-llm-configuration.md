# Threadsmith Usage and LLM Configuration Guide

Threadsmith 是一个本地运行的 web control deck。它负责展示和维护项目的 workflow truth，不负责替代你和 AI 的主聊天入口。

当前 `v0.1.1` 推荐搭配：

- `Codex Desktop` 作为主要 conductor surface
- `Codex CLI` 作为自动执行桥的默认 executor
- `.threadsmith/` 作为项目 truth、阶段、证据和验收状态的持久层

## 1. 安装

环境要求：

- Node.js `22+`
- npm `11+`

安装依赖：

```bash
git clone https://github.com/Teddy-creator/Threadsmith-control-deck.git
cd Threadsmith-control-deck
npm ci
```

## 2. 启动方式

### 所有平台：用 npm 启动

macOS、Windows 和 Linux 都可以先用这条路径跑起来：

```bash
npm run start
```

然后在浏览器打开：

```text
http://127.0.0.1:5173/?appHome=1
```

这个地址会进入 Threadsmith 前门。第一次使用时，建议从前门连接真实项目，而不是手写很长的 URL。

如果端口被占用，可以直接使用 Vite 参数换端口：

```bash
npm run dev --workspace @threadsmith/control-deck -- --host 127.0.0.1 --port 5174
```

然后打开：

```text
http://127.0.0.1:5174/?appHome=1
```

### macOS：打开 Threadsmith 前门

如果你想先选择今天要看的项目：

```bash
./Open-Threadsmith-App.command
```

这个入口会进入 Threadsmith 的 front door，适合第一次使用、切换项目、或确认默认打开方式。

### macOS：按默认设置打开

```bash
./Launch-Threadsmith.command
```

如果你已经在产品里设置过默认项目，它会优先进入默认项目；否则会回到前门。

### macOS：直达某个真实项目

```bash
./Launch-Threadsmith.command "/path/to/your-project"
```

也可以用环境变量：

```bash
THREADSMITH_PROJECT_ROOT="/path/to/your-project" ./Launch-Threadsmith.command
```

### macOS：换端口

默认端口是 `5173`。如果端口被占用：

```bash
THREADSMITH_PORT=5174 ./Launch-Threadsmith.command
```

## 3. 第一次连接项目

1. 打开 `Open-Threadsmith-App.command`。
2. 进入 `项目与来源`。
3. 选择或输入真实项目根目录。
4. 如果项目还没有 `.threadsmith/`，点击初始化。
5. 初始化后回到首页，确认 Project Brief、Current Phase、Acceptance State 已出现。

Threadsmith 的关键不是“看到页面”，而是让项目目录里出现一套可持续更新的 truth 文件。

如果你还没有真实项目可以连接，可以先从 `项目与来源` 打开 demo mode：

- `Demo：已收口项目`：展示一条已经验收、closeout、handoff 的稳定项目线
- `Demo：过期交接点`：展示项目 truth 已经更新，但 handoff packet 落后的风险态

Demo mode 适合学习首页五块和四个工作台分别表达什么；正式开发时，请切回 `自定义项目` 并连接真实项目目录。

## 4. 日常工作流

推荐的工作方式是：

1. 打开 Threadsmith，确认当前项目、阶段、验收和下一步。
2. 回到 Codex Desktop 或 Codex CLI，继续和 conductor 对话。
3. 让 conductor 在重要边界写回 `.threadsmith/`。
4. 回到 Threadsmith 点刷新，查看 truth、run、evidence 和 acceptance 是否更新。
5. 如果验收通过，再进入 closeout / commit / PR。

如果你安装了 Threadsmith skill，可以在 Codex Desktop 里显式调用：

```text
使用 $threadsmith，更新当前项目状态，不开始实现，只同步 truth 并汇报 current phase / acceptance / next best step。
```

或者推进一轮：

```text
使用 $threadsmith，按当前 Project Brief / Current Phase / Acceptance State 推进下一刀。
```

不建议把每一句普通聊天都强行写回 `.threadsmith/`。更推荐在这些边界写回：

- phase 开始或结束
- task / bug / closeout 开始或结束
- 验收状态变化
- 用户明确改变方向
- 发现新的 blocker 或 risk
- 准备提交或发布

如果你没有安装 skill，也可以正常使用 Threadsmith 页面。区别是：页面能显示和编辑项目 truth，但 AI conductor 不会自动在任务边界帮你写回 `.threadsmith/`；这时你需要在 Codex / CLI 对话里明确要求它同步 truth，或者在页面里手动刷新和检查状态。

### 什么时候只正常聊天，什么时候用 `$threadsmith`

只正常和 Codex / CLI 对话：

- 讨论想法、问代码细节、临时探索方向
- 还没有形成稳定 task / phase / acceptance 变更
- 只是要解释当前页面或当前代码

建议调用 `$threadsmith` 或明确要求同步 truth：

- 开始或结束一个 phase
- 改变当前目标、范围、non-goal、done-when
- 验收状态变化
- 出现 blocker、risk、失败验证或修复结论
- closeout、提交、PR、release 前

Threadsmith 不适合记录每一句聊天流水。它应该保存 durable truth，而不是保存临时想法。

## 5. `.threadsmith` Truth 是什么

项目根目录下的 `.threadsmith/` 里有两类信息。

Committed truth：

- `.threadsmith/project-brief.json`
- `.threadsmith/project-status.json`
- `.threadsmith/project-roadmap.json`
- `.threadsmith/current-phase.json`
- `.threadsmith/active-work.json`
- `.threadsmith/acceptance-state.json`
- `.threadsmith/project-supervision.json`
- `.threadsmith/provider-routing.json`
- `.threadsmith/preferences.json`
- `.threadsmith/command-bridge.json`

Runtime artifacts：

- `.threadsmith/runs/`
- `.threadsmith/action-queue.ndjson`
- `.threadsmith/events.ndjson`
- `.threadsmith/evidence/`
- `.threadsmith/packets/`
- `.threadsmith/closeouts/`

发布或提交前，优先提交 committed truth；runtime artifacts 通常只作为本地证据，不应默认进入公开仓库。

更完整的边界说明见 [Threadsmith Truth Boundary](../architecture/threadsmith-truth-boundary.md)。

## 6. LLM / Provider 配置

当前公开版本是 `Codex-only` 稳定主线。

默认角色路由：

| Role | Default provider | Current release status |
| --- | --- | --- |
| planner | `codex` | supported as truth / workflow role |
| executor | `codex` | stable automatic path |
| reviewer | `codex` | supported as workflow role |
| verifier | `codex` | supported as workflow role |
| closeout | `codex` | supported as workflow role |
| conductor surface | `codex-desktop` | recommended human-facing chat surface |

Provider routing 存在于：

```text
.threadsmith/provider-routing.json
```

它的作用是让项目明确“每个角色现在由谁承担”。当前 UI 可以展示和记录这些路由，但 `v0.1.1` 不承诺非 Codex provider 的全自动执行已经完成。

## 7. Codex CLI 配置

如果你要使用自动执行桥，确保本机能运行 Codex CLI。

可以用环境变量覆盖 Codex binary：

```bash
THREADSMITH_CODEX_BIN="/path/to/codex" npm run threadsmith:autopilot -- start "/path/to/your-project"
```

可以设置 reasoning effort：

```bash
THREADSMITH_CODEX_REASONING_EFFORT=medium npm run threadsmith:autopilot -- start "/path/to/your-project"
```

常用命令：

```bash
npm run threadsmith:autopilot -- start "/path/to/your-project"
npm run threadsmith:autopilot -- resume "/path/to/your-project"
```

如果项目还没有足够 truth，autopilot 会先尝试 bootstrap；如果无法安全推断，会暂停并要求补充信息，而不是凭空 invent 一个 phase。

## 8. Claude / Gemini / Other Providers

Threadsmith 的架构为 multi-provider 预留了 provider routing 和 role boundary，但当前 public `v0.1.1` 不把 fully automated multi-provider execution 作为交付承诺。

这意味着：

- 你可以在 truth 中记录“未来希望 Claude 做 planner / Codex 做 executor”。
- 当前稳定自动执行路径仍然是 Codex。
- 非 Codex provider adapter / routing 后续会作为独立版本推进。

## 9. 验证

开发或发布前常用验证：

```bash
npm run test
npm run build
npm run test:e2e
npm run verify:launchers
```

发布前建议再跑：

```bash
npm run smoke:self-host
npm run verify:release
```

`npm run smoke:self-host` 默认会在隔离 runtime workspace 里运行，避免把当前项目 truth 弄脏。

## 10. 常见问题

### 页面看起来没更新

先确认你连接的是正确项目根目录，然后点击刷新状态。顶部会显示最近一次成功读取时间；`项目与来源` 会显示当前信息来源。如果 conductor 没有写回 `.threadsmith/`，Threadsmith 只能展示旧 truth。

### 端口被占用

macOS `.command` 可以这样换端口：

```bash
THREADSMITH_PORT=5174 ./Launch-Threadsmith.command
```

跨平台 npm 启动可以这样换端口：

```bash
npm run dev --workspace @threadsmith/control-deck -- --host 127.0.0.1 --port 5174
```

### 我需要每句话都用 `$threadsmith` 吗

不需要。Threadsmith 更适合在 workflow 边界写回 truth，而不是记录所有聊天流水。普通讨论可以留在 conductor surface，阶段、验收、方向变化和 closeout 再写回。

### Threadsmith 会直接替代 Codex Desktop 吗

不会。当前产品边界是 control deck：展示、配置、监督、校准。主要对话和指挥仍然发生在 Codex Desktop / Codex CLI 等 conductor surface。
