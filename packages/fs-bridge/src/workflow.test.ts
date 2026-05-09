import { createAgentRun, writeAgentRunResult } from "./agentRuns.ts";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readLatestContinuationPacket } from "./continuationPackets.ts";
import { appendEvent, readRecentEvents } from "./events.ts";
import {
  ensureStateDir,
  loadProjectState,
  readCurrentContextPacket,
  writeEvidenceSummary,
  writeRepoMap,
  writeStateFragment
} from "./fileStore.ts";
import { CONTEXT_FILES, STATE_FILES, THREADSMITH_DIR } from "./paths.ts";
import { readLatestWorkflowArtifact } from "./workflowArtifacts.ts";
import {
  applyAgentRunResult,
  applyDeckActionState,
  applyWorkflowTransition
} from "./workflow.ts";

const createdRoots: string[] = [];

async function createProjectRoot() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-workflow-"));
  createdRoots.push(projectRoot);
  await ensureStateDir(projectRoot);
  return projectRoot;
}

async function seedProject(projectRoot: string) {
  await writeStateFragment(projectRoot, STATE_FILES.projectBrief, {
    projectGoal: "Ship Threadsmith v1",
    currentVersionScope: "Workflow-first control deck",
    nonGoals: ["Multi-project orchestration"],
    keyConstraints: ["Stay Codex-first"],
    successFrame: "Advance, review, verify, and close out",
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
      { id: "workspace", label: "Workspace scaffolded", status: "pass" },
      { id: "deck", label: "Deck workflow is real", status: "unknown" }
    ],
    implementationStatus: "implementing",
    reviewStatus: "not-started",
    verificationStatus: "not-started",
    closeoutStatus: "not-started",
    knownGaps: [],
    finalState: "not-ready"
  });

  await writeStateFragment(projectRoot, STATE_FILES.activeWork, {
    items: [
      {
        role: "planner",
        status: "done",
        taskSummary: "Define the current slice",
        requiresUserDecision: false
      }
    ],
    blockerSummary: null
  });

  await writeStateFragment(projectRoot, STATE_FILES.preferences, {});
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

