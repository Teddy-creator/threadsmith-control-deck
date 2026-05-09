import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { deriveSupervisorState } from "@threadsmith/runtime";
import { describe, expect, it, vi } from "vitest";
import { DeckScreen } from "../App";
import { APP_HOME_PROJECT_ROOT } from "../features/deck/projectRoots";
import { events, state } from "./renderDeck.fixtures";
import { registerRenderDeckTestLifecycle } from "./renderDeck.helpers";

registerRenderDeckTestLifecycle();

describe("DeckScreen projects", () => {
  it("supports drafting and connecting a custom project, including recent roots", () => {
    const onConnectCustomProject = vi.fn();
    const onInitializeCustomProject = vi.fn();
    const onPinRecentProject = vi.fn();
    const onUnpinRecentProject = vi.fn();
    const onRemoveRecentProject = vi.fn();
    const onSetDailyEntryProject = vi.fn();
    const onClearDailyEntryProject = vi.fn();

    function Harness() {
      const [draft, setDraft] = useState("");

      return (
        <DeckScreen
          projectRoot="/tmp/project"
          currentProjectSourceId="fresh-demo"
          currentProjectSourceLabel="Demo：已收口项目"
          dailyEntryProjectRoot="/tmp/recent-beta"
          customProjectDraft={draft}
          customProjectError={null}
          customProjectErrorKind={null}
          isConnectingCustomProject={false}
          isInitializingCustomProject={false}
          recentProjects={[
            { projectRoot: "/tmp/recent-alpha", pinned: true },
            { projectRoot: "/tmp/recent-beta", pinned: false }
          ]}
          supervisorState={deriveSupervisorState(state, events)}
          loading={false}
          error={null}
          errorKind={null}
          actionHistoryLength={0}
          onSelectProjectSource={vi.fn()}
          onCustomProjectDraftChange={setDraft}
          onConnectCustomProject={onConnectCustomProject}
          onInitializeCustomProject={onInitializeCustomProject}
          onPinRecentProject={onPinRecentProject}
          onUnpinRecentProject={onUnpinRecentProject}
          onRemoveRecentProject={onRemoveRecentProject}
          onSetDailyEntryProject={onSetDailyEntryProject}
          onClearDailyEntryProject={onClearDailyEntryProject}
          onRunAction={async () => {}}
          onApplyTransition={async () => {}}
        />
      );
    }

    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "来源：Demo：已收口项目" }));
    const projectsDrawer = screen.getByText("项目与来源").closest(".inspector-panel");
    expect(projectsDrawer).not.toBeNull();
    const projectsScope = within(projectsDrawer as HTMLElement);
    fireEvent.click(projectsScope.getByRole("button", { name: /自定义项目/i }));
    expect(projectsScope.getByText("推荐进入路径")).toBeInTheDocument();
    expect(projectsScope.getByText("日常进入项目")).toBeInTheDocument();
    expect(screen.getByText("这是一个已收口项目的学习示例")).toBeInTheDocument();
    expect(screen.getByText("Demo mode")).toBeInTheDocument();
    expect(screen.getByText("examples/project-state/.threadsmith")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开 /tmp/recent-alpha" })).toBeInTheDocument();

    const input = screen.getByRole("textbox", { name: /项目根目录/i });
    fireEvent.change(input, { target: { value: "/tmp/live-project" } });

    expect(screen.getByDisplayValue("/tmp/live-project")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /连接项目/i }));
    expect(onConnectCustomProject).toHaveBeenCalledWith("/tmp/live-project");

    fireEvent.click(screen.getByRole("button", { name: "打开 /tmp/recent-alpha" }));
    expect(onConnectCustomProject).toHaveBeenCalledWith("/tmp/recent-alpha");

    fireEvent.click(screen.getByRole("button", { name: "取消默认" }));
    expect(onClearDailyEntryProject).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "取消固定 /tmp/recent-alpha" }));
    expect(onUnpinRecentProject).toHaveBeenCalledWith("/tmp/recent-alpha");

    fireEvent.click(screen.getByRole("button", { name: "固定 /tmp/recent-beta" }));
    expect(onPinRecentProject).toHaveBeenCalledWith("/tmp/recent-beta");

    fireEvent.click(screen.getByRole("button", { name: "设为默认 /tmp/recent-alpha" }));
    expect(onSetDailyEntryProject).toHaveBeenCalledWith("/tmp/recent-alpha");

    fireEvent.click(screen.getByRole("button", { name: "移除 /tmp/recent-beta" }));
    expect(onRemoveRecentProject).toHaveBeenCalledWith("/tmp/recent-beta");
    expect(
      screen.getByText(
        "固定的项目会排在顶部。默认进入项目会在没有显式覆盖时优先打开。移除只清掉入口，不会断开当前连接。"
      )
    ).toBeInTheDocument();
  });

  it("marks the connected custom project inside recent projects without reconnecting it", () => {
    const onConnectCustomProject = vi.fn();
    const onSetDailyEntryProject = vi.fn();

    render(
      <DeckScreen
        projectRoot="/tmp/recent-alpha"
        currentProjectSourceId="custom-project"
        currentProjectSourceLabel="自定义项目"
        dailyEntryProjectRoot={null}
        customProjectDraft="/tmp/recent-alpha"
        customProjectError={null}
        customProjectErrorKind={null}
        isConnectingCustomProject={false}
        isInitializingCustomProject={false}
        recentProjects={[
          { projectRoot: "/tmp/recent-alpha", pinned: true },
          { projectRoot: "/tmp/recent-beta", pinned: false }
        ]}
        supervisorState={deriveSupervisorState(state, events)}
        loading={false}
        error={null}
        errorKind={null}
        actionHistoryLength={0}
        onSelectProjectSource={vi.fn()}
        onCustomProjectDraftChange={vi.fn()}
        onConnectCustomProject={onConnectCustomProject}
        onInitializeCustomProject={vi.fn()}
        onPinRecentProject={vi.fn()}
        onUnpinRecentProject={vi.fn()}
        onRemoveRecentProject={vi.fn()}
        onSetDailyEntryProject={onSetDailyEntryProject}
        onRunAction={async () => {}}
        onApplyTransition={async () => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "来源：自定义项目" }));
    const projectsDrawer = screen.getByText("项目与来源").closest(".inspector-panel");
    expect(projectsDrawer).not.toBeNull();
    const projectsScope = within(projectsDrawer as HTMLElement);
    fireEvent.click(projectsScope.getByRole("button", { name: /自定义项目/i }));

    expect(screen.getByRole("button", { name: "当前项目 /tmp/recent-alpha" })).toBeDisabled();
    expect(screen.getAllByText("当前").length).toBeGreaterThan(0);
    expect(screen.getAllByText("固定").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "打开 /tmp/recent-beta" })).toBeEnabled();
    expect(screen.getByText("当前正在查看 recent-alpha")).toBeInTheDocument();
    const liveStatusCard = screen
      .getByText("当前项目状态")
      .closest(".scenario-live-status");

    expect(liveStatusCard).not.toBeNull();
    expect(
      within(liveStatusCard as HTMLElement).getByText("Build workflow loop")
    ).toBeInTheDocument();
    expect(
      within(liveStatusCard as HTMLElement).getByText("通过")
    ).toBeInTheDocument();
    expect(
      within(liveStatusCard as HTMLElement).getByText("缺少继续点")
    ).toBeInTheDocument();
    const onboardingCard = screen
      .getByText("这次接入已经成功，建议顺手设成默认进入")
      .closest(".rounded-xl");
    expect(onboardingCard).not.toBeNull();
    fireEvent.click(
      within(onboardingCard as HTMLElement).getByRole("button", {
        name: "设为默认进入"
      })
    );
    expect(onSetDailyEntryProject).toHaveBeenCalledWith("/tmp/recent-alpha");
    expect(onConnectCustomProject).not.toHaveBeenCalled();
  });

  it("keeps recovery controls visible when a custom project connection fails", () => {
    const onInitializeCustomProject = vi.fn();

    render(
      <DeckScreen
        projectRoot="/tmp/broken-project"
        currentProjectSourceId="custom-project"
        currentProjectSourceLabel="自定义项目"
        customProjectDraft="/tmp/broken-project"
        customProjectError={`在 "/tmp/broken-project" 找不到 Threadsmith 状态。`}
        customProjectErrorKind="missing-state"
        isConnectingCustomProject={false}
        isInitializingCustomProject={false}
        recentProjects={[
          { projectRoot: "/tmp/recent-alpha", pinned: false }
        ]}
        supervisorState={null}
        loading={false}
        error={`在 "/tmp/broken-project" 找不到 Threadsmith 状态。`}
        errorKind="missing-state"
        actionHistoryLength={0}
        onSelectProjectSource={vi.fn()}
        onCustomProjectDraftChange={vi.fn()}
        onConnectCustomProject={vi.fn()}
        onInitializeCustomProject={onInitializeCustomProject}
        onPinRecentProject={vi.fn()}
        onUnpinRecentProject={vi.fn()}
        onRemoveRecentProject={vi.fn()}
        onRunAction={async () => {}}
        onApplyTransition={async () => {}}
      />
    );

    expect(screen.getByText("工作区不可用")).toBeInTheDocument();
    expect(screen.getByText("无法加载项目状态")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "来源：自定义项目" }));
    expect(screen.getByRole("button", { name: /连接项目/i })).toBeInTheDocument();
    expect(screen.getByText("这个目录还没接入 Threadsmith")).toBeInTheDocument();
    expect(
      screen.getByText("推荐下一步：先点击“初始化 Threadsmith”，创建最小状态后，再从这个目录继续。")
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /项目根目录/i })).toHaveValue(
      "/tmp/broken-project"
    );
    expect(screen.getByRole("alert")).toHaveTextContent("无法连接这个项目");

    const onboardingCard = screen
      .getByText("这个目录已经找到，只差初始化 Threadsmith")
      .closest(".rounded-xl");
    expect(onboardingCard).not.toBeNull();
    fireEvent.click(
      within(onboardingCard as HTMLElement).getByRole("button", {
        name: "初始化 Threadsmith"
      })
    );
    expect(onInitializeCustomProject).toHaveBeenCalledWith("/tmp/broken-project");
  });

  it("shows first-run onboarding on app-home and focuses the connect input", () => {
    render(
      <DeckScreen
        projectRoot={APP_HOME_PROJECT_ROOT}
        currentProjectSourceId="app-home"
        currentProjectSourceLabel="前门入口"
        dailyEntryProjectRoot={null}
        entryModePreference="app-home"
        customProjectDraft=""
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
        onSetDailyEntryProject={vi.fn()}
        onClearDailyEntryProject={vi.fn()}
        onRunAction={async () => {}}
        onApplyTransition={async () => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "来源：前门入口" }));

    const onboardingCard = screen
      .getByText("先把第一个真实项目接进 Threadsmith")
      .closest(".rounded-xl");
    expect(onboardingCard).not.toBeNull();
    expect(
      within(onboardingCard as HTMLElement).getByText("填写真实项目根目录")
    ).toBeInTheDocument();
    expect(screen.getAllByText("./Open-Threadsmith-App.command").length).toBeGreaterThan(0);

    fireEvent.click(
      within(onboardingCard as HTMLElement).getByRole("button", {
        name: "填写项目根目录"
      })
    );

    expect(screen.getByRole("textbox", { name: "项目根目录" })).toHaveFocus();
  });

  it("shows repair onboarding that can send the operator back to a usable recent project", () => {
    const onConnectCustomProject = vi.fn();

    render(
      <DeckScreen
        projectRoot="/tmp/broken-project"
        currentProjectSourceId="custom-project"
        currentProjectSourceLabel="自定义项目"
        customProjectDraft="/tmp/broken-project"
        customProjectError={`Threadsmith 在 "/tmp/broken-project" 找到了状态文件，但其中至少有一个文件无效或不完整。`}
        customProjectErrorKind="invalid-state"
        isConnectingCustomProject={false}
        isInitializingCustomProject={false}
        recentProjects={[{ projectRoot: "/tmp/recent-alpha", pinned: false }]}
        supervisorState={null}
        loading={false}
        error={`Threadsmith 在 "/tmp/broken-project" 找到了状态文件，但其中至少有一个文件无效或不完整。`}
        errorKind="invalid-state"
        actionHistoryLength={0}
        onSelectProjectSource={vi.fn()}
        onCustomProjectDraftChange={vi.fn()}
        onConnectCustomProject={onConnectCustomProject}
        onInitializeCustomProject={vi.fn()}
        onPinRecentProject={vi.fn()}
        onUnpinRecentProject={vi.fn()}
        onRemoveRecentProject={vi.fn()}
        onRunAction={async () => {}}
        onApplyTransition={async () => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "来源：自定义项目" }));

    const onboardingCard = screen
      .getByText("先回到可用项目，或修复当前目录再继续")
      .closest(".rounded-xl");
    expect(onboardingCard).not.toBeNull();
    expect(
      within(onboardingCard as HTMLElement).getByText("先回到最近项目 recent-alpha")
    ).toBeInTheDocument();

    fireEvent.click(
      within(onboardingCard as HTMLElement).getByRole("button", {
        name: "继续最近项目 recent-alpha"
      })
    );

    expect(onConnectCustomProject).toHaveBeenCalledWith("/tmp/recent-alpha");
  });

  it("lets the operator switch the daily opening mode in 项目与来源", () => {
    const onSetEntryModePreference = vi.fn();

    render(
      <DeckScreen
        projectRoot="/tmp/project"
        currentProjectSourceId="app-home"
        currentProjectSourceLabel="前门入口"
        dailyEntryProjectRoot="/tmp/daily-entry"
        entryModePreference="app-home"
        customProjectDraft=""
        customProjectError={null}
        customProjectErrorKind={null}
        isConnectingCustomProject={false}
        isInitializingCustomProject={false}
        recentProjects={[{ projectRoot: "/tmp/recent-alpha", pinned: false }]}
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
        onSetDailyEntryProject={vi.fn()}
        onClearDailyEntryProject={vi.fn()}
        onSetEntryModePreference={onSetEntryModePreference}
        onRunAction={async () => {}}
        onApplyTransition={async () => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "来源：前门入口" }));

    expect(screen.getByText("日常打开方式")).toBeInTheDocument();
    expect(screen.getByText("前门优先")).toBeInTheDocument();
    expect(
      screen.getByText("普通打开 Threadsmith 时，会先回到前门入口，再从这里决定今天进入哪个真实项目。")
    ).toBeInTheDocument();
    expect(screen.getAllByText("./Open-Threadsmith-App.command").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('./Launch-Threadsmith.command "/path/to/project"').length
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "设为直达默认项目" }));

    expect(onSetEntryModePreference).toHaveBeenCalledWith("direct-project");
  });

  it("shows an install CTA in 项目与来源 when Threadsmith is promptable", () => {
    const onTriggerInstall = vi.fn(async () => {});

    render(
      <DeckScreen
        projectRoot={APP_HOME_PROJECT_ROOT}
        currentProjectSourceId="app-home"
        currentProjectSourceLabel="前门入口"
        dailyEntryProjectRoot="/tmp/daily-entry"
        entryModePreference="app-home"
        customProjectDraft=""
        customProjectError={null}
        customProjectErrorKind={null}
        isConnectingCustomProject={false}
        isInitializingCustomProject={false}
        recentProjects={[{ projectRoot: "/tmp/recent-alpha", pinned: false }]}
        installSurface={{
          status: "promptable",
          tone: "blue",
          badgeLabel: "可安装",
          title: "把 Threadsmith 固定成日常入口",
          detail: "当前浏览器已经允许把 Threadsmith 固定成更像独立入口的打开方式。",
          hint: "这不会把 Threadsmith 变成原生桌面壳。",
          actionLabel: "安装 Threadsmith"
        }}
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
        onSetDailyEntryProject={vi.fn()}
        onClearDailyEntryProject={vi.fn()}
        onSetEntryModePreference={vi.fn()}
        onTriggerInstall={onTriggerInstall}
        onRunAction={async () => {}}
        onApplyTransition={async () => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "来源：前门入口" }));

    expect(screen.getByText("安装与固定")).toBeInTheDocument();
    expect(screen.getByText("可安装")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "安装 Threadsmith" }));

    expect(onTriggerInstall).toHaveBeenCalled();
  });

  it("shows installed and manual fallback install guidance honestly", () => {
    const { rerender } = render(
      <DeckScreen
        projectRoot={APP_HOME_PROJECT_ROOT}
        currentProjectSourceId="app-home"
        currentProjectSourceLabel="前门入口"
        dailyEntryProjectRoot="/tmp/daily-entry"
        entryModePreference="app-home"
        customProjectDraft=""
        customProjectError={null}
        customProjectErrorKind={null}
        isConnectingCustomProject={false}
        isInitializingCustomProject={false}
        recentProjects={[{ projectRoot: "/tmp/recent-alpha", pinned: false }]}
        installSurface={{
          status: "installed",
          tone: "green",
          badgeLabel: "已作为固定入口打开",
          title: "Threadsmith 已在独立窗口中打开",
          detail: "你现在看到的是浏览器安装或固定后的独立入口。",
          hint: "这仍然是 web 入口，不是原生桌面壳，但已经足够作为稳定的日常前门。",
          actionLabel: null
        }}
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
        onSetDailyEntryProject={vi.fn()}
        onClearDailyEntryProject={vi.fn()}
        onSetEntryModePreference={vi.fn()}
        onRunAction={async () => {}}
        onApplyTransition={async () => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "来源：前门入口" }));
    expect(screen.getByText("已作为固定入口打开")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "安装 Threadsmith" })).not.toBeInTheDocument();

    rerender(
      <DeckScreen
        projectRoot={APP_HOME_PROJECT_ROOT}
        currentProjectSourceId="app-home"
        currentProjectSourceLabel="前门入口"
        dailyEntryProjectRoot="/tmp/daily-entry"
        entryModePreference="app-home"
        customProjectDraft=""
        customProjectError={null}
        customProjectErrorKind={null}
        isConnectingCustomProject={false}
        isInitializingCustomProject={false}
        recentProjects={[{ projectRoot: "/tmp/recent-alpha", pinned: false }]}
        installSurface={{
          status: "manual",
          tone: "zinc",
          badgeLabel: "手动固定",
          title: "先把 Threadsmith 固定成稳定入口",
          detail: "当前浏览器没有直接弹出安装提示时，也可以从浏览器菜单里手动安装。",
          hint: "推荐路径：浏览器菜单里的“安装 Threadsmith”，或固定当前标签页。",
          actionLabel: null
        }}
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
        onSetDailyEntryProject={vi.fn()}
        onClearDailyEntryProject={vi.fn()}
        onSetEntryModePreference={vi.fn()}
        onRunAction={async () => {}}
        onApplyTransition={async () => {}}
      />
    );

    expect(screen.getByText("手动固定")).toBeInTheDocument();
    expect(screen.getByText("先把 Threadsmith 固定成稳定入口")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "安装 Threadsmith" })).not.toBeInTheDocument();
  });

  it("offers a top-bar refresh button when the project is connected", () => {
    const onReloadProject = vi.fn(async () => {});

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
        refreshing={false}
        error={null}
        errorKind={null}
        lastLoadedAt={Date.parse("2026-04-13T12:34:56+08:00")}
        actionHistoryLength={0}
        onSelectProjectSource={vi.fn()}
        onCustomProjectDraftChange={vi.fn()}
        onConnectCustomProject={vi.fn()}
        onInitializeCustomProject={vi.fn()}
        onPinRecentProject={vi.fn()}
        onUnpinRecentProject={vi.fn()}
        onRemoveRecentProject={vi.fn()}
        onReloadProject={onReloadProject}
        onRunAction={async () => {}}
        onApplyTransition={async () => {}}
      />
    );

    expect(screen.getByText(/已同步/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "刷新状态" }));
    expect(onReloadProject).toHaveBeenCalledTimes(1);
  });
});
