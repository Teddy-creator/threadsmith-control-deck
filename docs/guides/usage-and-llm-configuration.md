# Threadsmith Usage and LLM Configuration Guide

Threadsmith 是一个本地运行的 web control deck。它负责展示和维护项目的 workflow truth，不负责替代你和 AI 的主聊天入口。

当前最新稳定线是 `v0.2.1 Windows Launcher Parity`，基于 `v0.2.0 Context OS` 增补 Windows PowerShell 启动支持。当前内部开发线是 `v0.3.0 Harness Skill Orchestrator`，baseline 已合并到 `main`，但尚未 tag / GitHub Release，也尚未作为推荐稳定版发布。

最简单的心智模型是：

- 在 Codex Desktop / Codex CLI / Claude Code 里继续主要开发对话。
- 在 Threadsmith 页面里看项目状态、证据、路由、验收和恢复建议。
- 在重要边界用 `$threadsmith` 或明确指令把 durable truth 写回 `.threadsmith/`。

当前稳定自动执行路径仍然是 Codex-first。`v0.3.0` 会发现和路由本地 Codex skills，但这里的 route 是可解释的 workflow metadata，不等于自动执行任意外部 skill。

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

### 安装或升级 `$threadsmith` skill

如果你希望 Codex Desktop 能显式调用 `$threadsmith`，把仓库里的 skill 复制到本机 Codex skills 目录：

```bash
mkdir -p ~/.codex/skills/threadsmith
cp -R codex/skills/threadsmith/. ~/.codex/skills/threadsmith/
```

如果你已经手动改过全局 skill，覆盖前先备份：

```bash
cp -R ~/.codex/skills/threadsmith ~/.codex/skills/threadsmith.backup
```

然后重启 Codex Desktop 或开启新会话，让 skill 列表重新加载。

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

### Windows：打开 Threadsmith 前门

PowerShell 用户可以用 Windows 启动器打开产品前门：

```powershell
.\Open-Threadsmith-App.ps1
```

这个入口会进入 Threadsmith 的 front door，适合第一次使用、切换项目、或确认默认打开方式。

### Windows：按默认设置打开

```powershell
.\Launch-Threadsmith.ps1
```

如果你已经在产品里设置过默认项目，它会优先进入默认项目；否则会回到前门。

### Windows：直达某个真实项目

```powershell
.\Launch-Threadsmith.ps1 "C:\path\to\your-project"
```

也可以用环境变量：

```powershell
$env:THREADSMITH_PROJECT_ROOT = "C:\path\to\your-project"
.\Launch-Threadsmith.ps1
```

### Windows：换端口

默认端口是 `5173`。如果端口被占用：