describe("workflow", () => {
  it("moves a slice through executor, reviewer, verifier, and closeout", async () => {
    const projectRoot = await createProjectRoot();
    await seedProject(projectRoot);

    await applyDeckActionState(projectRoot, "advance-phase");
    await applyWorkflowTransition(projectRoot, "executor-ready-for-review");
    await applyWorkflowTransition(projectRoot, "reviewer-ready-for-verification");
    await applyDeckActionState(projectRoot, "run-verification");
    await applyWorkflowTransition(projectRoot, "verifier-accepted");
    await applyWorkflowTransition(projectRoot, "closeout-complete");

    const state = await loadProjectState(projectRoot);
    const events = await readRecentEvents(projectRoot);
    const latestVerificationArtifact = await readLatestWorkflowArtifact(
      projectRoot,
      "verification"
    );
    const latestCloseoutArtifact = await readLatestWorkflowArtifact(
      projectRoot,
      "closeout"
    );
    const latestPacket = await readLatestContinuationPacket(projectRoot);

    expect(state.acceptanceState.finalState).toBe("accepted");
    expect(state.acceptanceState.closeoutStatus).toBe("done");
    expect(
      state.activeWork.items.find((item) => item.role === "closeout")?.status
    ).toBe("done");
    expect(
      state.activeWork.items.find((item) => item.role === "hygiene")?.status
    ).toBe("done");
    expect(events[0]?.actionId).toBe("create-handoff");
    expect(events[0]?.artifactPath).toContain(".threadsmith/packets/");
    expect(events[0]?.detail).toContain("closeout 自动生成");
    expect(events[1]?.transitionId).toBe("closeout-complete");
    expect(events[1]?.artifactPath).toContain(".threadsmith/closeouts/");
    expect(
      events.find((event) => event.transitionId === "verifier-accepted")?.artifactPath
    ).toContain(".threadsmith/evidence/");
    expect(events).toHaveLength(7);
    expect(latestVerificationArtifact?.status).toBe("passed");
    expect(latestVerificationArtifact?.relativePath).toContain(
      ".threadsmith/evidence/"
    );
    expect(latestCloseoutArtifact?.relativePath).toContain(
      ".threadsmith/closeouts/"
    );
    expect(latestPacket?.kind).toBe("handoff");
    expect(latestPacket?.detail).toContain("已为 phase");
  });

  it("surfaces blocking review findings back into active work", async () => {
    const projectRoot = await createProjectRoot();
    await seedProject(projectRoot);

    await applyDeckActionState(projectRoot, "advance-phase");
    await applyWorkflowTransition(projectRoot, "executor-ready-for-review");
    await applyWorkflowTransition(projectRoot, "reviewer-blocked");

    const state = await loadProjectState(projectRoot);

    expect(state.acceptanceState.finalState).toBe("review-blocked");
    expect(state.activeWork.blockerSummary).toContain("阻塞性评审发现");
    expect(state.acceptanceState.knownGaps).toContain(
      "Reviewer 提出了阻塞性发现。"
    );
  });

  it("writes a handoff packet and records the hygiene outcome", async () => {
    const projectRoot = await createProjectRoot();
    await seedProject(projectRoot);

    await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, {
      currentClaim: "The current slice is accepted and ready to continue",
      doneWhenChecklist: [
        { id: "workspace", label: "Workspace scaffolded", status: "pass" },
        { id: "deck", label: "Deck workflow is real", status: "pass" }
      ],
      implementationStatus: "ready-for-review",
      reviewStatus: "ready-for-verification",
      verificationStatus: "passed",
      closeoutStatus: "done",
      knownGaps: [],
      finalState: "accepted"
    });

    await applyDeckActionState(projectRoot, "create-handoff", {
      continuationBehavior: "smart-continuation"
    });

    const state = await loadProjectState(projectRoot);
    const events = await readRecentEvents(projectRoot);
    const latestPacket = await readLatestContinuationPacket(projectRoot);

    expect(
      state.activeWork.items.find((item) => item.role === "hygiene")?.status
    ).toBe("done");
    expect(events[0]?.actionId).toBe("create-handoff");
    expect(events[0]?.detail).toContain(".threadsmith/packets/");
    expect(latestPacket?.kind).toBe("handoff");
    expect(latestPacket?.detail).toContain("已为 phase");
  });

  it("writes a hygiene packet when run-hygiene is executed", async () => {
    const projectRoot = await createProjectRoot();
    await seedProject(projectRoot);

    await applyDeckActionState(projectRoot, "run-hygiene", {
      continuationBehavior: "smart-continuation"
    });

    const events = await readRecentEvents(projectRoot);
    const latestPacket = await readLatestContinuationPacket(projectRoot);

    expect(events[0]?.actionId).toBe("run-hygiene");
    expect(events[0]?.detail).toContain(".threadsmith/packets/");
    expect(latestPacket?.kind).toBe("hygiene");
  });

  it("regenerates the current context packet when sync-context is executed", async () => {
    const projectRoot = await createProjectRoot();
    await seedProject(projectRoot);
    await writeRepoMap(projectRoot, {
      mapId: "repo-map-test",
      generatedAt: "2026-05-09T10:00:00.000Z",
      projectRootLabel: "threadsmith-workflow",
      packageManager: "npm",
      rootPackage: null,
      workspacePackages: [],
      topLevelDirectories: [],
      sourceDirectories: [],
      entryPoints: [],
      git: {
        status: "dirty",
        changedFiles: ["packages/fs-bridge/src/workflow.ts"],
        command: "git status --short"
      },
      warnings: []
    });
    await writeEvidenceSummary(projectRoot, {
      summaryId: "ev-test",
      generatedAt: "2026-05-09T10:01:00.000Z",
      status: "passed",
      headline: "Verification passed",
      detail: "Targeted workflow tests passed.",
      commands: [
        {
          command: "npm run test --workspace @threadsmith/fs-bridge -- src/workflow.test.ts",
          status: "passed",
          summary: "Workflow tests passed.",
          exitCode: 0,
          durationMs: 1200,
          failureFocus: null,
          artifactRefs: []
        }
      ],
      artifactRefs: [],
      failureFocus: null,
      source: "verification",
      warnings: []
    });

    await applyDeckActionState(projectRoot, "sync-context");

    const packet = await readCurrentContextPacket(projectRoot);
    const events = await readRecentEvents(projectRoot);

    expect(packet.currentPhase.name).toBe("Build workflow loop");
    expect(packet.recentDiff.status).toBe("dirty");
    expect(packet.recentDiff.changedFiles).toContain(
      "packages/fs-bridge/src/workflow.ts"
    );
    expect(packet.evidence.status).toBe("ready");
    expect(events[0]?.actionId).toBe("sync-context");
    expect(events[0]?.artifactPath).toBe(
      `${THREADSMITH_DIR}/context/${CONTEXT_FILES.currentPacket}`
    );
    expect(events[0]?.detail).toContain(packet.packetId);
  });

  it("keeps workflow-generated timestamps monotonic when older truth contains future packet timestamps", async () => {
    const projectRoot = await createProjectRoot();
    await seedProject(projectRoot);

    await appendEvent(projectRoot, {
      id: "older-future-packet",
      createdAt: "2026-04-13T00:18:32.500Z",
      kind: "workflow-transition",
      title: "已创建 handoff packet",
      detail: "旧 slice 里已经有一份更晚的 handoff packet。 Packet：.threadsmith/packets/older-future-packet.md",
      role: "hygiene",
      actionId: "create-handoff",
      artifactPath: ".threadsmith/packets/older-future-packet.md"
    });

    await applyDeckActionState(projectRoot, "advance-phase");
    await applyWorkflowTransition(projectRoot, "executor-ready-for-review");
    await applyWorkflowTransition(projectRoot, "reviewer-ready-for-verification");
    await applyDeckActionState(projectRoot, "run-verification");
    await applyWorkflowTransition(projectRoot, "verifier-accepted");
    await applyWorkflowTransition(projectRoot, "closeout-complete");

    const events = await readRecentEvents(projectRoot, 12);
    const latestPacketEvent = events.find((event) => event.actionId === "create-handoff");

    expect(events[0]?.createdAt).toBe(latestPacketEvent?.createdAt);
    expect(latestPacketEvent?.detail).toContain("Build workflow loop");
    expect(
      new Date(latestPacketEvent?.createdAt ?? 0).getTime()
    ).toBeGreaterThan(new Date("2026-04-13T00:18:32.500Z").getTime());
  });

  it("clears workflow blocking gaps when a new repair slice starts", async () => {
    const projectRoot = await createProjectRoot();
    await seedProject(projectRoot);

    await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, {
      currentClaim: "The current claim failed verification",
      doneWhenChecklist: [
        { id: "workspace", label: "Workspace scaffolded", status: "pass" },
        { id: "deck", label: "Deck workflow is real", status: "fail" }
      ],
      implementationStatus: "implementing",
      reviewStatus: "review-blocked",
      verificationStatus: "failed",
      closeoutStatus: "not-started",
      knownGaps: [
        "Reviewer 提出了阻塞性发现。",
        "当前 claim 未通过 verification。",
        "还有一个非工作流缺口"
      ],
      finalState: "verification-failed"
    });

    await applyDeckActionState(projectRoot, "advance-phase");

    const state = await loadProjectState(projectRoot);

    expect(state.acceptanceState.reviewStatus).toBe("not-started");
    expect(state.acceptanceState.verificationStatus).toBe("not-started");
    expect(state.acceptanceState.knownGaps).toEqual(["还有一个非工作流缺口"]);
    expect(
      state.activeWork.items.find((item) => item.role === "executor")?.status
    ).toBe("running");
  });

  it("promotes a successful executor run into ready-for-review truth", async () => {
    const projectRoot = await createProjectRoot();
    await seedProject(projectRoot);
    await applyDeckActionState(projectRoot, "advance-phase");

    await createAgentRun(
      projectRoot,
      {
        runId: "run-success",
        projectRoot,
        role: "executor",
        provider: "codex",
        objective: "实现当前 slice",
        scope: ["修改 workflow.ts"],
        doneWhen: ["当前 slice 进入 ready-for-review"],
        verification: ["npm run test"],
        contextRefs: [],
        output: {
          resultPath: ".threadsmith/runs/run-success/result.json",
          summaryPath: ".threadsmith/runs/run-success/result.md"
        }
      },
      "2026-04-08T11:00:00.000Z"
    );
    await writeAgentRunResult(
      projectRoot,
      "run-success",
      {
        runId: "run-success",
        role: "executor",
        provider: "codex",
        outcome: "succeeded",
        summary: "当前 slice 已完成，可进入 review。",
        changedFiles: ["packages/fs-bridge/src/workflow.ts"],
        verification: [{ command: "npm run test", status: "passed" }],
        evidenceRefs: [".threadsmith/runs/run-success/result.md"]
      },
      "2026-04-08T11:05:00.000Z"
    );

    await applyAgentRunResult(projectRoot, "run-success");

    const state = await loadProjectState(projectRoot);
    const events = await readRecentEvents(projectRoot);

    expect(state.acceptanceState.finalState).toBe("ready-for-review");
    expect(state.acceptanceState.reviewStatus).toBe("in-review");
    expect(
      state.activeWork.items.find((item) => item.role === "reviewer")?.status
    ).toBe("running");
    expect(events[0]?.kind).toBe("agent-run");
    expect(events[0]?.outcome).toBe("succeeded");
  });

  it("does not advance workflow truth for artifact-only executor runs", async () => {
    const projectRoot = await createProjectRoot();
    await seedProject(projectRoot);
    await applyDeckActionState(projectRoot, "advance-phase");

    await createAgentRun(
      projectRoot,
      {
        runId: "run-artifact-only",
        projectRoot,
        role: "executor",
        provider: "codex",
        workflowEffect: "artifact-only",
        objective: "运行一轮 self-host smoke",
        scope: ["只写 smoke marker", "不要推进当前 slice workflow truth"],
        doneWhen: ["留下 smoke evidence"],
        verification: ["grep smoke-target.txt"],
        contextRefs: [],
        output: {
          resultPath: ".threadsmith/runs/run-artifact-only/result.json",
          summaryPath: ".threadsmith/runs/run-artifact-only/result.md"
        }
      },
      "2026-04-08T11:10:00.000Z"
    );
    await writeAgentRunResult(
      projectRoot,
      "run-artifact-only",
      {
        runId: "run-artifact-only",
        role: "executor",
        provider: "codex",
        outcome: "succeeded",
        decision: "ready-for-review",
        summary: "Smoke marker 已写入，但这轮只作为 evidence，不应该推进 workflow。",
        changedFiles: ["smoke-target.txt"],
        verification: [{ command: "grep smoke-target.txt", status: "passed" }],
        evidenceRefs: [".threadsmith/runs/run-artifact-only/result.md"]
      },
      "2026-04-08T11:12:00.000Z"
    );

    await applyAgentRunResult(projectRoot, "run-artifact-only");

    const state = await loadProjectState(projectRoot);
    const events = await readRecentEvents(projectRoot);

    expect(state.acceptanceState.finalState).toBe("not-ready");
    expect(state.acceptanceState.reviewStatus).toBe("not-started");
    expect(
      state.activeWork.items.find((item) => item.role === "executor")?.status
    ).toBe("running");
    expect(
      state.activeWork.items.find((item) => item.role === "reviewer")?.status
    ).toBe("waiting");
    expect(events[0]?.kind).toBe("agent-run");
    expect(events[0]?.outcome).toBe("succeeded");
  });

  it("turns a failed executor run into a visible blocker", async () => {
    const projectRoot = await createProjectRoot();
    await seedProject(projectRoot);
    await applyDeckActionState(projectRoot, "advance-phase");

    await createAgentRun(
      projectRoot,
      {
        runId: "run-failed",
        projectRoot,
        role: "executor",
        provider: "codex",
        objective: "实现当前 slice",
        scope: ["修改 workflow.ts"],
        doneWhen: ["当前 slice 进入 ready-for-review"],
        verification: ["npm run test"],
        contextRefs: [],
        output: {
          resultPath: ".threadsmith/runs/run-failed/result.json",
          summaryPath: ".threadsmith/runs/run-failed/result.md"
        }
      },
      "2026-04-08T11:00:00.000Z"
    );
    await writeAgentRunResult(
      projectRoot,
      "run-failed",
      {
        runId: "run-failed",
        role: "executor",
        provider: "codex",
        outcome: "failed",
        summary: "测试失败，当前 slice 还不能交给 review。",
        changedFiles: [],
        verification: [{ command: "npm run test", status: "failed" }],
        evidenceRefs: [".threadsmith/runs/run-failed/result.md"],
        blocker: "测试失败，当前 slice 还不能交给 review。"
      },
      "2026-04-08T11:05:00.000Z"
    );

    await applyAgentRunResult(projectRoot, "run-failed");

    const state = await loadProjectState(projectRoot);
    const events = await readRecentEvents(projectRoot);

    expect(state.acceptanceState.finalState).toBe("not-ready");
    expect(state.activeWork.blockerSummary).toContain("测试失败");
    expect(
      state.activeWork.items.find((item) => item.role === "executor")?.status
    ).toBe("blocked");
    expect(events[0]?.kind).toBe("agent-run");
    expect(events[0]?.outcome).toBe("failed");
  });
});
