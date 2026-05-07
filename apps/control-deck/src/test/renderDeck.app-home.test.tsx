import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ProjectState } from "@threadsmith/domain";
import { deriveSupervisorState } from "@threadsmith/runtime";
import { describe, expect, it, vi } from "vitest";
import { App, DeckScreen } from "../App";
import { APP_HOME_PROJECT_ROOT } from "../features/deck/projectRoots";
import { events, state } from "./renderDeck.fixtures";
import {
  jsonResponse,
  registerRenderDeckTestLifecycle
} from "./renderDeck.helpers";

registerRenderDeckTestLifecycle();

describe("App home", () => {
  it("lets the user initialize a missing custom project and then loads it", async () => {
    const initializedState: ProjectState = {
      projectBrief: {
        projectGoal: "让 live-project 接入 Threadsmith 工作流",
        currentVersionScope: "真实项目已接入 Threadsmith，等待定义第一条可执行 slice。",
        nonGoals: [
          "在初始化阶段自动推断整个仓库的需求",
          "直接开始大范围实现"
        ],
        keyConstraints: [
          "初始化只补齐最小状态文件，不覆盖已有 Threadsmith truth",
          "先定义一个窄 phase，再推进真实编码工作"
        ],
        successFrame:
          "你能在 deck 里看到这个真实项目，并且当前总命令已经指向第一条可执行 slice。",
        priorityOrder: [
          "建立项目简报",
          "定义当前 phase",
          "开始第一条窄实现线"
        ],
        openStrategicQuestions: []
      },
      projectStatus: {
        projectLabel: "live-project",
        currentTrack: "Threadsmith workflow 接入",
        overallState: "planning",
        currentFocus: "为 live-project 定义第一条可执行 phase 与 task brief",
        projectStatusSummary: "live-project 已接入 Threadsmith，正在准备第一条真实开发线。",
        latestAcceptedSlice: null,
        nextPlannedSlice: {
          title: "定义第一个 Threadsmith slice",
          recordedAt: null
        },
        topRisks: [
          "还没有针对当前项目的具体 task brief",
          "还没有第一轮实现与验证证据"
        ],
        updatedAt: null
      },
      projectRoadmap: {
        versionLabel: "live-project v1",
        finalGoal: "你能在 deck 里看到这个真实项目，并且当前总命令已经指向第一条可执行 slice。",
        milestones: [
          {
            id: "project-connected",
            label: "项目接入",
            title: "连接 live-project 并初始化 Threadsmith",
            summary: "项目已经建立基础 truth。",
            state: "done"
          },
          {
            id: "task-brief",
            label: "任务定界",
            title: "定义第一个 Threadsmith slice",
            summary: "先把 task brief 与 phase contract 收紧。",
            state: "current"
          },
          {
            id: "first-slice",
            label: "首轮实现",
            title: "开始第一条真实实现线",
            summary: "让项目从初始化进入真实推进。",
            state: "next"
          }
        ],
        updatedAt: null
      },
      currentPhase: {
        phaseName: "定义第一个 Threadsmith slice",
        phaseGoal: "为 live-project 写出第一条可执行的 phase contract",
        deliverable: "一个可以继续推进的首个 slice brief",
        inScope: ["明确当前目标", "收紧本轮范围", "补齐第一版 done when"],
        outOfScope: ["自动分析整个仓库", "在未收紧范围前直接开始编码"],
        stopCondition: "项目简报和当前 phase 已足够清晰，可以进入第一条真实实现线。",
        verificationForThisPhase: [
          "项目可以从 deck 正常加载",
          "当前总命令与当前 phase 一致",
          "用户可以基于这份初始状态继续推进"
        ],
        activeOwners: ["planner"],
        blockedBy: []
      },
      acceptanceState: {
        currentClaim: "Threadsmith 初始化完成，项目已经准备好定义第一条真实开发切片。",
        doneWhenChecklist: [
          {
            id: "state-bootstrap",
            label: "Threadsmith 基础状态文件已初始化",
            status: "pass"
          },
          {
            id: "phase-contract",
            label: "第一条可执行 phase 已定义",
            status: "pass"
          },
          {
            id: "execution-ready",
            label: "当前总命令已经可以继续推进",
            status: "pass"
          }
        ],
        implementationStatus: "not-started",
        reviewStatus: "not-started",
        verificationStatus: "not-started",
        closeoutStatus: "not-started",
        knownGaps: [
          "还没有针对当前项目的具体 task brief",
          "还没有第一轮实现与验证证据"
        ],
        finalState: "not-ready"
      },
      activeWork: {
        items: [
          {
            role: "planner",
            status: "running",
            taskSummary: "为 live-project 起草第一条 task brief 与 phase contract",
            requiresUserDecision: true
          }
        ],
        blockerSummary: null
      },
      preferences: {
        projectDefault: null,
        globalDefault: null,
        resolved: {
          continuationBehavior: "ask-every-time",
          continuationBehaviorSource: "fallback"
        }
      }
    };

    let missingProjectStateAttempts = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const url = new URL(requestUrl, "http://localhost");
      const projectRoot = url.searchParams.get("projectRoot");

      if (url.pathname === "/api/threadsmith/init") {
        return jsonResponse({
          projectRoot,
          state: initializedState,
          recentEvents: [],
          actionHistoryLength: 0
        });
      }

      if (url.pathname === "/api/threadsmith/state" && projectRoot === "/tmp/live-project") {
        missingProjectStateAttempts += 1;

        if (missingProjectStateAttempts === 1) {
          return jsonResponse(
            {
              message:
                "ENOENT: no such file or directory, open '/tmp/live-project/.threadsmith/project-brief.json'"
            },
            500
          );
        }

        return jsonResponse({
          projectRoot,
          state: initializedState,
          recentEvents: [],
          actionHistoryLength: 0
        });
      }

      if (url.pathname === "/api/threadsmith/state") {
        return jsonResponse({
          projectRoot: projectRoot ?? "/tmp/demo-project",
          state,
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

    fireEvent.click(screen.getByRole("button", { name: /来源：/ }));
    const projectsDrawer = screen.getByText("项目与来源").closest(".inspector-panel");
    expect(projectsDrawer).not.toBeNull();
    const projectsScope = within(projectsDrawer as HTMLElement);
    fireEvent.click(projectsScope.getByRole("button", { name: /自定义项目/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /项目根目录/i }), {
      target: { value: "/tmp/live-project" }
    });
    fireEvent.click(screen.getByRole("button", { name: /连接项目/i }));

    const onboardingCard = await screen.findByText(
      "这个目录已经找到，只差初始化 Threadsmith"
    );
    fireEvent.click(
      within(onboardingCard.closest(".rounded-xl") as HTMLElement).getByRole("button", {
        name: "初始化 Threadsmith"
      })
    );

    expect(
      (await screen.findAllByText("定义第一个 Threadsmith slice")).length
    ).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.getByText("来源：自定义项目")).toBeInTheDocument();
      expect(screen.getByText("项目根目录：/tmp/live-project")).toBeInTheDocument();
    });
    const collaborationCard = screen.getByRole("heading", { name: "协作现场" }).closest("article");
    expect(collaborationCard).not.toBeNull();
    const collaborationScope = within(collaborationCard as HTMLElement);
    expect(collaborationScope.getAllByText("等待决策").length).toBeGreaterThan(0);
    expect(collaborationScope.getAllByText("1 条").length).toBeGreaterThan(1);
    expect(
      collaborationScope.getByText("为 live-project 起草第一条 task brief 与 phase contract")
    ).toBeInTheDocument();
    expect(collaborationScope.getByText("规划")).toBeInTheDocument();
    expect(collaborationScope.getByText("Conductor")).toBeInTheDocument();
    expect(collaborationScope.getByText("逻辑角色")).toBeInTheDocument();
    expect(
      collaborationScope.getByText(
        "待决策：为 live-project 起草第一条 task brief 与 phase contract"
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "定义第一个 Threadsmith slice · 为 live-project 写出第一条可执行的 phase contract"
      )
    ).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/threadsmith/init?projectRoot=%2Ftmp%2Flive-project"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("prefers the stored daily-entry project when reopening the app", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const url = new URL(requestUrl, "http://localhost");

      if (url.pathname === "/api/threadsmith/state") {
        return jsonResponse({
          projectRoot: url.searchParams.get("projectRoot") ?? "/tmp/demo-project",
          state,
          recentEvents: events,
          actionHistoryLength: 0
        });
      }

      throw new Error(`Unexpected request: ${url.pathname}`);
    });

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => {
          if (key === "threadsmith.dailyEntryProjectRoot") {
            return "/tmp/daily-entry";
          }

          if (key === "threadsmith.recentProjectRoots") {
            return JSON.stringify([
              { projectRoot: "/tmp/recent-alpha", pinned: false }
            ]);
          }

          return null;
        }),
        setItem: vi.fn(),
        removeItem: vi.fn()
      }
    });
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState({}, "", "/");

    render(<App />);

    await screen.findByText("当前总命令");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/threadsmith/state?projectRoot=%2Ftmp%2Fdaily-entry")
    );
    expect(screen.getByText("项目根目录：/tmp/daily-entry")).toBeInTheDocument();
  });

  it("keeps the app-home route as a friendly front door without exposing its fixture root in the URL", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const url = new URL(requestUrl, "http://localhost");

      if (url.pathname === "/api/threadsmith/state") {
        return jsonResponse({
          projectRoot: url.searchParams.get("projectRoot") ?? APP_HOME_PROJECT_ROOT,
          state,
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
    window.history.replaceState({}, "", "/?appHome=1");

    render(<App />);

    await screen.findByText("当前总命令");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        `/api/threadsmith/state?projectRoot=${encodeURIComponent(APP_HOME_PROJECT_ROOT)}`
      )
    );
    expect(window.location.search).toBe("?appHome=1");
    expect(screen.getByRole("button", { name: "来源：前门入口" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "连接新项目" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "复制建议指令" })).not.toBeInTheDocument();
  });

  it("shows a front-door explanation in 查看为什么 instead of manual execution controls", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const url = new URL(requestUrl, "http://localhost");

      if (url.pathname === "/api/threadsmith/state") {
        return jsonResponse({
          projectRoot: url.searchParams.get("projectRoot") ?? APP_HOME_PROJECT_ROOT,
          state,
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
    window.history.replaceState({}, "", "/?appHome=1");

    render(<App />);

    await screen.findByText("当前总命令");
    fireEvent.click(screen.getByRole("button", { name: "查看为什么" }));

    await screen.findByText("前门只负责帮你选对今天的项目入口；进入真实项目后才展示实时 truth。");
    expect(screen.queryByText("手动桥接（备用）")).not.toBeInTheDocument();
  });

  it("opens the saved daily-entry project directly from the app-home homepage action", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const url = new URL(requestUrl, "http://localhost");

      if (url.pathname === "/api/threadsmith/state") {
        return jsonResponse({
          projectRoot: url.searchParams.get("projectRoot") ?? APP_HOME_PROJECT_ROOT,
          state,
          recentEvents: events,
          actionHistoryLength: 0
        });
      }

      throw new Error(`Unexpected request: ${url.pathname}`);
    });

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => {
          if (key === "threadsmith.dailyEntryProjectRoot") {
            return "/tmp/daily-entry";
          }

          if (key === "threadsmith.recentProjectRoots") {
            return JSON.stringify([{ projectRoot: "/tmp/recent-alpha", pinned: false }]);
          }

          return null;
        }),
        setItem: vi.fn(),
        removeItem: vi.fn()
      }
    });
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState({}, "", "/?appHome=1");

    render(<App />);

    await screen.findByText("当前总命令");
    fireEvent.click(screen.getByRole("button", { name: "打开默认项目 daily-entry" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(
          `/api/threadsmith/state?projectRoot=${encodeURIComponent("/tmp/daily-entry")}`
        )
      );
    });
  });

  it("clears the daily-entry preference when that recent project is removed", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const url = new URL(requestUrl, "http://localhost");

      if (url.pathname === "/api/threadsmith/state") {
        return jsonResponse({
          projectRoot: url.searchParams.get("projectRoot") ?? "/tmp/demo-project",
          state,
          recentEvents: events,
          actionHistoryLength: 0
        });
      }

      throw new Error(`Unexpected request: ${url.pathname}`);
    });

    const localStorageMock = {
      getItem: vi.fn((key: string) => {
        if (key === "threadsmith.dailyEntryProjectRoot") {
          return "/tmp/daily-entry";
        }

        if (key === "threadsmith.recentProjectRoots") {
          return JSON.stringify([
            { projectRoot: "/tmp/daily-entry", pinned: false },
            { projectRoot: "/tmp/recent-alpha", pinned: false }
          ]);
        }

        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: localStorageMock
    });
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState({}, "", "/");

    render(<App />);

    await screen.findByText("当前总命令");
    fireEvent.click(screen.getByRole("button", { name: /来源：/ }));
    fireEvent.click(screen.getByRole("button", { name: "移除 /tmp/daily-entry" }));

    await waitFor(() => {
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "threadsmith.dailyEntryProjectRoot"
      );
    });
    expect(screen.getByText("当前还没有设置默认进入项目。你可以把正在查看的真实项目设成日常入口。")).toBeInTheDocument();
  });

  it("prefers app-home when the saved daily opening mode is app-home", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const url = new URL(requestUrl, "http://localhost");

      if (url.pathname === "/api/threadsmith/state") {
        return jsonResponse({
          projectRoot: url.searchParams.get("projectRoot") ?? APP_HOME_PROJECT_ROOT,
          state,
          recentEvents: events,
          actionHistoryLength: 0
        });
      }

      throw new Error(`Unexpected request: ${url.pathname}`);
    });

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => {
          if (key === "threadsmith.entryModePreference") {
            return "app-home";
          }

          return null;
        }),
        setItem: vi.fn(),
        removeItem: vi.fn()
      }
    });
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState({}, "", "/");

    render(<App />);

    await screen.findByText("当前总命令");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        `/api/threadsmith/state?projectRoot=${encodeURIComponent(APP_HOME_PROJECT_ROOT)}`
      )
    );
    expect(screen.getByRole("button", { name: "来源：前门入口" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "连接新项目" })).toBeInTheDocument();
  });

  it("captures browser install prompt in App and wires it to the install CTA", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const url = new URL(requestUrl, "http://localhost");

      if (url.pathname === "/api/threadsmith/state") {
        return jsonResponse({
          projectRoot: url.searchParams.get("projectRoot") ?? APP_HOME_PROJECT_ROOT,
          state,
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
    window.history.replaceState({}, "", "/?appHome=1");

    const prompt = vi.fn(async () => {});
    const installEvent = Object.assign(new Event("beforeinstallprompt"), {
      prompt,
      userChoice: Promise.resolve({
        outcome: "accepted" as const,
        platform: "web"
      })
    });

    render(<App />);

    await screen.findByText("当前总命令");
    fireEvent(window, installEvent);
    fireEvent.click(screen.getByRole("button", { name: "来源：前门入口" }));

    await screen.findByRole("button", { name: "安装 Threadsmith" });
    fireEvent.click(screen.getByRole("button", { name: "安装 Threadsmith" }));

    await waitFor(() => {
      expect(prompt).toHaveBeenCalled();
    });
  });
});

describe("DeckScreen app home", () => {
  it("continues the same front-door entry actions inside 查看为什么", () => {
    const onConnectCustomProject = vi.fn();

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
        onSetDailyEntryProject={vi.fn()}
        onClearDailyEntryProject={vi.fn()}
        onRunAction={async () => {}}
        onApplyTransition={async () => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "查看为什么" }));
    const actionDrawerHeading = screen
      .getAllByText("推进参考")
      .find((element) => element.closest(".inspector-panel"));
    const actionDrawer = actionDrawerHeading?.closest(".inspector-panel");
    expect(actionDrawer).not.toBeNull();
    const actionScope = within(actionDrawer as HTMLElement);

    fireEvent.click(actionScope.getByRole("button", { name: "打开默认项目 daily-entry" }));
    expect(onConnectCustomProject).toHaveBeenCalledWith("/tmp/daily-entry");
  });
});
