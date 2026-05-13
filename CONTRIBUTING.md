# Contributing to Threadsmith

感谢你愿意参与 Threadsmith。

当前项目还处在快速推进期，所以我们优先追求的是：

- 小而清晰的 slice
- 可验证的改动
- 不破坏现有 control deck 体验
- 让 `.threadsmith` truth、UI 和文档保持一致

## 环境要求

- Node.js 22+
- npm 11+
- macOS 本地启动脚本默认已适配，但核心 web app 逻辑不依赖 macOS

## 安装依赖

```bash
npm ci
```

## 本地启动

跨平台启动：

```bash
npm run start
```

然后打开：

```text
http://127.0.0.1:5173/?appHome=1
```

开发 control deck：

```bash
npm run dev
```

macOS 使用产品入口：

```bash
./Launch-Threadsmith.command
./Open-Threadsmith-App.command
```

macOS 显式打开某个项目：

```bash
./Launch-Threadsmith.command "/path/to/your-project"
```

## 当前默认工作方式

当前 v0.3.x 稳定线仍然是 `Codex-only`：

- `planner / executor / reviewer / verifier / closeout` 默认都由 `Codex` 承担
- 主 conductor surface 默认是 `Codex Desktop`
- Threadsmith 负责监督、truth、证据和工作台，不替代主聊天面
- provider routing UI 目前主要是 truth surface，不应被当作“multi-provider 已经 ready”的发布承诺

## 提交前验证

至少运行：

```bash
npm run test
npm run build
```

如果这轮改动涉及浏览器流、bridge 或启动入口，建议再跑：

```bash
npm run test:e2e
npm run smoke:self-host
```

如果你在准备 release 或 release-adjacent PR，优先运行：

```bash
npm run verify:release
```

发布检查面见对应版本 checklist；当前 patch release 工作优先参考 [docs/checklists/release-v0.3.1.md](docs/checklists/release-v0.3.1.md)，v0.3.0 功能基线仍保留在 [docs/checklists/release-v0.3.0.md](docs/checklists/release-v0.3.0.md)。

## 改动建议

- 保持 slice 聚焦，不把多个无关目标混进一个 PR
- 改动 UI 时，优先保持当前整体风格和信息骨架稳定
- 改动 workflow / truth 逻辑时，同时更新测试
- 改动用户可见路径时，补 README 或相关文档
- 不要把临时调试代码、无关产物或噪音文件带进提交

## PR 说明建议

建议在 PR 描述里回答这几个问题：

1. 这刀解决了什么问题
2. 明确不包含什么
3. 如何验证
4. 是否影响 README、启动路径或 `.threadsmith` truth

## 开源反馈入口

公开仓库里已经准备了标准模板：

- `Bug report`
- `Feature request`
- Pull Request template

如果涉及安全或凭据问题，请先看 [SECURITY.md](SECURITY.md)，不要直接把敏感信息写进公开 issue。

## 当前贡献重点

当前更欢迎的方向：

- codex-only release surface / release hygiene
- onboarding、launcher、docs honesty 的打磨
- self-host smoke 与真实 dogfood 稳定性
- acceptance、evidence、truth surface 的打磨
- v0.3.x Skill Orchestrator / mini protocol / stop-recovery / context routing 的验证与文档收口

## 行为边界

Threadsmith 当前仍是一个 workflow-first 的控制台项目。

贡献时请尽量保持这几个原则：

- 不把它做成主聊天面
- 不把首页重新做成执行面板
- 不为了“更像桌面 app”而提前牺牲 web 路径稳定性
- 除非有单独 brief / plan 明确要求，否则先不要把 `multi-provider` 当成本阶段默认扩展方向

如果你准备做较大的方向性改动，建议先开 issue 或 draft PR 对齐边界。
