import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { writeContinuationPacket } from "./continuationPackets.ts";
import { appendEvent, readRecentEvents } from "./events.ts";
import {
  ensureStateDir,
  loadProjectSupervisionState,
  loadProjectState,
  writeStateFragment
} from "./fileStore.ts";
import { STATE_FILES } from "./paths.ts";
import { applyPhaseReset } from "./phaseReset.ts";
import {
  readLatestPhaseResetDraftArtifact,
  writePhaseResetDraftArtifact
} from "./phaseResetDraftArtifacts.ts";

const createdRoots: string[] = [];

async function createProjectRoot() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-phase-reset-"));
  createdRoots.push(projectRoot);
  await ensureStateDir(projectRoot);
  return projectRoot;
}

async function seedAcceptedProject(projectRoot: string) {
  await writeStateFragment(projectRoot, STATE_FILES.projectBrief, {
    projectGoal: "Ship Threadsmith autopilot v1",
    currentVersionScope: "All-Codex autopilot mainline",
    nonGoals: ["Multi-provider routing"],
    keyConstraints: ["Deck stays mission control"],
    successFrame: "Accepted slices can cleanly continue into the next phase.",
    priorityOrder: ["Truth fidelity", "Autopilot continuity"],
    openStrategicQuestions: []
  });

  await writeStateFragment(projectRoot, STATE_FILES.currentPhase, {
    phaseName: "Accepted-state continuation / handoff refresh v1",
    phaseGoal: "Write a fresh handoff after accepted closeout",
    deliverable: "Fresh handoff packet",
    inScope: ["Closeout auto writeback"],
    outOfScope: ["Phase reset"],
    stopCondition: "Fresh handoff exists after closeout",
    verificationForThisPhase: ["npm run smoke:self-host"],
    activeOwners: ["planner", "executor", "reviewer", "verifier", "closeout", "hygiene"],
    blockedBy: []
  });

  await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, {
    currentClaim: "Accepted slices now auto-write a fresh handoff packet.",
    doneWhenChecklist: [
      {
        id: "fresh-handoff",
        label: "Accepted closeout writes a fresh handoff packet",
        status: "pass"
      }
    ],
    implementationStatus: "ready-for-review",
    reviewStatus: "ready-for-verification",
    verificationStatus: "passed",
    closeoutStatus: "done",
    knownGaps: [],
    finalState: "accepted"
  });

  await writeStateFragment(projectRoot, STATE_FILES.activeWork, {
    items: [
      {
        role: "planner",
        status: "done",
        taskSummary: "上一刀已完成",
        requiresUserDecision: false
      },
      {
        role: "executor",
        status: "done",
        taskSummary: "上一刀已完成",
        requiresUserDecision: false
      }
    ],
    blockerSummary: null
  });

  await writeStateFragment(projectRoot, STATE_FILES.projectStatus, {
    projectLabel: "Threadsmith",
    currentTrack: "All-Codex autopilot loop polish",
    overallState: "stable",
    currentFocus: "上一刀已 accepted，等待 phase reset。",
    projectStatusSummary: "accepted slice 已收口完毕。",
    latestAcceptedSlice: {
      title: "Accepted-state continuation / handoff refresh v1",
      recordedAt: "2026-04-13T00:18:31.500Z"
    },
    nextPlannedSlice: {
      title: "Phase reset + next-slice drafting v1",
      recordedAt: "2026-04-13T00:18:32.500Z"
    },
    currentMilestoneId: null,
    nextMilestoneId: "phase-reset-next-slice-drafting-v1",
    topRisks: ["Current phase has not been reset yet."],
    updatedAt: "2026-04-13T00:18:32.500Z"
  });

  await writeStateFragment(projectRoot, STATE_FILES.projectRoadmap, {
    versionLabel: "Threadsmith Autopilot v1",
    finalGoal: "Keep accepted slices flowing into the next real phase.",
    milestones: [
      {
        id: "accepted-state-continuation-handoff-refresh-v1",
        label: "Polish 4",
        title: "Accepted-state continuation / handoff refresh v1",
        summary: "accepted closeout writes a fresh handoff packet",
        state: "done"
      },
      {
        id: "phase-reset-next-slice-drafting-v1",
        label: "Next",
        title: "Phase reset + next-slice drafting v1",
        summary: "Reset current truth into the next in-progress slice",
        state: "next"
      },
      {
        id: "command-bridge-v1",
        label: "Later",
        title: "Command bridge v1",
        summary: "Bridge control actions into committed truth",
        state: "later"
      }
    ],
    updatedAt: "2026-04-13T00:18:32.500Z"
  });

  await writeStateFragment(projectRoot, STATE_FILES.projectSupervision, {
    mode: "multi-thread",
    modeLabel: "多角色协作",
    summary: "上一刀已 accepted。",
    lines: [
      {
        id: "conductor-main",
        role: "planner",
        threadLabel: "Conductor",
        provider: "claude",
        presence: "live",
        status: "done",
        taskSummary: "上一刀已完成",
        requiresUserDecision: false,
        blockerSummary: null,
        latestEvidenceLabel: "old-brief.md",
        updatedAt: "2026-04-13T00:18:32.500Z"
      },
      {
        id: "builder-main",
        role: "executor",
        threadLabel: "Builder",
        provider: "codex",
        presence: "live",
        status: "done",
        taskSummary: "上一刀已完成",
        requiresUserDecision: false,
        blockerSummary: null,
        latestEvidenceLabel: "old-result.md",
        updatedAt: "2026-04-13T00:18:32.500Z"
      }
    ],
    updatedAt: "2026-04-13T00:18:32.500Z"
  });

  await writeStateFragment(projectRoot, STATE_FILES.preferences, {
    continuationBehavior: "smart-continuation"
  });
}

