import { describe, expect, it } from "vitest";
import {
  miniProtocolContractSchema,
  miniProtocolInstructionSchema
} from "./miniProtocols.ts";

describe("miniProtocolContractSchema", () => {
  it("parses a bounded protocol contract", () => {
    const parsed = miniProtocolContractSchema.parse({
      id: "verify",
      label: "Verify",
      owningRole: "verifier",
      purpose: "Prove or reject the acceptance claim with command-backed evidence.",
      requiredInputs: ["acceptanceState", "currentPhase", "evidenceSummary"],
      requiredOutputs: ["verificationResult", "truthWritebackProposal"],
      evidenceRequired: true,
      stopReasons: ["accepted-with-closeout-pending", "blocked"],
      continuationHint: "Route to closeout when verification passes.",
      guardrails: ["Never convert missing evidence into a pass."]
    });

    expect(parsed.id).toBe("verify");
    expect(parsed.evidenceRequired).toBe(true);
  });

  it("rejects contracts without required guardrails", () => {
    expect(() =>
      miniProtocolContractSchema.parse({
        id: "plan",
        label: "Plan",
        owningRole: "planner",
        purpose: "Turn the current phase into implementation steps.",
        requiredInputs: ["currentPhase"],
        requiredOutputs: ["implementationPlan"],
        evidenceRequired: false,
        stopReasons: ["ready-for-executor"],
        continuationHint: "Route to executor.",
        guardrails: []
      })
    ).toThrow();
  });
});

describe("miniProtocolInstructionSchema", () => {
  it("parses route-aware instruction metadata", () => {
    const parsed = miniProtocolInstructionSchema.parse({
      protocol: {
        id: "debug",
        label: "Debug",
        owningRole: "executor",
        purpose: "Investigate a failure before patching.",
        requiredInputs: ["failureSymptom", "recentDiff", "evidenceSummary"],
        requiredOutputs: ["rootCauseHypothesis", "truthWritebackProposal"],
        evidenceRequired: true,
        stopReasons: ["ready-for-executor", "blocked"],
        continuationHint: "Repair only after a reproduction path exists.",
        guardrails: ["Do not guess at a fix before reproducing or localizing."]
      },
      role: "executor",
      objective: "Investigate a failure before patching.",
      inputChecklist: ["failureSymptom", "recentDiff", "evidenceSummary"],
      outputChecklist: ["rootCauseHypothesis", "truthWritebackProposal"],
      guardrails: ["Do not guess at a fix before reproducing or localizing."],
      stopCondition: "Stop when one of these reasons is reached: ready-for-executor, blocked.",
      continuationHint: "Repair only after a reproduction path exists.",
      route: {
        source: "fallback",
        selectedAdapterId: "systematic-debugging",
        availability: "stale",
        reason: "External adapter is stale; using built-in debug.",
        safetyWarnings: []
      }
    });

    expect(parsed.route.source).toBe("fallback");
    expect(parsed.protocol.id).toBe("debug");
  });
});
