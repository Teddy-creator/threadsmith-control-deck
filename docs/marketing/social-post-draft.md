# Threadsmith Social Post Draft

## One-Line Hook

I built Threadsmith: a local web control deck that helps long-running AI coding projects stop disappearing into one messy chat thread.

## Short Post

I have been using AI coding agents more and more, but one thing kept bothering me:

The coding conversation gets longer, the agent says things are done, and suddenly it is hard to tell what the project actually believes is true.

So I built Threadsmith.

Threadsmith is a local-first web control deck for AI coding projects. It sits beside Codex / CLI / your main conductor chat and tracks:

- the current project goal
- the active phase
- recent evidence and runs
- acceptance state
- what should happen next

It does not replace the coding agent. It gives the work a dashboard and a memory boundary.

The first public version is intentionally simple:

- web app, not native desktop yet
- Codex-only automation lane
- local `.threadsmith` truth files
- project front door
- phase / evidence / acceptance workbenches

Repo:

https://github.com/Teddy-creator/Threadsmith-control-deck

## Chinese Draft

我最近在做一个给 AI coding 用的“控制台”项目：Threadsmith。

问题很简单：vibe coding 一旦线程变长，项目状态就开始变得很糊。

Agent 说做完了，但到底：

- 当前目标是什么？
- 当前阶段是什么？
- 最近一次执行产出了什么？
- 验收卡在哪？
- 哪些结论已经写回项目 truth？

这些信息经常散在聊天记录里。

所以 Threadsmith 不做新的聊天窗口，也不替代 Codex / Claude / CLI。它只是放在旁边，当一个本地 web control deck，把项目的 truth、阶段、证据、验收和下一步放在一个地方。

现在的 v0.1.0 是 Codex-only、web-first 的版本：

- 可以连接真实项目目录
- 可以初始化 `.threadsmith`
- 可以查看当前阶段、项目地图、协作现场和验收雷达
- 可以区分“聊天里说了”和“项目 truth 里真的记录了”

GitHub:

https://github.com/Teddy-creator/Threadsmith-control-deck

## Suggested Images

- Use `docs/assets/threadsmith-open-source-surface.png` as the first screenshot.
- Carousel frame 1: long AI coding threads lose state.
- Carousel frame 2: Threadsmith front door lets you pick the real project.
- Carousel frame 3: homepage shows command, roadmap, judgement, collaboration, and acceptance.
- Carousel frame 4: workbenches expose project, phase, evidence, and acceptance details.
- Carousel frame 5: Threadsmith is the control deck; Codex remains the conductor surface.
