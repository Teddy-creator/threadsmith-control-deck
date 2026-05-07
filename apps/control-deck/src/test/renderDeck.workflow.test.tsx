import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { WorkflowEvent } from "@threadsmith/domain";
import { deriveSupervisorState } from "@threadsmith/runtime";
import { describe, expect, it, vi } from "vitest";
import { DeckScreen } from "../App";
import {
  events,
  failedLatestRun,
  pausedPhaseRun,
  pausedPhaseRunPause,
  state
} from "./renderDeck.fixtures";
import { registerRenderDeckTestLifecycle } from "./renderDeck.helpers";

registerRenderDeckTestLifecycle();

describe("DeckScreen workflow", () => {
  it("keeps workflow transitions out of the homepage command card", () => {
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

    const commandCard = screen.getByText("当前总命令").closest("article");
    expect(commandCard).not.toBeNull();
    const commandScope = within(commandCard as HTMLElement);
    expect(commandScope.getByText("补充说明")).toBeInTheDocument();
    expect(
      commandScope.getByText(/当前有 1 个可签发动作，已收纳到详情页和工作台。默认先让指挥官继续推进。/)
    ).toBeInTheDocument();
    expect(
      commandScope.queryByRole("button", { name: "准备进入 Review" })
    ).not.toBeInTheDocument();
  });

  it("renders latest run details and agent-run labels in the evidence workspace", () => {
    const runEvents: WorkflowEvent[] = [
      {
        id: "agent-run-failed",
        createdAt: "2026-04-04T00:08:00.000Z",
        kind: "agent-run",
        title: "Codex Builder 运行失败",
        detail: "测试失败，当前 slice 还不能交给 review。",
        role: "executor",
        provider: "codex",
        runId: "run-fail",
        outcome: "failed"
      },
      ...events
    ];

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
          {
            ...state,
            activeWork: {
              items: [
                {
                  role: "executor",
                  status: "blocked",
                  taskSummary: "自动执行失败，等待修复后重试",
                  requiresUserDecision: false
                }
              ],
              blockerSummary: "测试失败，当前 slice 还不能交给 review。"
            }
          },
          runEvents,
          failedLatestRun
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

    const failedCommandCard = screen.getByText("当前总命令").closest("article");
    expect(failedCommandCard).not.toBeNull();
    const failedCommandScope = within(failedCommandCard as HTMLElement);
    expect(failedCommandScope.getByText("需要修复")).toBeInTheDocument();
    expect(failedCommandScope.getByText("当前异常")).toBeInTheDocument();
    expect(failedCommandScope.getAllByText("自动执行失败").length).toBeGreaterThan(0);
    expect(
      failedCommandScope.getByText("测试失败，当前 slice 还不能交给 review。")
    ).toBeInTheDocument();
    expect(
      failedCommandScope.getByRole("button", { name: "复制建议指令" })
    ).toBeInTheDocument();
    expect(
      failedCommandScope.getByText(
        "当前异常优先通过指挥官聊天处理；需要手动签发动作或调试执行桥时，请打开详情页。"
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "证据" }));
    const eventsDrawerHeading = screen
      .getAllByText("证据与事件")
      .find((element) => element.closest(".inspector-panel"));
    const eventsDrawer = eventsDrawerHeading?.closest(".inspector-panel");
    expect(eventsDrawer).not.toBeNull();
    const eventsScope = within(eventsDrawer as HTMLElement);

    expect(eventsScope.getByText("运行 ID · run-fail")).toBeInTheDocument();
    expect(eventsScope.getByText("错误日志")).toBeInTheDocument();
    expect(
      eventsScope.getByText(".threadsmith/runs/run-fail/stderr.log")
    ).toBeInTheDocument();
    expect(eventsScope.getAllByText("自动执行").length).toBeGreaterThan(0);
    expect(eventsScope.getByText("Codex Builder 运行失败")).toBeInTheDocument();
    expect(eventsScope.getAllByText("Codex").length).toBeGreaterThan(0);
  });

  it("surfaces review-blocked repair language on the homepage", () => {
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
            acceptanceState: {
              ...state.acceptanceState,
              implementationStatus: "ready-for-review",
              reviewStatus: "review-blocked",
              verificationStatus: "not-started",
              finalState: "review-blocked",
              knownGaps: ["Reviewer 发现阻塞：runtime selectors 还缺一个回归测试。"]
            },
            activeWork: {
              items: [
                {
                  role: "reviewer",
                  status: "blocked",
                  taskSummary: "等待修复阻塞性评审发现",
                  requiresUserDecision: false
                }
              ],
              blockerSummary: "Reviewer 发现阻塞：runtime selectors 还缺一个回归测试。"
            }
          },
          events
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

    const commandCard = screen.getByText("当前总命令").closest("article");
    expect(commandCard).not.toBeNull();
    const commandScope = within(commandCard as HTMLElement);
    expect(commandScope.getByText("解决阻塞性评审发现")).toBeInTheDocument();
    expect(commandScope.getAllByText("评审阻塞").length).toBeGreaterThan(0);
    expect(
      commandScope.getByText("Reviewer 发现阻塞：runtime selectors 还缺一个回归测试。")
    ).toBeInTheDocument();
    expect(
      commandScope.getByRole("button", { name: "复制建议指令" })
    ).toBeInTheDocument();
  });

  it("surfaces verification-failed repair language on the homepage", () => {
    const verificationFailedEvents: WorkflowEvent[] = [
      {
        id: "verifier-failed",
        createdAt: "2026-04-04T00:09:00.000Z",
        kind: "workflow-transition",
        title: "Verifier 未接受当前 claim",
        detail: "验证失败：runtime selectors 的回归测试仍然没有通过。",
        role: "verifier",
        transitionId: "verifier-failed"
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
            acceptanceState: {
              ...state.acceptanceState,
              implementationStatus: "ready-for-review",
              reviewStatus: "ready-for-verification",
              verificationStatus: "failed",
              finalState: "verification-failed"
            },
            activeWork: {
              items: [
                {
                  role: "verifier",
                  status: "blocked",
                  taskSummary: "等待修复 verification 失败原因",
                  requiresUserDecision: false
                }
              ],
              blockerSummary: "验证失败：runtime selectors 的回归测试仍然没有通过。"
            }
          },
          verificationFailedEvents
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

    const commandCard = screen.getByText("当前总命令").closest("article");
    expect(commandCard).not.toBeNull();
    const commandScope = within(commandCard as HTMLElement);
    expect(commandScope.getByText("修复 verification 缺口")).toBeInTheDocument();
    expect(commandScope.getAllByText("验证失败").length).toBeGreaterThan(0);
    expect(
      commandScope.getByText("验证失败：runtime selectors 的回归测试仍然没有通过。")
    ).toBeInTheDocument();
    expect(
      commandScope.getByRole("button", { name: "复制建议指令" })
    ).toBeInTheDocument();
  });

  it("progressively expands the events timeline and can collapse it back", () => {
    const expandedEvents: WorkflowEvent[] = [
      {
        id: "event-1",
        createdAt: "2026-04-04T00:03:00.000Z",
        kind: "workflow-transition",
        title: "Verifier 已接受当前 claim",
        detail: "最终接受前还需要完成 closeout。",
        role: "verifier",
        transitionId: "verifier-accepted"
      },
      {
        id: "event-2",
        createdAt: "2026-04-04T00:02:00.000Z",
        kind: "workflow-transition",
        title: "Closeout 已记录阶段收口",
        detail: "当前 slice 已写入最新收尾记录。",
        role: "closeout",
        transitionId: "closeout-recorded"
      },
      {
        id: "event-3",
        createdAt: "2026-04-04T00:01:00.000Z",
        kind: "deck-action",
        title: "Builder 输出了新的 packet",
        detail: "继续点已刷新到最新状态。",
        role: "executor"
      },
      {
        id: "event-4",
        createdAt: "2026-04-04T00:00:00.000Z",
        kind: "workflow-transition",
        title: "Reviewer 已放行这个 slice",
        detail: "Acceptance 已进入 ready-for-verification。",
        role: "reviewer",
        transitionId: "reviewer-ready-for-verification"
      },
      {
        id: "event-5",
        createdAt: "2026-04-03T23:59:00.000Z",
        kind: "deck-action",
        title: "Conductor 刷新了 task brief",
        detail: "当前任务边界与 done when 已重新对齐。",
        role: "planner"
      }
    ];

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
        supervisorState={deriveSupervisorState(state, expandedEvents)}
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

    fireEvent.click(screen.getByRole("button", { name: "证据" }));
    const eventsDrawerHeading = screen
      .getAllByText("证据与事件")
      .find((element) => element.closest(".inspector-panel"));
    const eventsDrawer = eventsDrawerHeading?.closest(".inspector-panel");
    expect(eventsDrawer).not.toBeNull();
    const eventsScope = within(eventsDrawer as HTMLElement);

    expect(eventsScope.getByText("已显示 3 / 5 条")).toBeInTheDocument();
    expect(eventsScope.getByText("展开更多")).toBeInTheDocument();
    expect(eventsScope.getAllByText("Verifier 已接受当前 claim").length).toBeGreaterThan(0);
    expect(eventsScope.getAllByText("Closeout 已记录阶段收口").length).toBeGreaterThan(0);
    expect(eventsScope.getAllByText("Builder 输出了新的 packet").length).toBeGreaterThan(0);
    expect(eventsScope.queryByText("Reviewer 已放行这个 slice")).not.toBeInTheDocument();
    expect(eventsScope.queryByText("Conductor 刷新了 task brief")).not.toBeInTheDocument();

    fireEvent.click(eventsScope.getByRole("button", { name: "展开更多" }));

    expect(eventsScope.getByText("已显示 5 / 5 条")).toBeInTheDocument();
    expect(eventsScope.getByRole("button", { name: "收起到最近 3 条" })).toBeInTheDocument();
    expect(eventsScope.getByText("Reviewer 已放行这个 slice")).toBeInTheDocument();
    expect(eventsScope.getByText("Conductor 刷新了 task brief")).toBeInTheDocument();

    fireEvent.click(eventsScope.getByRole("button", { name: "收起到最近 3 条" }));

    expect(eventsScope.getByText("已显示 3 / 5 条")).toBeInTheDocument();
    expect(eventsScope.getByText("展开更多")).toBeInTheDocument();
    expect(eventsScope.queryByText("Reviewer 已放行这个 slice")).not.toBeInTheDocument();
    expect(eventsScope.queryByText("Conductor 刷新了 task brief")).not.toBeInTheDocument();
  });

  it("surfaces paused autopilot truth on the homepage and in the phase workspace", () => {
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
                  role: "verifier",
                  status: "blocked",
                  taskSummary: "验证失败，需要先修一轮。",
                  requiresUserDecision: false
                }
              ],
              blockerSummary: null
            }
          },
          events,
          failedLatestRun,
          null,
          null,
          null,
          pausedPhaseRun,
          pausedPhaseRunPause
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
    expect(collaborationScope.getByText("自动链路")).toBeInTheDocument();
    expect(collaborationScope.getByText("已暂停")).toBeInTheDocument();
    expect(collaborationScope.getByText("验证")).toBeInTheDocument();
    expect(collaborationScope.getByText("修复 slice 2")).toBeInTheDocument();
    expect(collaborationScope.getByText("repair 第 2 轮")).toBeInTheDocument();
    expect(
      collaborationScope.getByText(
        /自动链路在 verifier 阶段命中风险规则，先修复失败项再 continue。/
      )
    ).toBeInTheDocument();
    expect(collaborationScope.getByText("最新角色运行")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "阶段" }));
    const phaseDrawerHeading = screen
      .getAllByText("当前阶段")
      .find((element) => element.closest(".inspector-panel"));
    const phaseDrawer = phaseDrawerHeading?.closest(".inspector-panel");
    expect(phaseDrawer).not.toBeNull();
    const phaseScope = within(phaseDrawer as HTMLElement);
    expect(phaseScope.getByText("Locked phase 快照")).toBeInTheDocument();
    expect(
      phaseScope.getByText(".threadsmith/phase-runs/phase-run-paused/locked-phase.json")
    ).toBeInTheDocument();
    expect(phaseScope.getByText("显式 continue")).toBeInTheDocument();
    expect(
      phaseScope.getByText("npm run threadsmith:autopilot -- continue /tmp/project")
    ).toBeInTheDocument();
  });
});
