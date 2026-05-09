import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ensureStateDir,
  initializeProjectState,
  loadProjectSupervisionState,
  loadProjectState,
  persistContinuationPreference,
  readCurrentContextPacket,
  writeCurrentContextPacket,
  writeStateFragment
} from "./fileStore.ts";
import {
  appendActionHistoryEntry,
  readActionHistory
} from "./actionQueue.ts";
import {
  STATE_FILES,
  CONTEXT_FILES,
  getContextFilePath,
  getGlobalPreferencesPath,
  getProviderRoutingPath,
  getStatePath
} from "./paths.ts";

const createdRoots: string[] = [];

async function createProjectRoot() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-"));
  createdRoots.push(projectRoot);
  await ensureStateDir(projectRoot);
  return projectRoot;
}

async function createBareProjectRoot() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-"));
  createdRoots.push(projectRoot);
  return projectRoot;
}

afterEach(async () => {
  await Promise.all(
    createdRoots.splice(0).map(async (projectRoot) => {
      await import("node:fs/promises").then(({ rm }) =>
        rm(projectRoot, { recursive: true, force: true })
      );
    })
  );
});

describe("fileStore", () => {
  it("loads the active project state from disk", async () => {
    const projectRoot = await createProjectRoot();
    const globalPreferencesPath = join(projectRoot, "global", "preferences.json");

    await writeStateFragment(projectRoot, STATE_FILES.projectBrief, {
      projectGoal: "Ship Threadsmith v1",
      currentVersionScope: "Workflow-first control deck",
      nonGoals: ["Multi-project orchestration"],
      keyConstraints: ["Stay Codex-first"],
      successFrame: "Advance, review, verify, close out",
      priorityOrder: ["Workflow loop", "Deck visibility"],
      openStrategicQuestions: []
    });

    await writeStateFragment(projectRoot, STATE_FILES.currentPhase, {
      phaseName: "Build workflow loop",
      phaseGoal: "Stand up the loop",
      deliverable: "Runnable shell",
      inScope: ["Workspace scaffold", "State schemas"],
      outOfScope: ["Native packaging"],
      stopCondition: "App boots and state parses",
      verificationForThisPhase: ["Run tests"],
      activeOwners: ["planner", "executor"],
      blockedBy: []
    });

    await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, {
      currentClaim: "The first Threadsmith baseline exists",
      doneWhenChecklist: [
        { id: "workspace", label: "Workspace scaffolded", status: "pass" }
      ],
      implementationStatus: "implementing",
      reviewStatus: "not-started",
      verificationStatus: "not-started",
      closeoutStatus: "not-started",
      knownGaps: ["Deck not wired to state"],
      finalState: "not-ready"
    });

    await writeStateFragment(projectRoot, STATE_FILES.projectRoadmap, {
      versionLabel: "Threadsmith v1",
      finalGoal: "Advance, review, verify, close out",
      milestones: [
        {
          id: "baseline",
          label: "项目基线",
          title: "建立项目基线",
          summary: "项目已经具备最小状态。",
          state: "done"
        },
        {
          id: "workflow-loop",
          label: "工作流闭环",
          title: "Build workflow loop",
          summary: "让 workflow loop 可以真实推进。",
          state: "current"
        },
        {
          id: "verify",
          label: "验证收口",
          title: "补齐验证与收尾",
          summary: "让每次推进都留下证据。",
          state: "next"
        }
      ],
      updatedAt: null
    });

    await writeStateFragment(projectRoot, STATE_FILES.activeWork, {
      items: [
        {
          role: "executor",
          status: "running",
          taskSummary: "Scaffold the control deck",
          requiresUserDecision: false
        }
      ],
      blockerSummary: null
    });

    await writeStateFragment(projectRoot, STATE_FILES.projectSupervision, {
      mode: "multi-thread",
      modeLabel: "多角色协作",
      summary: "当前由 committed supervision truth 跟踪项目协作现场。",
      lines: [
        {
          id: "conductor-main",
          role: "planner",
          threadLabel: "Conductor",
          provider: "claude",
          presence: "live",
          status: "running",
          taskSummary: "维护当前 slice 与下一条最小切口",
          requiresUserDecision: false,
          blockerSummary: null,
          latestEvidenceLabel: "最新 packet 已刷新",
          updatedAt: "2026-04-09T08:00:00.000Z"
        },
        {
          id: "builder-main",
          role: "executor",
          threadLabel: "Builder",
          provider: "codex",
          presence: "live",
          status: "running",
          taskSummary: "Scaffold the control deck",
          requiresUserDecision: false,
          blockerSummary: null,
          latestEvidenceLabel: "最近一次运行成功启动",
          updatedAt: "2026-04-09T08:01:00.000Z"
        }
      ],
      updatedAt: "2026-04-09T08:01:00.000Z"
    });

    await writeStateFragment(projectRoot, STATE_FILES.preferences, {
      continuationBehavior: "smart-continuation"
    });

    await persistContinuationPreference(
      projectRoot,
      "global",
      "return-current-thread",
      { globalPreferencesPath }
    );

    const state = await loadProjectState(projectRoot, { globalPreferencesPath });
    const projectSupervision = await loadProjectSupervisionState(projectRoot, state);

    expect(state.projectStatus.projectLabel).toContain("threadsmith-");
    expect(state.projectRoadmap.versionLabel).toBe("Threadsmith v1");
    expect(state.projectRoadmap.milestones[1]?.label).toBe("工作流闭环");
    expect(state.currentPhase.phaseName).toBe("Build workflow loop");
    expect(state.preferences.projectDefault).toBe("smart-continuation");
    expect(state.preferences.globalDefault).toBe("return-current-thread");
    expect(state.preferences.resolved.continuationBehavior).toBe(
      "smart-continuation"
    );
    expect(state.preferences.resolved.continuationBehaviorSource).toBe(
      "project-default"
    );
    expect(projectSupervision.modeLabel).toBe("多角色协作");
    expect(projectSupervision.lines[0]?.provider).toBe("claude");
    expect(projectSupervision.lines[1]?.threadLabel).toBe("Builder");
  });

  it("appends and reads deck actions from the history log", async () => {
    const projectRoot = await createProjectRoot();

    await appendActionHistoryEntry(projectRoot, {
      id: "action-1",
      actionId: "advance-phase",
      createdAt: "2026-04-04T00:00:00.000Z",
      projectRoot,
      previewAccepted: true,
      continuationBehavior: "smart-continuation",
      persistenceScope: "project"
    });

    const actions = await readActionHistory(projectRoot);
    const historyContents = await readFile(
      getStatePath(projectRoot, STATE_FILES.actionHistory),
      "utf8"
    );

    expect(actions).toHaveLength(1);
    expect(actions[0]?.actionId).toBe("advance-phase");
    expect(actions[0]?.continuationBehavior).toBe("smart-continuation");
    expect(historyContents).toContain("\"advance-phase\"");
  });

  it("initializes the minimum Threadsmith state for a real project without overwriting existing truth", async () => {
    const projectRoot = await createBareProjectRoot();

    await writeStateFragment(projectRoot, STATE_FILES.projectBrief, {
      projectGoal: "Keep existing project brief",
      currentVersionScope: "Existing truth should stay intact",
      nonGoals: ["Overwrite user-authored state"],
      keyConstraints: ["Only fill missing files"],
      successFrame: "Existing brief survives initialization",
      priorityOrder: ["Preserve truth"],
      openStrategicQuestions: []
    });

    const state = await initializeProjectState(projectRoot);
    const actionHistoryContents = await readFile(
      getStatePath(projectRoot, STATE_FILES.actionHistory),
      "utf8"
    );
    const eventsContents = await readFile(
      getStatePath(projectRoot, STATE_FILES.events),
      "utf8"
    );
    const projectStatusContents = await readFile(
      getStatePath(projectRoot, STATE_FILES.projectStatus),
      "utf8"
    );
    const projectRoadmapContents = await readFile(
      getStatePath(projectRoot, STATE_FILES.projectRoadmap),
      "utf8"
    );
    const projectSupervisionContents = await readFile(
      getStatePath(projectRoot, STATE_FILES.projectSupervision),
      "utf8"
    );
    const providerRoutingContents = await readFile(
      getProviderRoutingPath(projectRoot),
      "utf8"
    );

    expect(state.projectBrief.projectGoal).toBe("Keep existing project brief");
    expect(state.projectStatus.projectLabel).toBeTruthy();
    expect(state.projectRoadmap.versionLabel).toContain("v1");
    expect(state.currentPhase.phaseName).toBe("定义第一个 Threadsmith slice");
    expect(state.acceptanceState.finalState).toBe("not-ready");
    expect(state.preferences.projectDefault).toBeNull();
    expect(state.preferences.resolved.continuationBehavior).toBe("ask-every-time");
    expect(state.preferences.resolved.continuationBehaviorSource).toBe("fallback");
    expect(actionHistoryContents).toBe("");
    expect(eventsContents).toBe("");
    expect(projectStatusContents).toContain("\"currentTrack\"");
    expect(projectRoadmapContents).toContain("\"versionLabel\"");
    expect(projectSupervisionContents).toContain("\"modeLabel\"");
    expect(providerRoutingContents).toContain("\"planner\": \"codex\"");
    expect(providerRoutingContents).toContain(
      "\"conductorSurface\": \"codex-desktop\""
    );
  });

  it("derives a stable fallback supervision truth when project-supervision.json is missing", async () => {
    const projectRoot = await createProjectRoot();
    await initializeProjectState(projectRoot);
    await import("node:fs/promises").then(({ rm }) =>
      rm(getStatePath(projectRoot, STATE_FILES.projectSupervision), {
        force: true
      })
    );

    await writeStateFragment(projectRoot, STATE_FILES.currentPhase, {
      phaseName: "Define first slice",
      phaseGoal: "Narrow the first slice",
      deliverable: "A task brief",
      inScope: ["Task brief"],
      outOfScope: ["Implementation"],
      stopCondition: "The first slice is defined",
      verificationForThisPhase: ["Brief reviewed"],
      activeOwners: ["planner"],
      blockedBy: []
    });

    await writeStateFragment(projectRoot, STATE_FILES.activeWork, {
      items: [
        {
          role: "planner",
          status: "waiting",
          taskSummary: "为示例项目起草第一条 task brief",
          requiresUserDecision: true
        }
      ],
      blockerSummary: null
    });

    const state = await loadProjectState(projectRoot);
    const projectSupervision = await loadProjectSupervisionState(projectRoot, state);

    expect(projectSupervision.mode).toBe("single-thread");
    expect(projectSupervision.lines).toHaveLength(1);
    expect(projectSupervision.lines[0]?.presence).toBe("logical");
    expect(projectSupervision.lines[0]?.provider).toBeNull();
    expect(projectSupervision.lines[0]?.taskSummary).toBe(
      "为示例项目起草第一条 task brief"
    );
  });

  it("resolves the global preference when the project has no default", async () => {
    const projectRoot = await createProjectRoot();
    const globalPreferencesPath = getGlobalPreferencesPath(
      join(projectRoot, "global", "preferences.json")
    );

    await writeStateFragment(projectRoot, STATE_FILES.projectBrief, {
      projectGoal: "Ship Threadsmith v1",
      currentVersionScope: "Workflow-first control deck",
      nonGoals: ["Multi-project orchestration"],
      keyConstraints: ["Stay Codex-first"],
      successFrame: "Advance, review, verify, close out",
      priorityOrder: ["Workflow loop", "Deck visibility"],
      openStrategicQuestions: []
    });

    await writeStateFragment(projectRoot, STATE_FILES.currentPhase, {
      phaseName: "Build workflow loop",
      phaseGoal: "Stand up the loop",
      deliverable: "Runnable shell",
      inScope: ["Workspace scaffold", "State schemas"],
      outOfScope: ["Native packaging"],
      stopCondition: "App boots and state parses",
      verificationForThisPhase: ["Run tests"],
      activeOwners: ["planner", "executor"],
      blockedBy: []
    });

    await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, {
      currentClaim: "The first Threadsmith baseline exists",
      doneWhenChecklist: [
        { id: "workspace", label: "Workspace scaffolded", status: "pass" }
      ],
      implementationStatus: "implementing",
      reviewStatus: "not-started",
      verificationStatus: "not-started",
      closeoutStatus: "not-started",
      knownGaps: ["Deck not wired to state"],
      finalState: "not-ready"
    });

    await writeStateFragment(projectRoot, STATE_FILES.projectRoadmap, {
      versionLabel: "Threadsmith v1",
      finalGoal: "Advance, review, verify, close out",
      milestones: [
        {
          id: "baseline",
          label: "项目基线",
          title: "建立项目基线",
          summary: "项目已经具备最小状态。",
          state: "done"
        },
        {
          id: "workflow-loop",
          label: "工作流闭环",
          title: "Build workflow loop",
          summary: "让 workflow loop 可以真实推进。",
          state: "current"
        },
        {
          id: "verify",
          label: "验证收口",
          title: "补齐验证与收尾",
          summary: "让每次推进都留下证据。",
          state: "next"
        }
      ],
      updatedAt: null
    });

    await writeStateFragment(projectRoot, STATE_FILES.activeWork, {
      items: [
        {
          role: "executor",
          status: "running",
          taskSummary: "Scaffold the control deck",
          requiresUserDecision: false
        }
      ],
      blockerSummary: null
    });

    await persistContinuationPreference(
      projectRoot,
      "global",
      "smart-continuation",
      { globalPreferencesPath }
    );

    const state = await loadProjectState(projectRoot, { globalPreferencesPath });

    expect(state.projectStatus.currentTrack).toBe("Workflow-first control deck");
    expect(state.projectRoadmap.versionLabel).toBe("Threadsmith v1");
    expect(state.preferences.projectDefault).toBeNull();
    expect(state.preferences.globalDefault).toBe("smart-continuation");
    expect(state.preferences.resolved.continuationBehavior).toBe(
      "smart-continuation"
    );
    expect(state.preferences.resolved.continuationBehaviorSource).toBe(
      "global-default"
    );
  });

  it("derives a fallback project status when older state is missing project-status.json", async () => {
    const projectRoot = await createProjectRoot();

    await writeStateFragment(projectRoot, STATE_FILES.projectBrief, {
      projectGoal: "Ship Threadsmith v1",
      currentVersionScope: "Workflow-first control deck",
      nonGoals: [],
      keyConstraints: [],
      successFrame: "Advance, review, verify, close out",
      priorityOrder: ["Workflow loop", "Deck visibility"],
      openStrategicQuestions: []
    });

    await writeStateFragment(projectRoot, STATE_FILES.currentPhase, {
      phaseName: "Build workflow loop",
      phaseGoal: "Stand up the loop",
      deliverable: "Runnable shell",
      inScope: ["Workspace scaffold"],
      outOfScope: ["Native packaging"],
      stopCondition: "App boots and state parses",
      verificationForThisPhase: ["Run tests"],
      activeOwners: ["planner", "executor"],
      blockedBy: []
    });

    await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, {
      currentClaim: "The first Threadsmith baseline exists",
      doneWhenChecklist: [
        { id: "workspace", label: "Workspace scaffolded", status: "pass" }
      ],
      implementationStatus: "ready-for-review",
      reviewStatus: "ready-for-verification",
      verificationStatus: "passed",
      closeoutStatus: "done",
      knownGaps: [],
      finalState: "accepted"
    });

    await writeStateFragment(projectRoot, STATE_FILES.activeWork, {
      items: [],
      blockerSummary: null
    });

    const state = await loadProjectState(projectRoot);

    expect(state.projectStatus.projectLabel).toBeTruthy();
    expect(state.projectRoadmap.versionLabel).toContain("v1");
    expect(state.projectRoadmap.milestones[2]?.state).toBe("done");
    expect(state.projectStatus.latestAcceptedSlice?.title).toBe("Build workflow loop");
    expect(state.projectStatus.overallState).toBe("stable");
  });

  it("writes and reads the current context packet under .threadsmith/context", async () => {
    const projectRoot = await createProjectRoot();

    const packet = {
      packetId: "ctx-context-packet-v1-20260509T131500000Z",
      generatedAt: "2026-05-09T13:15:00.000Z",
      project: {
        label: "Threadsmith",
        track: "v0.2.0 Context OS",
        overallState: "in-progress",
        focus: "Build Context Packet v1",
        summary: "Threadsmith is adding token-aware context packets."
      },
      goal: {
        projectGoal: "Turn Threadsmith into a context operating layer",
        successFrame: "Agents can continue from compact context packets.",
        priorityOrder: ["Context packet"]
      },
      currentPhase: {
        name: "Context Packet v1",
        goal: "Generate a durable context packet from committed truth.",
        deliverable: "Context Packet schema and builder",
        stopCondition: "Packet generation is covered by tests.",
        activeOwners: ["planner", "executor"]
      },
      scope: {
        inScope: ["schema", "builder"],
        outOfScope: ["repo map"],
        constraints: ["Do not replay long chat history into packets"],
        nonGoals: ["multi-provider automatic execution"]
      },
      acceptance: {
        claim: "Context Packet v1 is being implemented.",
        finalState: "not-ready",
        implementationStatus: "implementing",
        reviewStatus: "not-started",
        verificationStatus: "not-started",
        closeoutStatus: "not-started",
        checklist: [
          { id: "schema", label: "Schema is defined", status: "unknown" }
        ],
        knownGaps: ["Evidence summary is not connected yet"]
      },
      nextStep: {
        label: "推进 Context Packet v1",
        rationale: "Generate a durable context packet from committed truth.",
        recommendedRole: "planner",
        actionId: "advance-phase"
      },
      risks: [
        { label: "Packet could become too large", source: "project" }
      ],
      relevantFiles: [
        {
          path: "packages/domain/src/contextPacket.ts",
          reason: "Defines the packet schema.",
          source: "phase"
        }
      ],
      recentDiff: {
        status: "unknown",
        summary: "Diff summary is not connected yet.",
        changedFiles: [],
        command: null
      },
      evidence: {
        status: "missing",
        summary: "Evidence summary is not connected yet.",
        commands: [
          {
            command: "npm run test --workspace @threadsmith/runtime",
            status: "pending",
            summary: "Not run yet."
          }
        ],
        artifactRefs: []
      },
      sourceRefs: [
        {
          kind: "state",
          path: ".threadsmith/current-phase.json",
          title: "Current Phase"
        }
      ]
    };

    const written = await writeCurrentContextPacket(projectRoot, packet);
    const read = await readCurrentContextPacket(projectRoot);
    const rawContents = await readFile(
      getContextFilePath(projectRoot, CONTEXT_FILES.currentPacket),
      "utf8"
    );

    expect(written.packetId).toBe(packet.packetId);
    expect(read.project.track).toBe("v0.2.0 Context OS");
    expect(read.relevantFiles[0]?.source).toBe("phase");
    expect(rawContents).toContain("\"packetId\"");
    expect(rawContents.endsWith("\n")).toBe(true);
  });

  it("overlays roadmap states from project-status milestone pointers", async () => {
    const projectRoot = await createProjectRoot();

    await writeStateFragment(projectRoot, STATE_FILES.projectBrief, {
      projectGoal: "Ship Threadsmith v1",
      currentVersionScope: "Workflow-first control deck",
      nonGoals: [],
      keyConstraints: [],
      successFrame: "Advance, review, verify, close out",
      priorityOrder: ["Workflow loop", "Deck visibility"],
      openStrategicQuestions: []
    });

    await writeStateFragment(projectRoot, STATE_FILES.currentPhase, {
      phaseName: "让 roadmap 绑定项目真相",
      phaseGoal: "给 roadmap 增加真实里程碑绑定",
      deliverable: "Milestone pointer support",
      inScope: ["状态绑定"],
      outOfScope: ["UI 大改"],
      stopCondition: "Roadmap 跟着项目主线走",
      verificationForThisPhase: ["Run tests"],
      activeOwners: ["planner", "executor"],
      blockedBy: []
    });

    await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, {
      currentClaim: "Roadmap truth is pointer-driven",
      doneWhenChecklist: [
        { id: "roadmap", label: "Roadmap follows milestone pointers", status: "unknown" }
      ],
      implementationStatus: "implementing",
      reviewStatus: "not-started",
      verificationStatus: "not-started",
      closeoutStatus: "not-started",
      knownGaps: [],
      finalState: "not-ready"
    });

    await writeStateFragment(projectRoot, STATE_FILES.projectStatus, {
      projectLabel: "Threadsmith",
      currentTrack: "Workflow-first control deck",
      overallState: "in-progress",
      currentFocus: "让 roadmap 跟着 milestone pointers 走",
      projectStatusSummary: "当前正在把 roadmap truth 和项目真相绑起来。",
      latestAcceptedSlice: {
        title: "完成 self-host smoke",
        recordedAt: "2026-04-09T00:00:00.000Z"
      },
      nextPlannedSlice: {
        title: "继续收口 command bridge",
        recordedAt: null
      },
      currentMilestoneId: "real-roadmap-truth",
      nextMilestoneId: "command-bridge",
      topRisks: [],
      updatedAt: "2026-04-09T00:00:00.000Z"
    });

    await writeStateFragment(projectRoot, STATE_FILES.projectRoadmap, {
      versionLabel: "Threadsmith v1",
      finalGoal: "Advance, review, verify, close out",
      milestones: [
        {
          id: "workflow-driven-development",
          label: "实战工作流",
          title: "完成 self-host smoke",
          summary: "验证自举闭环。",
          state: "current"
        },
        {
          id: "real-roadmap-truth",
          label: "真实 roadmap",
          title: "让 roadmap 绑定项目真相",
          summary: "通过 milestone pointers 对齐状态。",
          state: "next"
        },
        {
          id: "command-bridge",
          label: "指令桥接",
          title: "继续收口 bridge 体验",
          summary: "减少 operator friction。",
          state: "later"
        }
      ],
      updatedAt: null
    });

    await writeStateFragment(projectRoot, STATE_FILES.activeWork, {
      items: [],
      blockerSummary: null
    });

    const state = await loadProjectState(projectRoot);

    expect(state.projectRoadmap.milestones[0]?.state).toBe("done");
    expect(state.projectRoadmap.milestones[1]?.state).toBe("current");
    expect(state.projectRoadmap.milestones[2]?.state).toBe("next");
    expect(state.projectRoadmap.updatedAt).toBe("2026-04-09T00:00:00.000Z");
  });
});