afterEach(async () => {
  await Promise.all(
    createdRoots.splice(0).map((projectRoot) =>
      rm(projectRoot, { recursive: true, force: true })
    )
  );
});

describe("applyPhaseReset", () => {
  it("writes the next current phase truth atomically and preserves live supervision identity", async () => {
    const projectRoot = await createProjectRoot();
    await seedAcceptedProject(projectRoot);

    await appendEvent(projectRoot, {
      id: "previous-handoff",
      createdAt: "2026-04-13T00:18:32.500Z",
      kind: "workflow-transition",
      title: "已创建 handoff packet",
      detail: "上一刀 accepted 后自动生成了 handoff packet。 Packet：.threadsmith/packets/2026-04-13T00-18-32-500Z-handoff.md",
      role: "hygiene",
      actionId: "create-handoff",
      artifactPath: ".threadsmith/packets/2026-04-13T00-18-32-500Z-handoff.md"
    });

    const result = await applyPhaseReset(projectRoot, {
      currentPhase: {
        phaseName: "Phase reset + next-slice drafting v1",
        phaseGoal: "Turn the accepted handoff into a formal new current phase.",
        deliverable: "Atomic phase reset flow in fs-bridge",
        inScope: [
          "Phase reset draft schema",
          "Atomic truth writeback",
          "Dogfood Threadsmith with the new reset flow"
        ],
        outOfScope: ["Multi-provider routing", "Frontend restyle"],
        stopCondition: "A reset draft writes the new current phase truth in one call.",
        verificationForThisPhase: [
          "npm run test --workspace @threadsmith/fs-bridge -- src/phaseReset.test.ts src/workflow.test.ts",
          "npm run test --workspace @threadsmith/orchestrator -- src/autopilotContinuation.test.ts"
        ],
        activeOwners: [
          "planner",
          "executor",
          "reviewer",
          "verifier",
          "closeout",
          "hygiene"
        ],
        blockedBy: []
      },
      currentClaim:
        "Threadsmith can reset an accepted slice into a new in-progress current phase from one formal draft.",
      doneWhen: [
        {
          id: "phase-reset-entry",
          label: "A formal phase reset entry writes the six core truth files"
        },
        {
          id: "continuation-flips-to-start",
          label: "Autopilot continuation switches from reset-needed to start after reset"
        }
      ],
      startMode: "implementing",
      projectStatus: {
        currentTrack: "All-Codex autopilot truth reset",
        currentFocus: "正在实现 phase reset + next-slice drafting v1。",
        projectStatusSummary:
          "当前主线已经从上一刀 accepted 切到新的 in-progress current phase。",
        currentMilestoneId: "phase-reset-next-slice-drafting-v1",
        nextMilestoneId: "command-bridge-v1",
        topRisks: [
          "还需要验证 reset 后 continuation 会切成 start。",
          "还需要 dogfood Threadsmith 自己的 reset 流。"
        ]
      },
      projectRoadmap: {
        versionLabel: "Threadsmith Autopilot v1",
        finalGoal: "Keep accepted slices flowing into the next real phase.",
        milestones: [
          {
            id: "accepted-state-continuation-handoff-refresh-v1",
            label: "Polish 4",
            title: "Accepted-state continuation / handoff refresh v1",
            summary: "accepted closeout writes a fresh handoff packet",
            state: "done"
          },
          {
            id: "phase-reset-next-slice-drafting-v1",
            label: "Next",
            title: "Phase reset + next-slice drafting v1",
            summary: "Reset current truth into the next in-progress slice",
            state: "current"
          },
          {
            id: "command-bridge-v1",
            label: "Later",
            title: "Command bridge v1",
            summary: "Bridge control actions into committed truth",
            state: "next"
          }
        ],
        updatedAt: null
      },
      roleSummaries: {
        planner: "已根据 accepted packet 定义新的 current phase。",
        executor: "正在实现 atomic phase reset flow。",
        reviewer: "等待 executor 交付后审查 reset 行为。",
        verifier: "等待 review 放行后验证 reset -> start。",
        closeout: "等待 verification 通过后再收尾。",
        hygiene: "已依据 accepted packet 完成 phase reset 重锚定。"
      },
      supervisionSummary:
        "当前 current phase 已重置，executor 正在推进 atomic phase reset flow。",
      recordedAt: "2026-04-13T00:00:00.000Z"
    });

    const state = await loadProjectState(projectRoot);
    const supervision = await loadProjectSupervisionState(projectRoot, state);
    const events = await readRecentEvents(projectRoot);

    expect(result.currentPhase.phaseName).toBe("Phase reset + next-slice drafting v1");
    expect(state.currentPhase.phaseName).toBe("Phase reset + next-slice drafting v1");
    expect(state.acceptanceState.implementationStatus).toBe("implementing");
    expect(state.acceptanceState.finalState).toBe("not-ready");
    expect(state.acceptanceState.doneWhenChecklist.every((item) => item.status === "unknown")).toBe(true);
    expect(
      state.activeWork.items.find((item) => item.role === "planner")?.status
    ).toBe("done");
    expect(
      state.activeWork.items.find((item) => item.role === "executor")?.status
    ).toBe("running");
    expect(state.projectStatus.latestAcceptedSlice?.title).toBe(
      "Accepted-state continuation / handoff refresh v1"
    );
    expect(state.projectStatus.currentMilestoneId).toBe(
      "phase-reset-next-slice-drafting-v1"
    );
    expect(state.projectRoadmap.milestones[1]?.state).toBe("current");
    expect(state.projectRoadmap.milestones[2]?.state).toBe("next");
    expect(supervision.lines.find((line) => line.role === "planner")?.id).toBe(
      "conductor-main"
    );
    expect(supervision.lines.find((line) => line.role === "planner")?.provider).toBe(
      "claude"
    );
    expect(supervision.lines.find((line) => line.role === "executor")?.threadLabel).toBe(
      "Builder"
    );
    expect(
      supervision.lines.find((line) => line.role === "executor")?.latestEvidenceLabel
    ).toBeNull();
    expect(events[0]?.title).toBe("Current phase 已重置");
    expect(events[0]?.detail).toContain("Phase reset + next-slice drafting v1");
    expect(events[0]?.createdAt).toBe("2026-04-13T00:18:32.501Z");
    expect(result.createdAt).toBe("2026-04-13T00:18:32.501Z");
  });

  it("writes a starter phase reset draft artifact from accepted truth without mutating current state", async () => {
    const projectRoot = await createProjectRoot();
    await seedAcceptedProject(projectRoot);

    const acceptedState = await loadProjectState(projectRoot);
    const existingEvents = await readRecentEvents(projectRoot);
    const handoff = await writeContinuationPacket(projectRoot, {
      kind: "handoff",
      state: acceptedState,
      recentEvents: existingEvents,
      createdAt: "2026-04-13T00:18:32.500Z",
      continuationBehavior:
        acceptedState.preferences.resolved.continuationBehavior
    });

    await appendEvent(projectRoot, {
      id: "accepted-handoff",
      createdAt: "2026-04-13T00:18:32.501Z",
      kind: "workflow-transition",
      title: "已创建 handoff packet",
      detail: `上一刀 accepted 后自动生成了 handoff packet。 Packet：${handoff.relativePath}`,
      role: "hygiene",
      actionId: "create-handoff",
      artifactPath: handoff.relativePath
    });

    const artifact = await writePhaseResetDraftArtifact(projectRoot, {
      createdAt: "2026-04-13T00:18:32.502Z"
    });
    const latest = await readLatestPhaseResetDraftArtifact(projectRoot);
    const stateAfterWrite = await loadProjectState(projectRoot);
    const events = await readRecentEvents(projectRoot);

    expect(artifact.draft.currentPhase.phaseName).toBe(
      "Phase reset + next-slice drafting v1"
    );
    expect(artifact.sourceHandoffPath).toBe(handoff.relativePath);
    expect(artifact.markdownRelativePath).toContain(
      ".threadsmith/phase-reset-drafts/"
    );
    expect(latest?.draft.currentPhase.phaseName).toBe(
      "Phase reset + next-slice drafting v1"
    );
    expect(latest?.sourceHandoffPath).toBe(handoff.relativePath);
    expect(stateAfterWrite.currentPhase.phaseName).toBe(
      "Accepted-state continuation / handoff refresh v1"
    );
    expect(stateAfterWrite.acceptanceState.finalState).toBe("accepted");
    expect(events[0]?.title).toBe("已生成 phase reset draft：「Phase reset + next-slice drafting v1」");
    expect(events[0]?.artifactPath).toBe(artifact.markdownRelativePath);
    expect(events[0]?.detail).toContain(handoff.relativePath);
  });

  it("can backfill a committed phase reset draft artifact from the latest accepted handoff after phase reset", async () => {
    const projectRoot = await createProjectRoot();
    await seedAcceptedProject(projectRoot);

    const acceptedState = await loadProjectState(projectRoot);
    const existingEvents = await readRecentEvents(projectRoot);
    const handoff = await writeContinuationPacket(projectRoot, {
      kind: "handoff",
      state: acceptedState,
      recentEvents: existingEvents,
      createdAt: "2026-04-13T00:18:32.500Z",
      continuationBehavior:
        acceptedState.preferences.resolved.continuationBehavior
    });

    await appendEvent(projectRoot, {
      id: "accepted-handoff",
      createdAt: "2026-04-13T00:18:32.501Z",
      kind: "workflow-transition",
      title: "已创建 handoff packet",
      detail: `上一刀 accepted 后自动生成了 handoff packet。 Packet：${handoff.relativePath}`,
      role: "hygiene",
      actionId: "create-handoff",
      artifactPath: handoff.relativePath
    });

    await applyPhaseReset(projectRoot, {
      currentPhase: {
        phaseName: "Phase reset draft artifact v1",
        phaseGoal: "Turn accepted handoff guidance into a committed phase reset draft artifact.",
        deliverable: "Formal phase reset draft writer and artifact format",
        inScope: [
          "Write a committed phase reset draft artifact",
          "Keep accepted handoff as the source boundary",
          "Dogfood the artifact on Threadsmith truth"
        ],
        outOfScope: ["Auto-execute phase reset", "Multi-provider routing"],
        stopCondition: "Threadsmith can generate a committed phase reset draft artifact.",
        verificationForThisPhase: [
          "npm run test --workspace @threadsmith/fs-bridge -- src/phaseReset.test.ts"
        ],
        activeOwners: [
          "planner",
          "executor",
          "reviewer",
          "verifier",
          "closeout",
          "hygiene"
        ],
        blockedBy: []
      },
      currentClaim:
        "Threadsmith can turn accepted handoff guidance into a committed phase reset draft artifact.",
      doneWhen: [
        {
          id: "draft-artifact-written",
          label: "accepted handoff can produce a committed phase reset draft artifact"
        },
        {
          id: "starter-draft-aligned",
          label: "the artifact stays aligned with the current phase truth"
        }
      ],
      startMode: "implementing",
      projectStatus: {
        currentTrack: "Phase reset draft artifact",
        currentFocus: "Write a committed artifact from the latest accepted handoff boundary.",
        projectStatusSummary:
          "The current slice is formalizing accepted handoff guidance into a committed artifact.",
        latestAcceptedSlice: {
          title: "Accepted-state continuation / handoff refresh v1",
          recordedAt: "2026-04-13T00:18:32.500Z"
        },
        nextPlannedSlice: null,
        currentMilestoneId: "phase-reset-draft-artifact-v1",
        nextMilestoneId: null,
        topRisks: ["The draft artifact does not exist yet."],
        overallState: "in-progress"
      },
      projectRoadmap: {
        versionLabel: "Threadsmith Autopilot v1",
        finalGoal: "Keep accepted slices flowing into committed next-phase artifacts.",
        milestones: [
          {
            id: "accepted-state-continuation-handoff-refresh-v1",
            label: "Polish 4",
            title: "Accepted-state continuation / handoff refresh v1",
            summary: "accepted closeout writes a fresh handoff packet",
            state: "done"
          },
          {
            id: "phase-reset-draft-artifact-v1",
            label: "Polish 5",
            title: "Phase reset draft artifact v1",
            summary: "write a committed draft artifact from the latest accepted handoff",
            state: "current"
          }
        ],
        updatedAt: "2026-04-13T00:18:32.502Z"
      },
      roleSummaries: {
        planner: "已把这刀正式切到 committed current phase。",
        executor: "正在实现 draft artifact writer。",
        reviewer: "等待 executor 交付后 review。",
        verifier: "等待 review 放行后 verification。",
        closeout: "等待 verification 完成后 closeout。",
        hygiene: "accepted handoff 仍是这刀的起点边界。"
      },
      supervisionSummary: "Current slice is implementing the committed phase reset draft artifact.",
      recordedAt: "2026-04-13T00:18:32.502Z"
    });

    const artifact = await writePhaseResetDraftArtifact(projectRoot, {
      createdAt: "2026-04-13T00:18:32.503Z"
    });
    const latest = await readLatestPhaseResetDraftArtifact(projectRoot);
    const stateAfterWrite = await loadProjectState(projectRoot);
    const events = await readRecentEvents(projectRoot);

    expect(artifact.draft.currentPhase.phaseName).toBe("Phase reset draft artifact v1");
    expect(artifact.draft.startMode).toBe("implementing");
    expect(artifact.sourcePhaseName).toBe("Accepted-state continuation / handoff refresh v1");
    expect(artifact.sourceAcceptedSliceTitle).toBe(
      "Accepted-state continuation / handoff refresh v1"
    );
    expect(artifact.sourceHandoffPath).toBe(handoff.relativePath);
    expect(latest?.draft.currentPhase.phaseName).toBe("Phase reset draft artifact v1");
    expect(latest?.sourcePhaseName).toBe("Accepted-state continuation / handoff refresh v1");
    expect(stateAfterWrite.currentPhase.phaseName).toBe("Phase reset draft artifact v1");
    expect(stateAfterWrite.acceptanceState.finalState).toBe("not-ready");
    expect(events[0]?.title).toBe("已生成 phase reset draft：「Phase reset draft artifact v1」");
    expect(events[0]?.detail).toContain("补写 committed");
    expect(events[0]?.detail).toContain(handoff.relativePath);
  });
});
