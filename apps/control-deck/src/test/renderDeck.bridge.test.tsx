import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react";
import type { ProviderRouting, ProjectState } from "@threadsmith/domain";
import { deriveSupervisorState } from "@threadsmith/runtime";
import { describe, expect, it, vi } from "vitest";
import { App, DeckScreen } from "../App";
import {
  claudeExecutorRouting,
  claudeVerifierRouting,
  events,
  failedLatestRun,
  pausedPhaseRun,
  pausedPhaseRunPause,
  persistedCommandBridgeState,
  persistedReportingFailureBridgeState,
  projectSupervision,
  reportingFailureLatestRun,
  state
} from "./renderDeck.fixtures";
import {
  jsonResponse,
  registerRenderDeckTestLifecycle
} from "./renderDeck.helpers";

registerRenderDeckTestLifecycle();

describe("DeckScreen bridge", () => {
  it("surfaces conductor-first homepage actions and keeps direct execution in details", async () => {
    const onRunAction = vi.fn(async () => {});
    const onStartRun = vi.fn(async () => {});

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
              items: [],
              blockerSummary: null
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
        onRunAction={onRunAction}
        onStartRun={onStartRun}
        onApplyTransition={async () => {}}
      />
    );

    const commandCard = screen.getByText("当前总命令").closest("article");
    expect(commandCard).not.toBeNull();
    const commandScope = within(commandCard as HTMLElement);
    expect(commandScope.getByText("指挥入口")).toBeInTheDocument();
    expect(commandScope.getByText("Codex Desktop")).toBeInTheDocument();
    expect(commandScope.getByRole("button", { name: "复制建议指令" })).toBeInTheDocument();
    expect(commandScope.getByRole("button", { name: "查看为什么" })).toBeInTheDocument();
    expect(
      commandScope.queryByRole("button", { name: "开始执行" })
    ).not.toBeInTheDocument();

    fireEvent.click(commandScope.getByRole("button", { name: "查看为什么" }));
    expect(screen.getAllByText("推进参考").length).toBeGreaterThan(0);
    expect(screen.getByText("手动桥接（备用）")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "手动启动桥接" }));
    expect(screen.getByText("Command bridge 确认")).toBeInTheDocument();
    expect(screen.getAllByText("推荐路由").length).toBeGreaterThan(0);
    expect(screen.getAllByText("最近一次桥接结果").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Fallback / 出错后怎么办").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "按推荐路由签发" }));

    await waitFor(() => {
      expect(onRunAction).toHaveBeenCalledWith("advance-phase", undefined);
    });
    expect(onStartRun).not.toHaveBeenCalled();
    expect(screen.queryByText("Command bridge 确认")).not.toBeInTheDocument();
  });

  it("surfaces mixed-provider routing truth and blocks unsupported claude auto execution", async () => {
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
              items: [],
              blockerSummary: null
            }
          },
          events,
          null,
          null,
          projectSupervision,
          claudeExecutorRouting
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
        onStartRun={async () => {}}
        onApplyTransition={async () => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "项目" }));
    const projectDrawerHeading = screen
      .getAllByText("项目总况")
      .find((element) => element.closest(".inspector-panel"));
    const projectDrawer = projectDrawerHeading?.closest(".inspector-panel");
    expect(projectDrawer).not.toBeNull();
    const projectScope = within(projectDrawer as HTMLElement);

    expect(projectScope.getByText("混合 provider")).toBeInTheDocument();
    expect(projectScope.getAllByText("Claude CLI").length).toBeGreaterThan(0);
    expect(projectScope.getByText("当前使用方式")).toBeInTheDocument();
    expect(projectScope.getAllByText("外部 handoff").length).toBeGreaterThan(0);
    expect(
      projectScope.getByText("执行角色已路由到 Claude；可在桥接预览复制交接提示词后回到 Claude CLI 继续。")
    ).toBeInTheDocument();
    expect(
      projectScope.getByText("执行角色当前记为 Claude；可在桥接预览复制交接提示词后，回到 Claude CLI 继续推进。")
    ).toBeInTheDocument();
    expect(projectScope.getAllByText("Claude").length).toBeGreaterThan(0);
    expect(
      projectScope.getByText("当前为混合 provider 路由；非 Codex 角色已配置但暂不支持自动执行。")
    ).toBeInTheDocument();

    const commandCard = screen.getByText("当前总命令").closest("article");
    expect(commandCard).not.toBeNull();
    const commandScope = within(commandCard as HTMLElement);
    expect(commandScope.getByText("Claude CLI")).toBeInTheDocument();
    const collaborationCard = screen.getByRole("heading", { name: "协作现场" }).closest("article");
    expect(collaborationCard).not.toBeNull();
    const collaborationScope = within(collaborationCard as HTMLElement);
    expect(collaborationScope.getByText("最新桥接")).toBeInTheDocument();
    expect(collaborationScope.getByText("交接：交接已就绪")).toBeInTheDocument();
    expect(collaborationScope.getByText("回到当前入口（Claude CLI）")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "阶段" }));
    const phaseDrawerHeading = screen
      .getAllByText("当前阶段")
      .find((element) => element.closest(".inspector-panel"));
    const phaseDrawer = phaseDrawerHeading?.closest(".inspector-panel");
    expect(phaseDrawer).not.toBeNull();
    const phaseScope = within(phaseDrawer as HTMLElement);
    expect(phaseScope.getByText("当前推进方式")).toBeInTheDocument();
    expect(phaseScope.getAllByText("外部 handoff").length).toBeGreaterThan(0);
    expect(
      phaseScope.getByText("当前 phase 的执行线走外部 handoff；在桥接预览复制提示词后回到 Claude CLI 继续。")
    ).toBeInTheDocument();

    fireEvent.click(commandScope.getByRole("button", { name: "查看为什么" }));
    fireEvent.click(screen.getByRole("button", { name: "手动启动桥接" }));

    expect(screen.getAllByText("回到当前入口（Claude CLI）").length).toBeGreaterThan(0);
    expect(screen.getByText("交接提示词")).toBeInTheDocument();
    expect(
      screen.getByText("这条 provider 路由已经配置，但当前还不能由 Threadsmith 自动执行。把下面这段带回当前入口即可继续。")
    ).toBeInTheDocument();
    expect(screen.getByText(/项目：Threadsmith/)).toBeInTheDocument();
    expect(screen.getByText(/当前 phase：Build workflow loop/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "复制交接提示词" })
    ).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "直接启动 executor run" })
    ).not.toBeInTheDocument();
  });

  it("surfaces mixed-provider acceptance routing truth for non-executor gates", () => {
    const verificationState: ProjectState = {
      ...state,
      acceptanceState: {
        ...state.acceptanceState,
        implementationStatus: "ready-for-review",
        reviewStatus: "ready-for-verification",
        verificationStatus: "ready",
        finalState: "ready-for-verification"
      },
      activeWork: {
        items: [],
        blockerSummary: null
      }
    };

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
          verificationState,
          events,
          null,
          null,
          projectSupervision,
          claudeVerifierRouting
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

    fireEvent.click(screen.getByRole("button", { name: "验收" }));
    const acceptanceDrawerHeading = screen
      .getAllByText("验收状态")
      .find((element) => element.closest(".inspector-panel"));
    const acceptanceDrawer = acceptanceDrawerHeading?.closest(".inspector-panel");
    expect(acceptanceDrawer).not.toBeNull();
    const acceptanceScope = within(acceptanceDrawer as HTMLElement);

    expect(acceptanceScope.getByText("当前推进方式")).toBeInTheDocument();
    expect(acceptanceScope.getAllByText("验证").length).toBeGreaterThan(0);
    expect(acceptanceScope.getByText("验证 · Verifier")).toBeInTheDocument();
    expect(acceptanceScope.getByText("Claude CLI")).toBeInTheDocument();
    expect(acceptanceScope.getByText("指挥官流程", { exact: true })).toBeInTheDocument();
    expect(
      acceptanceScope.getByText(
        "当前验证逻辑上由 Claude Verifier 承接，但 Threadsmith 还不支持这道门的自动桥接；继续回到 Claude CLI 组织这一步。"
      )
    ).toBeInTheDocument();
  });

  it("shows dirty and saving states while provider routing is being saved", async () => {
    let resolveSave: ((value: ProviderRouting) => void) | null = null;

    const initialRouting: ProviderRouting = {
      planner: "codex",
      executor: "codex",
      reviewer: "codex",
      verifier: "codex",
      closeout: "codex",
      conductorSurface: "codex-desktop"
    };

    function RoutingEditorHarness() {
      const [routing, setRouting] = useState<ProviderRouting>(initialRouting);

      return (
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
                items: [],
                blockerSummary: null
              }
            },
            events,
            null,
            null,
            projectSupervision,
            routing
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
          onSaveProviderRouting={async () => {
            const savedValue = await new Promise<ProviderRouting>((resolve) => {
              resolveSave = resolve;
            });
            setRouting(savedValue);
            return savedValue;
          }}
        />
      );
    }

    render(<RoutingEditorHarness />);

    fireEvent.click(screen.getByRole("button", { name: "项目" }));
    const projectDrawerHeading = screen
      .getAllByText("项目总况")
      .find((element) => element.closest(".inspector-panel"));
    const projectDrawer = projectDrawerHeading?.closest(".inspector-panel");
    expect(projectDrawer).not.toBeNull();
    const projectScope = within(projectDrawer as HTMLElement);

    fireEvent.change(projectScope.getByRole("combobox", { name: "执行 provider" }), {
      target: { value: "claude" }
    });

    expect(projectScope.getByText("有未保存更改")).toBeInTheDocument();
    const saveButton = projectScope.getByRole("button", { name: "保存路由" });
    expect(saveButton).toBeEnabled();

    fireEvent.click(saveButton);

    expect(projectScope.getByText("保存中")).toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    resolveSave?.({
      ...initialRouting,
      executor: "claude"
    });

    await waitFor(() => {
      expect(projectScope.getByText("已同步")).toBeInTheDocument();
    });
  });

  it("shows save failure and can restore provider routing draft from committed truth", async () => {
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
              items: [],
              blockerSummary: null
            }
          },
          events,
          null,
          null,
          projectSupervision
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
        onSaveProviderRouting={async () => {
          throw new Error("保存 provider routing 失败（500）");
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "项目" }));
    const projectDrawerHeading = screen
      .getAllByText("项目总况")
      .find((element) => element.closest(".inspector-panel"));
    const projectDrawer = projectDrawerHeading?.closest(".inspector-panel");
    expect(projectDrawer).not.toBeNull();
    const projectScope = within(projectDrawer as HTMLElement);

    const executorSelect = projectScope.getByRole("combobox", {
      name: "执行 provider"
    }) as HTMLSelectElement;

    expect(executorSelect.value).toBe("codex");

    fireEvent.change(executorSelect, {
      target: { value: "claude" }
    });
    fireEvent.click(projectScope.getByRole("button", { name: "保存路由" }));

    await waitFor(() => {
      expect(projectScope.getByText("保存失败")).toBeInTheDocument();
    });

    expect(projectScope.getByText("保存 provider routing 失败（500）")).toBeInTheDocument();
    fireEvent.click(projectScope.getByRole("button", { name: "恢复当前 truth" }));

    await waitFor(() => {
      expect(projectScope.getByText("已同步")).toBeInTheDocument();
    });
    expect(executorSelect.value).toBe("codex");
  });

  it("applies workflow transitions from the acceptance workspace", async () => {
    const onApplyTransition = vi.fn(async () => {});

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
        onApplyTransition={onApplyTransition}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "验收" }));
    const acceptanceDrawerHeading = screen
      .getAllByText("验收状态")
      .find((element) => element.closest(".inspector-panel"));
    const acceptanceDrawer = acceptanceDrawerHeading?.closest(".inspector-panel");

    expect(acceptanceDrawer).not.toBeNull();

    fireEvent.click(
      within(acceptanceDrawer as HTMLElement).getByRole("button", {
        name: "准备进入 Review"
      })
    );

    await waitFor(() => {
      expect(onApplyTransition).toHaveBeenCalledWith(
        "executor-ready-for-review"
      );
    });
  });

  it("keeps non-automation primary actions in preview mode", () => {
    const onRunAction = vi.fn(async () => {});
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
    const readyEvents = [
      {
        id: "closeout-complete",
        createdAt: "2026-04-04T00:05:00.000Z",
        kind: "workflow-transition" as const,
        title: "Closeout 已完成",
        detail: "这个 slice 已经接受，并且可以 handoff 给下一 phase。",
        role: "closeout" as const,
        transitionId: "closeout-complete"
      },
      {
        id: "handoff-created",
        createdAt: "2026-04-04T00:06:00.000Z",
        kind: "deck-action" as const,
        title: "已创建 handoff packet",
        detail:
          "已为 phase「Build workflow loop」记录当前 truth，下一段 slice 可以从这份紧凑 packet 继续。 Packet：.threadsmith/packets/example-handoff.md",
        role: "hygiene" as const,
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
        onRunAction={onRunAction}
        onApplyTransition={async () => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "查看为什么" }));
    expect(screen.getAllByText("推进参考").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "手动确认这一步" }));

    expect(onRunAction).not.toHaveBeenCalled();
    expect(screen.getByText("动作确认")).toBeInTheDocument();
    expect(screen.getAllByText("起草下一刀并准备 phase reset").length).toBeGreaterThan(0);
    expect(screen.queryByText("直接运行 fallback")).not.toBeInTheDocument();
  });

  it("offers a direct executor-run fallback inside command bridge preview", async () => {
    const onRunAction = vi.fn(async () => {});
    const onStartRun = vi.fn(async () => {});

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
              items: [],
              blockerSummary: null
            }
          },
          events,
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
        onRunAction={onRunAction}
        onStartRun={onStartRun}
        onApplyTransition={async () => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "查看为什么" }));
    fireEvent.click(screen.getByRole("button", { name: "手动启动桥接" }));
    expect(screen.getByText("Command bridge 确认")).toBeInTheDocument();
    expect(screen.queryByText("最近一次桥接已完成")).not.toBeInTheDocument();
    expect(screen.getAllByText("最近一次桥接失败").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "直接启动 executor run" }));

    await waitFor(() => {
      expect(onStartRun).toHaveBeenCalledTimes(1);
    });
    expect(onRunAction).not.toHaveBeenCalled();
  });

  it("surfaces committed latest route truth and artifact paths inside command bridge preview", () => {
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
              items: [],
              blockerSummary: null
            }
          },
          events,
          failedLatestRun,
          persistedCommandBridgeState
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
        onStartRun={async () => {}}
        onApplyTransition={async () => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "查看为什么" }));
    fireEvent.click(screen.getByRole("button", { name: "手动启动桥接" }));

    expect(screen.getAllByText("最近一次桥接路由").length).toBeGreaterThan(0);
    expect(screen.getAllByText("最近一次桥接路由失败").length).toBeGreaterThan(0);
    expect(
      screen.getByText(".threadsmith/bridges/2026-04-04T00-05-00-000Z-deck-action-bridge.md")
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("失败结果已经写回 committed truth。").length
    ).toBeGreaterThan(0);
  });

  it("renders classified reporting-failure labels in the bridge result card", () => {
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
          reportingFailureLatestRun,
          persistedReportingFailureBridgeState
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

    fireEvent.click(screen.getByRole("button", { name: "查看为什么" }));
    fireEvent.click(screen.getByRole("button", { name: "手动启动桥接" }));

    expect(screen.getAllByText("最近一次桥接卡在结果上报").length).toBeGreaterThan(0);
    expect(screen.getAllByText("任务体已完成").length).toBeGreaterThan(0);
    expect(screen.getAllByText("失败于结果上报").length).toBeGreaterThan(0);
    expect(screen.getAllByText("rate limit").length).toBeGreaterThan(0);
  });

  it("shows an honesty note when the latest run is newer than the latest route", () => {
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
              items: [],
              blockerSummary: null
            }
          },
          events,
          {
            ...reportingFailureLatestRun,
            runId: "run-live",
            status: "succeeded",
            outcome: "succeeded",
            taskOutcome: undefined,
            failureStage: null,
            failureKind: null,
            createdAt: "2026-04-13T03:59:00.000Z",
            startedAt: "2026-04-13T03:59:05.000Z",
            finishedAt: "2026-04-13T04:00:23.000Z",
            resultPath: ".threadsmith/runs/run-live/result.json",
            summaryPath: ".threadsmith/runs/run-live/result.md",
            statusDetail: "self-host smoke 已完成。"
          },
          {
            latestRoute: {
              ...persistedCommandBridgeState.latestRoute!,
              status: "succeeded",
              runId: "run-older",
              statusDetail: "这是一条更早的 deck bridge route。"
            },
            latestRun: {
              runId: "run-live",
              routeId: null,
              provider: "codex",
              role: "executor",
              status: "succeeded",
              summary: "self-host smoke 已完成。",
              recordedAt: "2026-04-13T04:00:23.000Z",
              artifactPath: ".threadsmith/runs/run-live/result.md",
              truthWritebackStatus: "written"
            },
            updatedAt: "2026-04-13T04:00:23.000Z"
          }
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

    fireEvent.click(screen.getByRole("button", { name: "查看为什么" }));
    fireEvent.click(screen.getByRole("button", { name: "手动启动桥接" }));

    expect(
      screen.getAllByText(
        (content) =>
          content.includes("这次最新运行没有刷新 latestRoute") &&
          content.includes("最近桥接仍停留在更早的一轮")
      ).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        (content) =>
          content.includes("这是一条更早的 deck bridge route") &&
          content.includes("不是最新运行对应的桥接记录")
      ).length
    ).toBeGreaterThan(0);
  });

  it("renders latest bridge details in the evidence workspace", () => {
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
              items: [],
              blockerSummary: null
            }
          },
          events,
          failedLatestRun,
          persistedCommandBridgeState,
          projectSupervision
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

    fireEvent.click(screen.getByRole("button", { name: "证据" }));
    const eventsDrawerHeading = screen
      .getAllByText("证据与事件")
      .find((element) => element.closest(".inspector-panel"));
    const eventsDrawer = eventsDrawerHeading?.closest(".inspector-panel");
    expect(eventsDrawer).not.toBeNull();
    const eventsScope = within(eventsDrawer as HTMLElement);

    expect(eventsScope.getByText("最新桥接")).toBeInTheDocument();
    expect(eventsScope.getByText("最近一次桥接路由失败")).toBeInTheDocument();
    expect(eventsScope.getByText("自动执行")).toBeInTheDocument();
    expect(eventsScope.getByText("Deck 推荐动作 -> Codex CLI")).toBeInTheDocument();
    expect(
      eventsScope.getByText(".threadsmith/bridges/2026-04-04T00-05-00-000Z-deck-action-bridge.md")
    ).toBeInTheDocument();
  });

  it("keeps latest role run distinct from the overall autopilot chain in the evidence workspace", () => {
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
          persistedCommandBridgeState,
          projectSupervision,
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

    fireEvent.click(screen.getByRole("button", { name: "证据" }));
    const eventsDrawerHeading = screen
      .getAllByText("证据与事件")
      .find((element) => element.closest(".inspector-panel"));
    const eventsDrawer = eventsDrawerHeading?.closest(".inspector-panel");
    expect(eventsDrawer).not.toBeNull();
    const eventsScope = within(eventsDrawer as HTMLElement);

    expect(eventsScope.getByText("最新角色运行")).toBeInTheDocument();
    expect(eventsScope.getByText("自动链路")).toBeInTheDocument();
    expect(eventsScope.getByText("自动链路暂停在验证")).toBeInTheDocument();
    expect(eventsScope.getByText("修复 slice 2 · repair 第 2 轮")).toBeInTheDocument();
    expect(eventsScope.getByText("暂停与恢复")).toBeInTheDocument();
    expect(eventsScope.getByText("npm run threadsmith:autopilot -- continue /tmp/project")).toBeInTheDocument();
    expect(eventsScope.getByText("Locked phase 快照")).toBeInTheDocument();
  });
});

