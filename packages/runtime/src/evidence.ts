import type { ProjectState, WorkflowEvent } from "@threadsmith/domain";

export interface VerificationEvidenceSummary {
  status: "not-started" | "ready" | "running" | "passed" | "failed";
  headline: string;
  detail: string;
  recordedAt: string | null;
  source: "event" | "state";
  artifactPath: string | null;
}

export function deriveLatestVerificationEvidence(
  state: ProjectState,
  recentEvents: WorkflowEvent[]
): VerificationEvidenceSummary {
  const latestVerifierEvent = recentEvents.find((event) => event.role === "verifier");

  if (latestVerifierEvent?.transitionId === "verifier-accepted") {
    return {
      status: "passed",
      headline: latestVerifierEvent.title,
      detail: latestVerifierEvent.detail,
      recordedAt: latestVerifierEvent.createdAt,
      source: "event",
      artifactPath: latestVerifierEvent.artifactPath ?? null
    };
  }

  if (latestVerifierEvent?.transitionId === "verifier-failed") {
    return {
      status: "failed",
      headline: latestVerifierEvent.title,
      detail: latestVerifierEvent.detail,
      recordedAt: latestVerifierEvent.createdAt,
      source: "event",
      artifactPath: latestVerifierEvent.artifactPath ?? null
    };
  }

  if (latestVerifierEvent?.actionId === "run-verification") {
    return {
      status: "running",
      headline: latestVerifierEvent.title,
      detail: latestVerifierEvent.detail,
      recordedAt: latestVerifierEvent.createdAt,
      source: "event",
      artifactPath: latestVerifierEvent.artifactPath ?? null
    };
  }

  switch (state.acceptanceState.verificationStatus) {
    case "failed":
      return {
        status: "failed",
        headline: "Verification 失败",
        detail: "当前 claim 还没有被证据支持。",
        recordedAt: null,
        source: "state",
        artifactPath: null
      };
    case "passed":
      return {
        status: "passed",
        headline: "Verification 通过",
        detail: "当前 claim 已被最新接受的证据支持。",
        recordedAt: null,
        source: "state",
        artifactPath: null
      };
    case "running":
      return {
        status: "running",
        headline: "Verification 进行中",
        detail: "新的 verification 正在进行中。",
        recordedAt: null,
        source: "state",
        artifactPath: null
      };
    case "ready":
      return {
        status: "ready",
        headline: "Verification 已就绪",
        detail: "这个 slice 已经准备好进入证明阶段，但 verification 还没有开始。",
        recordedAt: null,
        source: "state",
        artifactPath: null
      };
    default:
      return {
        status: "not-started",
        headline: "还没有 verification 证据",
        detail: "当前 claim 的 verification 还没有开始。",
        recordedAt: null,
        source: "state",
        artifactPath: null
      };
  }
}