```powershell
$env:THREADSMITH_PORT = "5174"
.\Launch-Threadsmith.ps1
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

1. 打开 `Open-Threadsmith-App.ps1`、`Open-Threadsmith-App.command`，或运行 `npm run start`。
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

推荐的日常工作方式是：

1. 打开 Threadsmith，确认现在连接的是正确项目。
2. 看首页五块：当前命令、项目地图、推进判断、协作现场、验收雷达。
3. 如果状态可信，回到 conductor surface 继续主要开发对话。
4. 在 phase 开始/结束、方向变化、验收变化、失败恢复、closeout 前后调用 `$threadsmith` 或明确要求写回 truth。
5. 回到 Threadsmith 点击刷新，确认 phase、run、evidence、acceptance 是否真的更新。

一句话：页面负责看清，conductor 负责推进，`.threadsmith` 负责把重要结论留下来。

如果你安装了 Threadsmith skill，可以在 Codex Desktop 里显式调用：

```text
使用 $threadsmith，更新当前项目状态，不开始实现，只同步 truth 并汇报 current phase / acceptance / next best step。
```

或者让它连续推进当前 phase：

```text
使用 $threadsmith，连续推进当前 phase，直到 accepted、paused、需要我决策、或遇到安全 stop condition。
```

`$threadsmith` 有四个入口模式：

- `sync`：只读当前 truth 和 context artifacts，汇报项目状态、阶段、验收和 next best step，不开始实现。
- `drive`：按当前阶段推进下一刀，并在真实边界写回 `.threadsmith/`。适合你想逐 gate 盯紧时使用。
- `continuous`：通过 autopilot continuation 连续推进一个 locked phase，自动串起 planner / executor / reviewer / verifier / repair / closeout，直到 accepted 或安全暂停。
- `recover`：当线程中断、状态过期、验证失败或 truth 与仓库不一致时，先恢复安全状态，再决定是否继续。

### 手动监督模式 vs 连续 autopilot 模式

手动监督模式适合调试 Threadsmith 自身、关键风险任务、或你想逐步看清每一道 gate 的时候。它会在 executor、reviewer、verifier、closeout 之间更频繁停下来汇报。

连续 autopilot 模式适合目标、范围、Done when 和验证命令已经清楚的 phase。它仍然保留 review、verification、repair loop 和 closeout，只是不要求你每一步都回复“继续”。推荐入口是：

```bash
npm run threadsmith:autopilot -- continue "/path/to/your-project"
```

`continue` 会先读取 committed truth 和最近的 phase run，再安全决定：

- 没有 phase run：启动新的 locked phase run。
- 有 paused phase run：从 pause 点恢复。
- 有 running phase run：等待，不重复启动。
- 当前 truth 已 accepted：要求先 phase reset，不从旧 truth 继续。

连续 autopilot 必须暂停的情况包括：需要用户决策、scope 扩大、破坏性 git 操作、发布/tag/push、外部凭据不可用、writeback 失败、风险规则命中、基础设施持续失败、repair loop 达到上限。

当 `.threadsmith/context/current-packet.json` 和 `.threadsmith/context/role-packets/<role>.json` 存在且新鲜时，`$threadsmith` 会优先使用它们来减少长线程上下文负担。若 packet 与 committed truth 冲突，仍以 `Project Brief / Current Phase / Acceptance State` 为准。

不建议把每一句普通聊天都强行写回 `.threadsmith/`。更推荐在这些边界写回：

- phase 开始或结束
- task / bug / closeout 开始或结束
- 验收状态变化
- 用户明确改变方向
- 发现新的 blocker 或 risk
- 准备提交或发布

如果你没有安装 skill，也可以正常使用 Threadsmith 页面。区别是：页面能显示项目 truth，但 AI conductor 不会自动在任务边界帮你写回 `.threadsmith/`；这时你需要在 Codex / CLI 对话里明确要求它同步 truth，或者在页面里手动检查状态。

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
- `.threadsmith/skill-routing.json`
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

## 6. Skill Routing 配置

`v0.3.0` 的 External Skill Adapter v1 会发现本地 / 项目内 Codex skills，并把它们转换成可解释的 adapter candidates。项目级配置存在：

```text
.threadsmith/skill-routing.json
```

它用于记录：

- 某个 capability 默认偏好哪个 skill，例如 `debug -> systematic-debugging`
- 某个 role + capability 偏好哪个 skill，例如 `verifier + verify -> independent-verification`
- 哪些 adapters 被项目临时禁用
- 当前配置来自哪次 discovery，便于判断是否过期

需要注意：这里的“route”不是自动执行外部 skill。当前 v1 只做到 discovery、health、routing metadata 和 built-in mini protocol fallback。真正执行仍由 conductor surface（例如 Codex Desktop / Codex CLI）完成。

如果某个项目没有安装 `systematic-debugging`、`independent-verification` 这类外部 skill，Threadsmith 不应该失败。它会退回 built-in mini protocol，并在页面里解释为什么 fallback。

## 7. LLM / Provider 配置

当前公开稳定线和 v0.3.0 内部开发线都仍然是 `Codex-only` 主线。

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

它的作用是让项目明确“每个角色现在由谁承担”。当前 UI 可以展示和记录这些路由，但当前稳定线 / 内部开发线不承诺非 Codex provider 的全自动执行已经完成。

## 8. Codex CLI 配置

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
npm run threadsmith:autopilot -- continue "/path/to/your-project"
npm run threadsmith:autopilot -- start "/path/to/your-project"
npm run threadsmith:autopilot -- resume "/path/to/your-project"
npm run threadsmith:autopilot -- status "/path/to/your-project"
```

日常优先用 `continue`。它会自己判断应该 start、resume、wait，还是提示 reset-needed；只有在你已经明确知道当前状态时，才需要直接使用 `start` 或 `resume`。

如果项目还没有足够 truth，autopilot 会先尝试 bootstrap；如果无法安全推断，会暂停并要求补充信息，而不是凭空 invent 一个 phase。

## 9. Claude / Gemini / Other Providers

Threadsmith 的架构为 multi-provider 预留了 provider routing 和 role boundary，但当前稳定线和 v0.3.0 内部开发线不把 fully automated multi-provider execution 作为交付承诺。

这意味着：

- 你可以在 truth 中记录“未来希望 Claude 做 planner / Codex 做 executor”。
- 当前稳定自动执行路径仍然是 Codex。
- 非 Codex provider adapter / routing 后续会作为独立版本推进。

## 10. 验证

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

## 11. 常见问题

### 页面看起来没更新

先确认你连接的是正确项目根目录，然后点击刷新状态。顶部会显示最近一次成功读取时间；`项目与来源` 会显示当前信息来源。如果 conductor 没有写回 `.threadsmith/`，Threadsmith 只能展示旧 truth。

### 端口被占用

macOS `.command` 可以这样换端口：

```bash
THREADSMITH_PORT=5174 ./Launch-Threadsmith.command
```

Windows PowerShell 可以这样换端口：

```powershell
$env:THREADSMITH_PORT = "5174"
.\Launch-Threadsmith.ps1
```

跨平台 npm 启动可以这样换端口：

```bash
npm run dev --workspace @threadsmith/control-deck -- --host 127.0.0.1 --port 5174
```

### 我需要每句话都用 `$threadsmith` 吗

不需要。Threadsmith 更适合在 workflow 边界写回 truth，而不是记录所有聊天流水。普通讨论可以留在 conductor surface，阶段、验收、方向变化和 closeout 再写回。

### Threadsmith 会直接替代 Codex Desktop 吗

不会。当前产品边界是 control deck：展示、配置、监督、校准。主要对话和指挥仍然发生在 Codex Desktop / Codex CLI 等 conductor surface。