describe("App bridge", () => {
  it("persists provider routing edits through the bridge and refreshes routing-dependent preview", async () => {
    const routeableState: ProjectState = {
      ...state,
      activeWork: {
        items: [],
        blockerSummary: null
      }
    };
    let providerRouting: ProviderRouting = {
      planner: "codex",
      executor: "codex",
      reviewer: "codex",
      verifier: "codex",
      closeout: "codex",
      conductorSurface: "codex-desktop"
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const url = new URL(requestUrl, "http://localhost");

      if (url.pathname === "/api/threadsmith/provider-routing") {
        if (init?.method === "POST") {
          const body = JSON.parse(String(init.body)) as { value: ProviderRouting };
          providerRouting = body.value;
          return jsonResponse(providerRouting);
        }

        return jsonResponse(providerRouting);
      }

      if (url.pathname === "/api/threadsmith/state") {
        return jsonResponse({
          projectRoot: url.searchParams.get("projectRoot") ?? "/tmp/demo-project",
          state: routeableState,
          providerRouting,
          recentEvents: events,
          actionHistoryLength: 0
        });
      }

      throw new Error(`Unexpected request: ${url.pathname}`);
    });

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn()
      }
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await screen.findByText("当前总命令");

    fireEvent.click(screen.getByRole("button", { name: "项目" }));
    const projectDrawerHeading = screen
      .getAllByText("项目总况")
      .find((element) => element.closest(".inspector-panel"));
    const projectDrawer = projectDrawerHeading?.closest(".inspector-panel");
    expect(projectDrawer).not.toBeNull();
    const projectScope = within(projectDrawer as HTMLElement);

    fireEvent.change(projectScope.getByRole("combobox", { name: "执行 provider" }), {
      target: { value: "claude" }
    });
    fireEvent.click(projectScope.getByRole("button", { name: "保存路由" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/threadsmith/provider-routing?projectRoot="),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("\"executor\":\"claude\"")
        })
      );
    });

    await waitFor(() => {
      expect(projectScope.getByText("已同步")).toBeInTheDocument();
    });
    expect(projectScope.getByText("当前使用方式")).toBeInTheDocument();
    expect(projectScope.getAllByText("外部 handoff").length).toBeGreaterThan(0);
    expect(
      projectScope.getByText("执行角色已路由到 Claude；可在桥接预览复制交接提示词后回到 Codex Desktop 继续。")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "查看为什么" }));
    fireEvent.click(screen.getByRole("button", { name: "手动启动桥接" }));

    expect(
      screen.getByRole("button", { name: "复制交接提示词" })
    ).toBeEnabled();
    expect(screen.getByText("交接提示词")).toBeInTheDocument();
  });
});
