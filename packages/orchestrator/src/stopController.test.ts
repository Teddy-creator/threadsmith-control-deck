import { describe, expect, it } from "vitest";
import type { ExecutionResult, PhaseOwner } from "@threadsmith/domain";
import { decidePhaseRunNextStep } from "./stopController.ts";

function makeResult(
  role: PhaseOwner,
  override: Partial<ExecutionResult> = {}
): ExecutionResult {
  return {
    runId: `run-${role}`,
    role,
    provider: "codex",
    outcome: "succeeded",
    summary: `${role} completed`,
    changedFiles: [],
    verification: [],
    evidenceRefs: [],
    ...override
  };
}

describe("decidePhaseRunNextStep", () => {
  it("routes reviewer-blocked into repair while under the repair cap", () => {
    const decision = decidePhaseRunNextStep({
      role: "reviewer",
      repairCount: 0,
      transientRetryCount: 0,
      result: makeResult("reviewer", {
        decision: "review-blocked",
        blocker: "A blocking review finding still exists."
      })
    });

    expect(decision).toMatchObject({
      kind: "repair",
      nextRole: "planner",
      repairCount: 1
    });
  });

  it("pauses with loop-limit once the repair cap is exhausted", () => {
    const decision = decidePhaseRunNextStep({
      role: "verifier",
      repairCount: 2,
      transientRetryCount: 0,
      result: makeResult("verifier", {
        decision: "verification-failed",
        blocker: "The claim is still not supported by evidence."
      })
    });

    expect(decision.kind).toBe("pause");
    if (decision.kind !== "pause") {
      throw new Error("expected pause decision");
    }
    expect(decision.pause.type).toBe("loop-limit");
    expect(decision.resumeRole).toBe("planner");
  });

  it("pauses immediately when a role reports risk hits", () => {
    const decision = decidePhaseRunNextStep({
      role: "executor",
      repairCount: 0,
      transientRetryCount: 0,
      result: makeResult("executor", {
        outcome: "failed",
        riskHits: ["deployment entrypoint"],
        blocker: "Touches release infrastructure."
      })
    });

    expect(decision.kind).toBe("pause");
    if (decision.kind !== "pause") {
      throw new Error("expected pause decision");
    }
    expect(decision.pause.type).toBe("risk");
    expect(decision.resumeRole).toBe("executor");
  });

  it("retries one transient infrastructure failure before pausing", () => {
    const firstAttempt = decidePhaseRunNextStep({
      role: "planner",
      repairCount: 0,
      transientRetryCount: 0,
      result: makeResult("planner", {
        outcome: "failed",
        failureStage: "cli-startup",
        failureKind: "cli-startup",
        blocker: "spawn failed"
      })
    });

    expect(firstAttempt).toMatchObject({
      kind: "retry",
      nextRole: "planner",
      transientRetryCount: 1
    });

    const secondAttempt = decidePhaseRunNextStep({
      role: "planner",
      repairCount: 0,
      transientRetryCount: 1,
      result: makeResult("planner", {
        outcome: "failed",
        failureStage: "cli-startup",
        failureKind: "cli-startup",
        blocker: "spawn failed again"
      })
    });

    expect(secondAttempt.kind).toBe("pause");
    if (secondAttempt.kind !== "pause") {
      throw new Error("expected pause decision");
    }
    expect(secondAttempt.pause.type).toBe("infra-failure");
  });
});
