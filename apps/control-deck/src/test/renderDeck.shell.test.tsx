import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type {
  AgentRunRecord,
  CommandBridgeState,
  ProjectState,
  ProjectSupervisionState,
  WorkflowEvent
} from "@threadsmith/domain";
import {
  buildContextPacket,
  deriveRoleContextPacket,
  deriveSupervisorState
} from "@threadsmith/runtime";
import { describe, expect, it, vi } from "vitest";
import { DeckScreen } from "../App";
import {
  events,
  projectSupervision,
  runningLatestRun,
  state
} from "./renderDeck.fixtures";
import {
  registerRenderDeckTestLifecycle,
  setViewportWidth
} from "./renderDeck.helpers";

registerRenderDeckTestLifecycle();

describe("DeckScreen shell", () => {
  it("shows full collaboration summaries without compacting the latest run, bridge, or task text", () => {
    const longRunDetail =
      "Created .threadsmith-runtime/self-host-smoke.txt with the exact required smoke marker after reading the current command contract and verifying the workspace target.";
    const longBridgeDetail =
      "已先核对 committed truth 与相关实现文件；当前 workspace 中这轮 autopilot continue/status 与 phase-run continuity 已经对齐，可以继续沿当前 accepted 主线推进。";
    const longTaskSummary =
      "已把 release hardening 收成 accepted，并准备下一刀 public web release publish 与说明文案收口。";

    const longLatestRun: AgentRunRecord = {
      ...runningLatestRun,
      status: "succeeded",
      finishedAt: "2026-04-04T00:08:00.000Z",
      statusDetail: longRunDetail
    };

    const longBridgeState: CommandBridgeState = {
      latestRoute: {
        routeId: "route-long",
        sourceActionId: "advance-phase",
        surface: "deck-action-bridge",
        provider: "codex",
        targetRole: "executor",
        projectLabel: "Threadsmith",
        projectRoot: "/tmp/project",
        status: "failed",
        statusDetail: longBridgeDetail,
        createdAt: "2026-04-04T00:05:00.000Z",
        updatedAt: "2026-04-04T00:08:00.000Z",
        artifactPath: ".threadsmith/bridges/route-long.md",
        runId: "run-long"
      },
      latestRun: {
        runId: "run-long",
        routeId: "route-long",
        provider: "codex",
        role: "executor",
        status: "succeeded",
        summary: "执行结果已写回 committed truth。",
        recordedAt: "2026-04-04T00:08:00.000Z",
        artifactPath: ".threadsmith/runs/run-long/result.md",
        truthWritebackStatus: "succeeded-written"
      },
      updatedAt: "2026-04-04T00:08:00.000Z"
    };

    const longProjectSupervision: ProjectSupervisionState = {
      ...projectSupervision,
      lines: [
        {
          id: "conductor-long",
          role: "planner",
          threadLabel: "Conductor",
          provider: "codex",
          presence: "logical",
          status: "done",
          taskSummary: longTaskSummary,
          requiresUserDecision: false,
          blockerSummary: null,
          latestEvidenceLabel: "accepted truth 已写回",
          updatedAt: "2026-04-04T00:09:00.000Z"
        }
      ],
      updatedAt: "2026-04-04T00:09:00.000Z"
    };

    render(
      <DeckScreen
        projectRoot="/tmp/project"
        currentProjectSourceId="custom-project"
        currentProjectSourceLabel="自定义项目"
        customProjectDraft="/tmp/project"
        customProjectError={null}
        customProjectErrorKind={null}
        isConnectingCustomProject={false}
        isInitializingCustomProject={false}
        recentProjects={[]}
        supervisorState={deriveSupervisorState(
          state,
          events,
          longLatestRun,
          longBridgeState,
          longProjectSupervision
        )}
        loading={false}
        error={null}
        errorKind={null}
        actionHistoryLength={0}
        onSelectProjectSource={vi.fn()}
        onCustomProjectDraftChange={vi.fn()}
        onConnectCustomProject={vi.fn()}
        onInitializeCustomProject={vi.fn()}
        onPinRecentProject={vi.fn()}
        onUnpinRecentProject={vi.fn()}
        onRemoveRecentProject={vi.fn()}
        onRunAction={async () => {}}
        onApplyTransition={async () => {}}
      />
    );

    const collaborationCard = screen.getByRole("heading", { name: "协作现场" }).closest("article");
    expect(collaborationCard).not.toBeNull();
    const collaborationScope = within(collaborationCard as HTMLElement);

    expect(collaborationScope.getByText(longRunDetail)).toBeInTheDocument();
    expect(collaborationScope.getByText(longBridgeDetail)).toBeInTheDocument();
    expect(collaborationScope.getByText(longTaskSummary)).toBeInTheDocument();
  });

  it("renders the single-screen shell and mode dock", () => {
    const onSelectProjectSource = vi.fn();

    render(
      <DeckScreen
        projectRoot="/tmp/project"
        currentProjectSourceId="fresh-demo"
        currentProjectSourceLabel="最新 packet 示例"
        customProjectDraft=""
        customProjectError={null}
        customProjectErrorKind={null}
        isConnectingCustomProject={false}
        isInitializingCustomProject={false}
        recentProjects={[]}
        supervisorState={deriveSupervisorState(
          state,
          events,
          runningLatestRun,
          null,
          projectSupervision
        )}
        loading={false}
        error={null}
        errorKind={null}
        actionHistoryLength={0}
        onSelectProjectSource={onSelectProjectSource}
        onCustomProjectDraftChange={vi.fn()}
        onConnectCustomProject={vi.fn()}
        onInitializeCustomProject={vi.fn()}
        onPinRecentProject={vi.fn()}
        onUnpinRecentProject={vi.fn()}
        onRemoveRecentProject={vi.fn()}
        onRunAction={async () => {}}
        onApplyTransition={async () => {}}
      />
    );

    expect(screen.getByRole("button", { name: "阶段" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "证据" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "验收" })).toBeInTheDocument();
    const projectButton = screen.getByRole("button", { name: "项目" });
    const phaseButton = screen.getByRole("button", { name: "阶段" });
    const phaseIcon = phaseButton.querySelector("svg");
    expect(projectButton).not.toHaveClass("bg-amber-500/18");
    expect(phaseButton).not.toHaveClass("bg-amber-500/18");
    expect(phaseIcon).toHaveClass("text-zinc-500");
    expect(screen.queryByText("项目总况")).not.toBeInTheDocument();
    expect(document.querySelector(".inspector-panel")).toBeNull();
    expect(screen.getByText("当前总命令")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "项目地图" }).length).toBeGreaterThan(0);
    expect(screen.getByText("推进判断")).toBeInTheDocument();
    expect(screen.getByText("协作现场")).toBeInTheDocument();
    expect(screen.getByText("验收雷达")).toBeInTheDocument();
    expect(screen.queryByText("工作区来源")).not.toBeInTheDocument();
    expect(screen.getByText("来源：最新 packet 示例")).toBeInTheDocument();
    const sourceButton = screen.getByRole("button", { name: "来源：最新 packet 示例" });
    const sourceIcon = sourceButton.querySelector("svg");
    expect(sourceIcon).toHaveClass("text-zinc-500");
    const projectMapCard = screen
      .getAllByRole("heading", { name: "项目地图" })[0]
      ?.closest("article");
    expect(projectMapCard).not.toBeNull();
    fireEvent.click(projectButton);
    expect(projectButton).toHaveClass("bg-amber-500/18");
    expect(projectButton).toHaveClass("text-amber-400");
    const projectDrawerHeading = screen
      .getAllByText("项目总况")
      .find((element) => element.closest(".inspector-panel"));
    const projectDrawer = projectDrawerHeading?.closest(".inspector-panel");
    expect(projectDrawer).not.toBeNull();
    const projectScope = within(projectDrawer as HTMLElement);
    expect(projectScope.getByText("项目定义")).toBeInTheDocument();
    expect(projectScope.getByText("项目路线")).toBeInTheDocument();
    expect(projectScope.getByText("指挥与路由")).toBeInTheDocument();
    expect(projectScope.queryByText("项目主线")).not.toBeInTheDocument();
    expect(projectScope.queryByText("项目运行态")).not.toBeInTheDocument();
    expect(projectScope.queryByText("协作拓扑")).not.toBeInTheDocument();
    expect(projectScope.getByText("项目目标")).toBeInTheDocument();
    expect(projectScope.getByText("当前版本范围")).toBeInTheDocument();
    expect(projectScope.getByText("当前优先级")).toBeInTheDocument();
    expect(projectScope.getByText("开放问题")).toBeInTheDocument();
    expect(projectScope.getByText("非目标")).toBeInTheDocument();
    expect(projectScope.getByText("关键约束")).toBeInTheDocument();
    expect(projectScope.getByText("完成项目级工作台")).toBeInTheDocument();
    expect(projectScope.getByText("project roadmap 由谁负责维护")).toBeInTheDocument();
    expect(projectScope.getByText("暂不做原生 App 封装")).toBeInTheDocument();
    expect(projectScope.getByText("先保持首页视觉骨架稳定")).toBeInTheDocument();
    expect(projectScope.getByText("全部里程碑")).toBeInTheDocument();
    expect(projectScope.getByText("当前指挥入口")).toBeInTheDocument();
    expect(projectScope.getByText("当前使用方式")).toBeInTheDocument();
    expect(projectScope.getByText("全 Codex")).toBeInTheDocument();
    expect(projectScope.getByText("角色路由")).toBeInTheDocument();
    expect(projectScope.getAllByText("Codex Desktop").length).toBeGreaterThan(0);
    expect(projectScope.getByText("等待结果回流")).toBeInTheDocument();
    expect(
      projectScope.getByText("当前已有一轮 Codex 自动执行在跑，先等待结果写回后再继续更稳。")
    ).toBeInTheDocument();
    expect(projectScope.getAllByText("Codex").length).toBeGreaterThan(0);
    expect(projectScope.getAllByText("Conductor").length).toBeGreaterThan(0);
    expect(projectScope.getAllByText("Builder").length).toBeGreaterThan(0);
    expect(projectScope.getAllByText("Critic").length).toBeGreaterThan(0);
    expect(projectScope.getAllByText("Verifier").length).toBeGreaterThan(0);
    expect(projectScope.getAllByText("Closeout").length).toBeGreaterThan(0);
    expect(
      projectScope.getByText("当前默认执行角色都路由到 Codex，执行桥可以完整覆盖默认执行线。")
    ).toBeInTheDocument();
    const currentCommandCard = screen.getByText("当前总命令").closest("article");
    expect(currentCommandCard).not.toBeNull();
    const currentCommandScope = within(currentCommandCard as HTMLElement);
    expect(currentCommandScope.getByText("指挥入口")).toBeInTheDocument();
    expect(currentCommandScope.getByText("对话路径")).toBeInTheDocument();
    expect(currentCommandScope.getByText("补充说明")).toBeInTheDocument();
    expect(currentCommandScope.getByText("Codex Desktop")).toBeInTheDocument();
    expect(currentCommandScope.getByText("角色")).toHaveClass("text-amber-200/70");
    expect(currentCommandScope.getByText("线程")).toHaveClass("text-amber-200/70");
    expect(currentCommandScope.getByText("入口")).toHaveClass("text-amber-200/70");
    expect(
      currentCommandScope.getByRole("button", { name: "复制建议指令" })
    ).toBeInTheDocument();
    expect(
      currentCommandScope.getByRole("button", { name: "查看为什么" })
    ).toBeInTheDocument();
    const projectMapScope = within(projectMapCard as HTMLElement);
    expect(projectMapScope.getByText("版本路线")).toBeInTheDocument();
    expect(projectMapScope.getByText("里程碑 7 / 12")).toBeInTheDocument();
    expect(projectMapScope.getByText("里程碑地图")).toBeInTheDocument();
    expect(projectMapScope.getByText("最近完成")).toBeInTheDocument();
    expect(projectMapScope.getByText("当前里程碑")).toBeInTheDocument();
    expect(projectMapScope.getByText("下一里程碑")).toBeInTheDocument();
    expect(projectMapScope.getByText("最终目标")).toBeInTheDocument();
    const decisionCard = screen.getByRole("heading", { name: "推进判断" }).closest("article");
    expect(decisionCard).not.toBeNull();
    const decisionScope = within(decisionCard as HTMLElement);
    expect(decisionScope.getAllByText("等待回流").length).toBeGreaterThan(1);
    expect(decisionScope.getByText("上下文")).toBeInTheDocument();
    expect(decisionScope.getByText("等待运行结果回流")).toBeInTheDocument();
    expect(decisionScope.getByText("主 packet")).toBeInTheDocument();
    expect(decisionScope.getByText("规划")).toBeInTheDocument();
    expect(decisionScope.getByText("建议动作")).toBeInTheDocument();
    expect(decisionScope.getByText("等待")).toBeInTheDocument();
    expect(decisionScope.getByText("通过")).toBeInTheDocument();
    expect(decisionScope.getByText("中")).toBeInTheDocument();
    expect(
      decisionScope.getByText(
        /等待回流：正在实现 runtime selectors，并准备把结果写回当前 truth。 当前无需重新签发动作/
      )
    ).toBeInTheDocument();
    const collaborationCard = screen.getByRole("heading", { name: "协作现场" }).closest("article");
    expect(collaborationCard).not.toBeNull();
    const collaborationScope = within(collaborationCard as HTMLElement);
    expect(collaborationScope.getAllByText("进行中").length).toBeGreaterThan(0);
    expect(collaborationScope.getByText("运行中")).toBeInTheDocument();
    expect(collaborationScope.getByText("1 条")).toBeInTheDocument();
    expect(collaborationScope.getByText("等待中")).toBeInTheDocument();
    expect(collaborationScope.getByText("0 条")).toBeInTheDocument();
    expect(collaborationScope.getByText("阻塞")).toBeInTheDocument();
    expect(collaborationScope.getByText("无")).toBeInTheDocument();
    expect(collaborationScope.getByText("最新角色运行")).toBeInTheDocument();
    expect(collaborationScope.queryByText("最新桥接")).not.toBeInTheDocument();
    expect(
      collaborationScope.getByText("正在实现 runtime selectors，并准备把结果写回当前 truth。")
    ).toBeInTheDocument();
    expect(collaborationScope.getByText("回流：等待结果回流到 truth")).toBeInTheDocument();
    expect(collaborationScope.getByText("Build runtime selectors")).toBeInTheDocument();
    expect(collaborationScope.getAllByText("执行").length).toBeGreaterThan(0);
    expect(collaborationScope.getAllByText("Builder").length).toBeGreaterThan(0);
    expect(collaborationScope.getAllByText("Codex").length).toBeGreaterThan(0);
    expect(collaborationScope.getAllByText("逻辑角色").length).toBeGreaterThan(0);
    expect(collaborationScope.getAllByText("进行中").length).toBeGreaterThan(0);
    expect(collaborationScope.getByText("现场提醒")).toBeInTheDocument();
    expect(
      collaborationScope.getByText("主工作：Build runtime selectors")
    ).toBeInTheDocument();
    const acceptanceCard = screen.getByRole("heading", { name: "验收雷达" }).closest("article");
    expect(acceptanceCard).not.toBeNull();
    const acceptanceCardScope = within(acceptanceCard as HTMLElement);
    expect(acceptanceCardScope.getByText("评审")).toBeInTheDocument();
    expect(acceptanceCardScope.getByText("验证")).toBeInTheDocument();
    expect(acceptanceCardScope.getByText("收尾")).toBeInTheDocument();
    expect(acceptanceCardScope.getByText("最终接受")).toBeInTheDocument();
    expect(acceptanceCardScope.getByText("进行中")).toBeInTheDocument();
    expect(acceptanceCardScope.getAllByText("待开始").length).toBeGreaterThan(0);
    expect(acceptanceCardScope.getByText("还有 1 项验收检查未通过。")).toBeInTheDocument();

    fireEvent.click(phaseButton);
    expect(projectButton).not.toHaveClass("bg-amber-500/18");
    expect(phaseButton).toHaveClass("bg-amber-500/18");
    expect(phaseButton).toHaveClass("text-amber-400");
    expect(phaseIcon).toHaveClass("text-amber-500");
    const objectsDrawerHeading = screen
      .getAllByText("当前阶段")
      .find((element) => element.closest(".inspector-panel"));
    const objectsDrawer = objectsDrawerHeading?.closest(".inspector-panel");
    expect(objectsDrawer).not.toBeNull();
    const objectsScope = within(objectsDrawer as HTMLElement);
    expect(objectsScope.getByText("Context 状态")).toBeInTheDocument();
    expect(objectsScope.getByText("Context 关注")).toBeInTheDocument();
    expect(objectsScope.getByText("等待回流")).toBeInTheDocument();
    expect(objectsScope.getByText("Current Packet")).toBeInTheDocument();
    expect(objectsScope.getByText("规划 packet")).toBeInTheDocument();
    expect(objectsScope.getByText("为什么现在")).toBeInTheDocument();
    expect(objectsScope.getByText("处理方式")).toBeInTheDocument();
    expect(objectsScope.getByText("先等待运行结果回流")).toBeInTheDocument();
    expect(
      objectsScope.getByText("不要重复签发 context sync；先等最新运行完成，再刷新页面或回到指挥官继续。")
    ).toBeInTheDocument();
    expect(objectsScope.getByText("阶段合同")).toBeInTheDocument();
    expect(objectsScope.getByText("当前推进方式")).toBeInTheDocument();
    expect(objectsScope.getByText("当前 slice")).toBeInTheDocument();
    expect(objectsScope.getByText("阶段出口")).toBeInTheDocument();
    expect(objectsScope.getByText("角色归属")).toBeInTheDocument();
    expect(objectsScope.queryByText("阶段定义")).not.toBeInTheDocument();
    expect(objectsScope.queryByText("阶段验收")).not.toBeInTheDocument();
    expect(objectsScope.queryByText("验证与缺口")).not.toBeInTheDocument();
    expect(objectsScope.getByText("阶段名称")).toBeInTheDocument();
    expect(objectsScope.getByText("阶段目标")).toBeInTheDocument();
    expect(objectsScope.getByText("交付物")).toBeInTheDocument();
    expect(objectsScope.getByText("当前切口")).toBeInTheDocument();
    expect(objectsScope.getByText("In scope")).toBeInTheDocument();
    expect(objectsScope.getByText("Out of scope")).toBeInTheDocument();
    expect(objectsScope.getByText("阻塞 / 待决策")).toBeInTheDocument();
    expect(objectsScope.getByText("Runtime selectors")).toBeInTheDocument();
    expect(objectsScope.getByText("Native packaging")).toBeInTheDocument();
    expect(objectsScope.getByText("当前没有阻塞或待决策项。")).toBeInTheDocument();
    expect(objectsScope.getByText("阶段完成标志")).toBeInTheDocument();
    expect(objectsScope.getByText("本阶段验证重点")).toBeInTheDocument();
    expect(objectsScope.getByText("Done when 进度")).toBeInTheDocument();
    expect(objectsScope.getByText("Run tests")).toBeInTheDocument();
    expect(objectsScope.getByText("当前没有记录缺口。")).toBeInTheDocument();
    expect(objectsScope.getByText("等待结果回流")).toBeInTheDocument();
    expect(
      objectsScope.getByText("当前 phase 已有一轮 executor 自动执行在跑，先等待结果回写后再继续更稳。")
    ).toBeInTheDocument();
    expect(objectsScope.getAllByText("规划").length).toBeGreaterThan(0);
    expect(objectsScope.getAllByText("执行").length).toBeGreaterThan(0);
    expect(objectsScope.getAllByText("Conductor").length).toBeGreaterThan(0);
    expect(objectsScope.getAllByText("Builder").length).toBeGreaterThan(0);
    expect(objectsScope.getAllByText("Codex").length).toBeGreaterThan(0);
    expect(objectsScope.getAllByText("逻辑角色").length).toBeGreaterThan(0);
    expect(objectsScope.getAllByText("真实线程").length).toBeGreaterThan(0);
    expect(
      objectsScope.getByText("这里展示当前 phase contract 约定参与的角色。真实线程显示当前实际 provider，逻辑角色显示默认路由 provider。")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "证据" }));
    const eventsDrawerHeading = screen
      .getAllByText("证据与事件")
      .find((element) => element.closest(".inspector-panel"));
    const eventsDrawer = eventsDrawerHeading?.closest(".inspector-panel");
    expect(eventsDrawer).not.toBeNull();
    const eventsScope = within(eventsDrawer as HTMLElement);
    expect(eventsScope.getByText("最新角色运行")).toBeInTheDocument();
    expect(eventsScope.getByText("当前证据面")).toBeInTheDocument();
    expect(eventsScope.getByText("关键记录")).toBeInTheDocument();
    expect(eventsScope.getByText("继续与交接")).toBeInTheDocument();
    expect(eventsScope.getByText("事件时间线")).toBeInTheDocument();
    expect(eventsScope.getByText("运行 ID · run-live")).toBeInTheDocument();
    expect(
      eventsScope.getByText("正在实现 runtime selectors，并准备把结果写回当前 truth。")
    ).toBeInTheDocument();
    expect(eventsScope.getAllByText("等待结果回流到 truth").length).toBeGreaterThan(0);
    expect(eventsScope.getByText("指令文件")).toBeInTheDocument();
    expect(
      eventsScope.getByText(".threadsmith/runs/run-live/prompt.md")
    ).toBeInTheDocument();
    expect(eventsScope.getAllByText("结果写回").length).toBeGreaterThan(0);
    expect(eventsScope.getAllByText("验证").length).toBeGreaterThan(0);
    expect(eventsScope.getAllByText("收尾").length).toBeGreaterThan(0);
    expect(eventsScope.getAllByText("交接").length).toBeGreaterThan(0);
    expect(eventsScope.getAllByText("通过").length).toBeGreaterThan(0);
    expect(eventsScope.getAllByText("未开始").length).toBeGreaterThan(0);
    expect(eventsScope.getAllByText("未保存继续点").length).toBeGreaterThan(0);
    expect(eventsScope.getAllByText("Verifier 已接受当前 claim").length).toBeGreaterThan(0);
    expect(eventsScope.getAllByText("Closeout 尚未开始").length).toBeGreaterThan(0);
    expect(eventsScope.getAllByText("还没有 handoff 或 hygiene packet").length).toBeGreaterThan(0);
    expect(eventsScope.getByText("最新验证证据")).toBeInTheDocument();
    expect(eventsScope.getByText("最新收尾记录")).toBeInTheDocument();
    expect(eventsScope.getByText("判断依据")).toBeInTheDocument();
    expect(eventsScope.getByText("事件时间线")).toBeInTheDocument();
    expect(eventsScope.getAllByText("流转事件").length).toBeGreaterThan(0);
    expect(eventsScope.getAllByText("验证").length).toBeGreaterThan(0);
    expect(eventsScope.getAllByText("评审").length).toBeGreaterThan(0);
    expect(eventsScope.getByText("Reviewer 已放行这个 slice")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "验收" }));
    const acceptanceDrawerHeading = screen
      .getAllByText("验收状态")
      .find((element) => element.closest(".inspector-panel"));
    const acceptanceDrawer = acceptanceDrawerHeading?.closest(".inspector-panel");
    expect(acceptanceDrawer).not.toBeNull();
    const acceptanceScope = within(acceptanceDrawer as HTMLElement);
    expect(acceptanceScope.getByText("当前判定")).toBeInTheDocument();
    expect(acceptanceScope.getByText("当前推进方式")).toBeInTheDocument();
    expect(acceptanceScope.getByText("缺什么才算过")).toBeInTheDocument();
    expect(acceptanceScope.getByText("四道门")).toBeInTheDocument();
    expect(acceptanceScope.getByText("签字与记录")).toBeInTheDocument();
    expect(acceptanceScope.getByText("手动流转（备用）")).toBeInTheDocument();
    expect(acceptanceScope.queryByText("总览")).not.toBeInTheDocument();
    expect(acceptanceScope.queryByText("检查项")).not.toBeInTheDocument();
    expect(acceptanceScope.getByText("卡在 评审")).toBeInTheDocument();
    expect(acceptanceScope.getByText("当前责任门")).toBeInTheDocument();
    expect(acceptanceScope.getByText("主承接角色")).toBeInTheDocument();
    expect(acceptanceScope.getByText("当前入口")).toBeInTheDocument();
    expect(acceptanceScope.getByText("推进路径")).toBeInTheDocument();
    expect(acceptanceScope.getByText("执行 · Builder")).toBeInTheDocument();
    expect(acceptanceScope.getByText("Codex Desktop")).toBeInTheDocument();
    expect(acceptanceScope.getByText("等待结果回流")).toBeInTheDocument();
    expect(
      acceptanceScope.getByText("当前还在为进入评审准备结果；先等待 executor 结果回写后再继续更稳。")
    ).toBeInTheDocument();
    expect(acceptanceScope.getAllByText("还有 1 项验收检查未通过。").length).toBeGreaterThan(0);
    expect(acceptanceScope.getByText("还差 4 门")).toBeInTheDocument();
    expect(acceptanceScope.getByText("未过检查项")).toBeInTheDocument();
    expect(acceptanceScope.getAllByText("已知缺口").length).toBeGreaterThan(0);
    expect(acceptanceScope.getByText("当前最缺的证据")).toBeInTheDocument();
    expect(acceptanceScope.getAllByText("评审").length).toBeGreaterThan(0);
    expect(acceptanceScope.getAllByText("验证").length).toBeGreaterThan(0);
    expect(acceptanceScope.getAllByText("收尾").length).toBeGreaterThan(0);
    expect(acceptanceScope.getAllByText("最终接受").length).toBeGreaterThan(0);
    expect(
      acceptanceScope.getByRole("button", { name: "准备进入 Review" })
    ).toBeInTheDocument();
    expect(acceptanceScope.getByText("Do the thing")).toBeInTheDocument();
    expect(
      acceptanceScope.getAllByText("缺少 Critic / Reviewer 的放行结论。").length
    ).toBeGreaterThan(0);
    expect(
      acceptanceScope.getByText("这里记录谁已经给出 review、verification、closeout 与最终接受结论。")
    ).toBeInTheDocument();
    expect(acceptanceScope.getByText("Reviewer 已放行这个 slice")).toBeInTheDocument();

    fireEvent.click(sourceButton);
    expect(sourceIcon).toHaveClass("text-amber-500");
    expect(screen.getByText("项目与来源")).toBeInTheDocument();
    expect(screen.getByText("工作区来源")).toBeInTheDocument();
    const projectsDrawer = screen.getByText("项目与来源").closest(".inspector-panel");
    expect(projectsDrawer).not.toBeNull();
    const projectsScope = within(projectsDrawer as HTMLElement);
    expect(projectsScope.getByText("推荐进入路径")).toBeInTheDocument();
    expect(projectsScope.getByText("这是一个已收口项目的学习示例")).toBeInTheDocument();
    expect(projectsScope.getByRole("button", { name: /前门入口/i })).toBeInTheDocument();
    expect(projectsScope.getByRole("button", { name: /Demo：过期交接点/i })).toBeInTheDocument();
    expect(projectsScope.getByRole("button", { name: /自定义项目/i })).toBeInTheDocument();

    fireEvent.click(projectsScope.getByRole("button", { name: /自定义项目/i }));
    expect(screen.getByRole("button", { name: /连接项目/i })).toBeDisabled();

    fireEvent.click(projectsScope.getByRole("button", { name: /Demo：过期交接点/i }));
    expect(onSelectProjectSource).toHaveBeenCalledWith("stale-packet-demo");
  });

  it("opens the workbench in focused mode on narrow viewports", () => {
    const previousWidth = window.innerWidth;
    setViewportWidth(1180);

    render(
      <DeckScreen
        projectRoot="/tmp/project"
        currentProjectSourceId="custom-project"
        currentProjectSourceLabel="自定义项目"
        customProjectDraft="/tmp/project"
        customProjectError={null}
        customProjectErrorKind={null}
        isConnectingCustomProject={false}
        isInitializingCustomProject={false}
        recentProjects={[]}
        supervisorState={deriveSupervisorState(state, events)}
        loading={false}
        error={null}
        errorKind={null}
        actionHistoryLength={0}
        onSelectProjectSource={vi.fn()}
        onCustomProjectDraftChange={vi.fn()}
        onConnectCustomProject={vi.fn()}
        onInitializeCustomProject={vi.fn()}
        onPinRecentProject={vi.fn()}
        onUnpinRecentProject={vi.fn()}
        onRemoveRecentProject={vi.fn()}
        onRunAction={async () => {}}
        onApplyTransition={async () => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "项目" }));

    const projectDrawerHeading = screen
      .getAllByText("项目总况")
      .find((element) => element.closest(".inspector-panel"));
    const projectDrawer = projectDrawerHeading?.closest(".inspector-panel");
    expect(projectDrawer).not.toBeNull();
    expect(projectDrawer).toHaveClass("flex-1");
    expect(screen.queryByText("当前总命令")).not.toBeInTheDocument();

    setViewportWidth(previousWidth);
  });

  it("renders next-slice drafting guidance when acceptance and closeout are complete", () => {
    const readyState: ProjectState = {
      ...state,
      acceptanceState: {
        ...state.acceptanceState,
        reviewStatus: "ready-for-verification",
        verificationStatus: "passed",
        closeoutStatus: "done",
        finalState: "accepted"
      },
      activeWork: {
        items: [],
        blockerSummary: null
      }
    };

    const readyEvents: WorkflowEvent[] = [
      {
        id: "closeout-complete",
        createdAt: "2026-04-04T00:05:00.000Z",
        kind: "workflow-transition",
        title: "Closeout 已完成",
        detail: "这个 slice 已经接受，并且可以 handoff 给下一 phase。",
        role: "closeout",
        transitionId: "closeout-complete"
      },
      {
        id: "handoff-created",
        createdAt: "2026-04-04T00:06:00.000Z",
        kind: "deck-action",
        title: "已创建 handoff packet",
        detail:
          "已为 phase「Build workflow loop」记录当前 truth，下一段 slice 可以从这份紧凑 packet 继续。 Packet：.threadsmith/packets/example-handoff.md",
        role: "hygiene",
        actionId: "create-handoff"
      }
    ];

    render(
      <DeckScreen
        projectRoot="/tmp/project"
        currentProjectSourceId="stale-packet-demo"
        currentProjectSourceLabel="过期 packet 示例"
        customProjectDraft=""
        customProjectError={null}
        customProjectErrorKind={null}
        isConnectingCustomProject={false}
        isInitializingCustomProject={false}
        recentProjects={[]}
        supervisorState={deriveSupervisorState(readyState, readyEvents)}
        loading={false}
        error={null}
        errorKind={null}
        actionHistoryLength={0}
        onSelectProjectSource={vi.fn()}
        onCustomProjectDraftChange={vi.fn()}
        onConnectCustomProject={vi.fn()}
        onInitializeCustomProject={vi.fn()}
        onPinRecentProject={vi.fn()}
        onUnpinRecentProject={vi.fn()}
        onRemoveRecentProject={vi.fn()}
        onRunAction={async () => {}}
        onApplyTransition={async () => {}}
      />
    );

    const nextBestStepCard = screen.getByText("当前总命令").closest("article");

    expect(nextBestStepCard).not.toBeNull();
    expect(
      within(nextBestStepCard!).getAllByText("起草下一刀并准备 phase reset").length
    ).toBeGreaterThan(0);
    expect(within(nextBestStepCard!).getByText("上一刀已 accepted")).toBeInTheDocument();
    expect(within(nextBestStepCard!).getByText("下一刀待定义")).toBeInTheDocument();
    expect(
      within(nextBestStepCard!).getByText(
        "上一刀已经 accepted，fresh handoff packet 也已经就绪。当前最佳动作不是重复查看上一刀，而是基于这份边界收束下一条 narrow slice，并准备正式的 phase reset。"
      )
    ).toBeInTheDocument();
    expect(screen.getByText("推进判断")).toBeInTheDocument();
    expect(
      screen.getByText("当前 slice 已 accepted，下一步不是重复查看 handoff，而是基于这份边界起草下一刀并准备 phase reset。")
    ).toBeInTheDocument();
    expect(
      screen.getByText("下一刀：基于 accepted handoff 收束窄 slice，并准备 phase reset。")
    ).toBeInTheDocument();
    expect(screen.getByText("来源：过期 packet 示例")).toBeInTheDocument();
    const collaborationCard = screen.getByRole("heading", { name: "协作现场" }).closest("article");
    expect(collaborationCard).not.toBeNull();
    const collaborationScope = within(collaborationCard as HTMLElement);
    expect(collaborationScope.getByText("现场空闲")).toBeInTheDocument();
    expect(collaborationScope.getByText("未执行")).toBeInTheDocument();
    expect(collaborationScope.getByText("当前还没有自动执行记录。")).toBeInTheDocument();
    expect(collaborationScope.getAllByText("逻辑角色").length).toBeGreaterThan(0);
    expect(collaborationScope.getByText("Conductor")).toBeInTheDocument();
    expect(
      collaborationScope.getByText(
        "当前先按 2 条角色监督线推进；是否已有真实线程归属以 committed supervision truth 为准。"
      )
    ).toBeInTheDocument();
    const readyCommandScope = within(nextBestStepCard as HTMLElement);
    expect(readyCommandScope.getByText("补充说明")).toBeInTheDocument();
    expect(
      readyCommandScope.getByText("默认通过指挥官聊天推进。需要手动执行或查看原始动作时，请打开详情页。")
    ).toBeInTheDocument();
    expect(
      readyCommandScope.getByText("先复盘 accepted handoff 的边界")
    ).toBeInTheDocument();
    expect(
      readyCommandScope.getByText("整理 formal phase reset draft，再切入下一 phase")
    ).toBeInTheDocument();
    const acceptanceCard = screen.getByRole("heading", { name: "验收雷达" }).closest("article");
    expect(acceptanceCard).not.toBeNull();
    const acceptanceScope = within(acceptanceCard as HTMLElement);
    expect(acceptanceScope.getAllByText("已验收").length).toBe(4);
    expect(acceptanceScope.getByText("当前 slice 验收已完成。")).toBeInTheDocument();
  });

  it("shows paused recovery and waiting-for-result as different operator states", () => {
    const pausedState = {
      ...state,
      activeWork: {
        items: [
          {
            role: "executor",
            status: "running",
            taskSummary: "等待恢复后继续当前自动链路",
            requiresUserDecision: false
          }
        ],
        blockerSummary: null
      }
    };

    const pausedSupervisorState = deriveSupervisorState(
      pausedState,
      events,
      null,
      null,
      null,
      null,
      {
        phaseRunId: "phase-run-paused",
        projectRoot: "/tmp/project",
        status: "paused",
        currentRole: "verifier",
        currentSliceId: "repair-2",
        repairCount: 2,
        lockedPhaseSnapshotRef: ".threadsmith/phase-runs/phase-run-paused/locked-phase.json",
        latestSuccessfulRole: "reviewer",
        pauseReason: "验证失败，需要先修一轮。",
        resumeHint: "codex continue /tmp/project",
        workspacePath: "/tmp/project/.threadsmith-runtime/phase-run-paused",
        latestRunRef: ".threadsmith/runs/run-paused/result.json",
        eventRefs: [],
        startedAt: "2026-04-12T09:00:00.000Z",
        finishedAt: null
      },
      {
        phaseRunId: "phase-run-paused",
        type: "risk",
        role: "verifier",
        summary: "验证失败，需要先修一轮。",
        detail: "先修复失败项，再回到指挥入口显式 continue 当前自动链路。",
        resumeRequirements: ["修复失败测试", "重新运行 verification"],
        recommendedPrompt: "codex continue /tmp/project",
        createdAt: "2026-04-12T09:30:00.000Z"
      }
    );

    const runningSupervisorState = deriveSupervisorState(
      {
        ...state,
        activeWork: {
          items: [
            {
              role: "executor",
              status: "running",
              taskSummary: "Builder 正在实现当前 slice",
              requiresUserDecision: false
            }
          ],
          blockerSummary: null
        }
      },
      events,
      {
        runId: "run-running",
        projectRoot: "/tmp/project",
        role: "executor",
        provider: "codex",
        status: "running",
        createdAt: "2026-04-12T11:00:00.000Z",
        startedAt: "2026-04-12T11:00:00.000Z",
        finishedAt: null,
        packetPath: ".threadsmith/runs/run-running/packet.json",
        promptPath: ".threadsmith/runs/run-running/prompt.md",
        resultPath: null,
        summaryPath: null,
        stdoutPath: ".threadsmith/runs/run-running/stdout.log",
        stderrPath: ".threadsmith/runs/run-running/stderr.log",
        outcome: null,
        statusDetail: "Builder 正在实现当前 slice。"
      }
    );

    const { rerender } = render(
      <DeckScreen
        projectRoot="/tmp/project"
        currentProjectSourceId="custom-project"
        currentProjectSourceLabel="自定义项目"
        customProjectDraft="/tmp/project"
        customProjectError={null}
        customProjectErrorKind={null}
        isConnectingCustomProject={false}
        isInitializingCustomProject={false}
        recentProjects={[]}
        supervisorState={pausedSupervisorState}
        loading={false}
        error={null}
        errorKind={null}
        actionHistoryLength={0}
        onSelectProjectSource={vi.fn()}
        onCustomProjectDraftChange={vi.fn()}
        onConnectCustomProject={vi.fn()}
        onInitializeCustomProject={vi.fn()}
        onPinRecentProject={vi.fn()}
        onUnpinRecentProject={vi.fn()}
        onRemoveRecentProject={vi.fn()}
        onRunAction={async () => {}}
        onApplyTransition={async () => {}}
      />
    );

    expect(screen.getByText("等待恢复")).toBeInTheDocument();
    expect(screen.getByText("自动链路暂停")).toBeInTheDocument();
    expect(screen.getByText("先恢复再继续")).toBeInTheDocument();
    expect(
      screen.getByText("自动链路已经暂停，当前先补齐恢复条件；满足后回到指挥入口 continue 更稳。")
    ).toBeInTheDocument();

    rerender(
      <DeckScreen
        projectRoot="/tmp/project"
        currentProjectSourceId="custom-project"
        currentProjectSourceLabel="自定义项目"
        customProjectDraft="/tmp/project"
        customProjectError={null}
        customProjectErrorKind={null}
        isConnectingCustomProject={false}
        isInitializingCustomProject={false}
        recentProjects={[]}
        supervisorState={runningSupervisorState}
        loading={false}
        error={null}
        errorKind={null}
        actionHistoryLength={0}
        onSelectProjectSource={vi.fn()}
        onCustomProjectDraftChange={vi.fn()}
        onConnectCustomProject={vi.fn()}
        onInitializeCustomProject={vi.fn()}
        onPinRecentProject={vi.fn()}
        onUnpinRecentProject={vi.fn()}
        onRemoveRecentProject={vi.fn()}
        onRunAction={async () => {}}
        onApplyTransition={async () => {}}
      />
    );

    expect(screen.getAllByText("等待回流").length).toBeGreaterThan(1);
    expect(screen.getByText("结果回流中")).toBeInTheDocument();
    expect(screen.getByText("当前无需操作")).toBeInTheDocument();
    expect(
      screen.getByText("当前关键结果还在回流，先等待 committed truth 更新，再决定下一步更稳。")
    ).toBeInTheDocument();
  });

  it("renders fresh context status when current and role packets match truth", () => {
    const currentPacket = buildContextPacket(state, {
      generatedAt: "2026-04-04T00:10:00.000Z"
    });
    const rolePacket = deriveRoleContextPacket(currentPacket, "planner");

    render(
      <DeckScreen
        projectRoot="/tmp/project"
        currentProjectSourceId="fresh-demo"
        currentProjectSourceLabel="最新 packet 示例"
        customProjectDraft=""
        customProjectError={null}
        customProjectErrorKind={null}
        isConnectingCustomProject={false}
        isInitializingCustomProject={false}
        recentProjects={[]}
        supervisorState={deriveSupervisorState(
          state,
          events,
          null,
          null,
          projectSupervision,
          null,
          null,
          null,
          currentPacket,
          [rolePacket],
          true
        )}
        loading={false}
        error={null}
        errorKind={null}
        actionHistoryLength={0}
        onSelectProjectSource={vi.fn()}
        onCustomProjectDraftChange={vi.fn()}
        onConnectCustomProject={vi.fn()}
        onInitializeCustomProject={vi.fn()}
        onPinRecentProject={vi.fn()}
        onUnpinRecentProject={vi.fn()}
        onRemoveRecentProject={vi.fn()}
        onRunAction={async () => {}}
        onApplyTransition={async () => {}}
      />
    );

    const decisionCard = screen.getByRole("heading", { name: "推进判断" }).closest("article");
    expect(decisionCard).not.toBeNull();
    const decisionScope = within(decisionCard as HTMLElement);

    expect(decisionScope.getByText("Context truth 可继续使用")).toBeInTheDocument();
    expect(decisionScope.getAllByText("最新").length).toBeGreaterThanOrEqual(2);
    expect(decisionScope.getByText("规划")).toBeInTheDocument();
    expect(decisionScope.getByText("继续")).toBeInTheDocument();
  });

  it("opens a hygiene action preview from the context handling surface", () => {
    const onRunAction = vi.fn(async () => {});

    render(
      <DeckScreen
        projectRoot="/tmp/project"
        currentProjectSourceId="custom-project"
        currentProjectSourceLabel="自定义项目"
        customProjectDraft="/tmp/project"
        customProjectError={null}
        customProjectErrorKind={null}
        isConnectingCustomProject={false}
        isInitializingCustomProject={false}
        recentProjects={[]}
        supervisorState={deriveSupervisorState(
          state,
          events,
          null,
          null,
          projectSupervision,
          null,
          null,
          null,
          null,
          [],
          true
        )}
        loading={false}
        error={null}
        errorKind={null}
        actionHistoryLength={0}
        onSelectProjectSource={vi.fn()}
        onCustomProjectDraftChange={vi.fn()}
        onConnectCustomProject={vi.fn()}
        onInitializeCustomProject={vi.fn()}
        onPinRecentProject={vi.fn()}
        onUnpinRecentProject={vi.fn()}
        onRemoveRecentProject={vi.fn()}
        onRunAction={onRunAction}
        onApplyTransition={async () => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "阶段" }));
    const objectsDrawer = screen
      .getAllByText("当前阶段")
      .find((element) => element.closest(".inspector-panel"))
      ?.closest(".inspector-panel");
    expect(objectsDrawer).not.toBeNull();
    const objectsScope = within(objectsDrawer as HTMLElement);

    expect(objectsScope.getByText("建议先生成 Context Packet")).toBeInTheDocument();
    expect(objectsScope.getByText("打开 context sync 动作")).toBeInTheDocument();
    expect(
      objectsScope.getByText(/可以从 committed Threadsmith truth/)
    ).toBeInTheDocument();

    fireEvent.click(objectsScope.getByRole("button", { name: "打开 context sync 动作" }));

    expect(screen.getByText("动作确认")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "确认启动" }));
    expect(onRunAction).toHaveBeenCalledWith("sync-context", undefined);
  });

  it("keeps action count and latest deck action visible after a workflow action", () => {
    const actionEvents: WorkflowEvent[] = [
      {
        id: "deck-action-started",
        createdAt: "2026-04-04T00:06:00.000Z",
        kind: "deck-action",
        title: "执行流程已启动",
        detail: "实现当前这刀 narrow slice",
        role: "executor",
        actionId: "advance-phase"
      },
      ...events
    ];

    render(
      <DeckScreen
        projectRoot="/tmp/project"
        currentProjectSourceId="custom-project"
        currentProjectSourceLabel="自定义项目"
        customProjectDraft="/tmp/project"
        customProjectError={null}
        customProjectErrorKind={null}
        isConnectingCustomProject={false}
        isInitializingCustomProject={false}
        recentProjects={[]}
        supervisorState={deriveSupervisorState(
          {
            ...state,
            activeWork: {
              items: [
                {
                  role: "executor",
                  status: "running",
                  taskSummary: "实现当前这刀 narrow slice",
                  requiresUserDecision: false
                }
              ],
              blockerSummary: null
            }
          },
          actionEvents
        )}
        loading={false}
        error={null}
        errorKind={null}
        actionHistoryLength={1}
        onSelectProjectSource={vi.fn()}
        onCustomProjectDraftChange={vi.fn()}
        onConnectCustomProject={vi.fn()}
        onInitializeCustomProject={vi.fn()}
        onPinRecentProject={vi.fn()}
        onUnpinRecentProject={vi.fn()}
        onRemoveRecentProject={vi.fn()}
        onRunAction={async () => {}}
        onApplyTransition={async () => {}}
      />
    );

    expect(screen.getByLabelText("动作数 1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "证据" }));
    const eventsDrawerHeading = screen
      .getAllByText("证据与事件")
      .find((element) => element.closest(".inspector-panel"));
    const eventsDrawer = eventsDrawerHeading?.closest(".inspector-panel");
    expect(eventsDrawer).not.toBeNull();
    const eventsScope = within(eventsDrawer as HTMLElement);
    expect(eventsScope.getByText("执行流程已启动")).toBeInTheDocument();
    expect(eventsScope.getByText("实现当前这刀 narrow slice")).toBeInTheDocument();
  });
});
