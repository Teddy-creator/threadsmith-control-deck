# Threadsmith Truth Boundary

## Why This Exists

Threadsmith 同时维护两类信息：

- `committed truth`
  这些文件描述项目当前被采纳的真实状态，应该像产品代码一样被审阅、提交和回滚。
- `runtime artifact`
  这些文件是运行痕迹、验证产物、handoff 草稿或 smoke 中间态，不应该默认混进发布 diff。

发布前最容易出问题的，不是“有没有 truth”，而是“哪些变化真的是项目状态更新，哪些只是刚跑完一轮工具留下的噪音”。

## Committed Truth

当前仓库里，以下 `.threadsmith` 文件属于 committed truth：

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

这些文件回答的是：

- 项目目标和范围是什么
- 当前阶段和 slice 是什么
- 当前验收、协作和默认路由是什么
- 最近一次被采纳的 bridge truth 是什么

如果这些文件发生变化，默认应该把它们当成“需要判断是否提交”的产品级 truth 变更，而不是自动忽略。

## Runtime Artifacts

以下路径属于运行期产物，默认不应进入 release diff：

- `.threadsmith/runs/`
- `.threadsmith/action-queue.ndjson`
- `.threadsmith/events.ndjson`
- `.threadsmith/context/`
- `.threadsmith/evidence/`
- `.threadsmith/packets/`
- `.threadsmith/closeouts/`
- `.threadsmith-runtime/`

这些路径主要保存：

- executor run 的 packet / prompt / stdout / result
- 当前 context packet、repo map、evidence summary 与 context budget 等可再生成上下文产物
- 事件流和 action queue
- verification / closeout / handoff 产物
- smoke 或本地实验使用的临时 workspace

这些文件可以作为证据查看，但默认不应该和 committed truth 一起审查。

## Release Hygiene Rule

发布前看 `.threadsmith` diff 时，先做这两个分离动作：

1. 先看 committed truth 文件有没有真的表达出“当前产品真相已经变化”。
2. 再确认 runtime artifact 是否已经被 `.gitignore` 挡住，或只作为本地证据存在。

如果一个变化只是最近跑了 smoke / verification / closeout 留下的痕迹，就不应该作为发布内容提交。

## Self-Host Smoke Default

从这轮 release-prep 开始，`npm run smoke:self-host` 的默认行为是：

- 先把当前仓库的 committed truth 快照复制到 `.threadsmith-runtime/self-host-smoke-workspace/`
- 再在这个隔离 workspace 里跑真实 executor smoke

这样做的目的，是验证真实 bridge 能否跑通，同时避免默认把主仓库的 `.threadsmith/command-bridge.json` 和其他 committed truth 再弄脏。

如果你就是想让 smoke 直接作用在某个真实项目根目录上，可以显式传入路径：

```bash
npm run smoke:self-host -- .
```

这时脚本会直接对你给出的 project root 运行，并且可能更新那个项目自己的 committed truth。

## Operator Checklist

当你看到 `.threadsmith` 有变化时，用这三个问题判断：

- 这是不是项目当前被采纳的真实状态？
- 这是不是只是一轮运行留下的中间痕迹？
- 这份变化如果进 Git，别人拉下来后会不会把它当成“当前真相”？

只有第一种情况，才默认进入提交候选。
