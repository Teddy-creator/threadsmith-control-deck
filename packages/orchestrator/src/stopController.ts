import type {
  ExecutionResult,
  PhaseOwner,
  PhaseRunPauseType
} from "@threadsmith/domain";

const DEFAULT_REPAIR_CAP = 2;
const DEFAULT_TRANSIENT_RETRY_CAP = 1;

export interface PhasePausePlan {
  type: PhaseRunPauseType;
  summary: string;
  detail: string;
  resumeRequirements: string[];
}

export type PhaseRunNextStep =
  | {
      kind: "continue";
      nextRole: PhaseOwner;
    }
  | {
      kind: "repair";
      nextRole: "planner";
      repairCount: number;
      detail: string;
    }
  | {
      kind: "retry";
      nextRole: PhaseOwner;
      transientRetryCount: number;
      detail: string;
    }
  | {
      kind: "pause";
      resumeRole: PhaseOwner;
      pause: PhasePausePlan;
    }
  | {
      kind: "accepted";
    };

export interface DecidePhaseRunNextStepInput {
  role: PhaseOwner;
  result: ExecutionResult;
  repairCount: number;
  transientRetryCount: number;
  maxRepairCount?: number;
  maxTransientRetryCount?: number;
}

function resultSummary(result: ExecutionResult) {
  return result.blocker?.trim() || result.summary.trim();
}

function pausePlan(
  type: PhaseRunPauseType,
  summary: string,
  detail: string,
  resumeRequirements: string[]
): PhasePausePlan {
  return {
    type,
    summary,
    detail,
    resumeRequirements
  };
}

function riskPause(result: ExecutionResult): PhasePausePlan {
  const risks = result.riskHits ?? [];
  const detail = risks.length > 0 ? `命中的风险项：${risks.join("；")}` : resultSummary(result);

  return pausePlan(
    "risk",
    "本轮命中了固定风险规则，自动链路已暂停。",
    detail,
    ["确认风险是否允许当前 phase 继续", "必要时收紧范围或改由人工接管"]
  );
}

function blockedPause(result: ExecutionResult): PhasePausePlan {
  return pausePlan(
    "blocked",
    "当前角色没有给出可继续的结果，自动链路已暂停。",
    resultSummary(result),
    ["补齐阻塞条件后再继续", "必要时让 planner 重新收束范围"]
  );
}

function infraPause(result: ExecutionResult): PhasePausePlan {
  return pausePlan(
    "infra-failure",
    "自动执行桥在基础设施层面持续失败，自动链路已暂停。",
    resultSummary(result),
    ["确认 Codex CLI / bridge 已恢复", "恢复后再明确 resume"]
  );
}

function loopLimitPause(role: PhaseOwner, result: ExecutionResult): PhasePausePlan {
  return pausePlan(
    "loop-limit",
    "repair loop 已达到上限，自动链路已暂停等待人工介入。",
    `${role} 仍然返回阻塞性结论：${resultSummary(result)}`,
    ["人工确认下一条修复方向", "准备好后从 planner 恢复"]
  );
}

function pauseRecommended(result: ExecutionResult): PhasePausePlan {
  if (result.pauseRecommendation) {
    return result.pauseRecommendation;
  }

  return pausePlan(
    "missing-info",
    "Planner 认为当前真相不足以安全继续。",
    resultSummary(result),
    ["补齐缺失信息", "确认当前 phase 的 done when 与 verification"]
  );
}

function isInfrastructureFailure(result: ExecutionResult) {
  return (
    result.outcome === "failed" &&
    (
      result.failureStage === "cli-startup" ||
      result.failureStage === "result-reporting" ||
      result.failureKind === "rate-limit" ||
      result.failureKind === "cli-startup" ||
      result.failureKind === "cli-exit" ||
      result.failureKind === "missing-structured-result"
    )
  );
}

function repairOrPause(
  input: DecidePhaseRunNextStepInput
): PhaseRunNextStep {
  const maxRepairCount = input.maxRepairCount ?? DEFAULT_REPAIR_CAP;

  if (input.repairCount >= maxRepairCount) {
    return {
      kind: "pause",
      resumeRole: "planner",
      pause: loopLimitPause(input.role, input.result)
    };
  }

  return {
    kind: "repair",
    nextRole: "planner",
    repairCount: input.repairCount + 1,
    detail: resultSummary(input.result)
  };
}

export function decidePhaseRunNextStep(
  input: DecidePhaseRunNextStepInput
): PhaseRunNextStep {
  if ((input.result.riskHits?.length ?? 0) > 0) {
    return {
      kind: "pause",
      resumeRole: input.role,
      pause: riskPause(input.result)
    };
  }

  if (input.result.decision === "pause-recommended") {
    return {
      kind: "pause",
      resumeRole: "planner",
      pause: pauseRecommended(input.result)
    };
  }

  if (isInfrastructureFailure(input.result)) {
    const maxTransientRetryCount =
      input.maxTransientRetryCount ?? DEFAULT_TRANSIENT_RETRY_CAP;

    if (input.transientRetryCount < maxTransientRetryCount) {
      return {
        kind: "retry",
        nextRole: input.role,
        transientRetryCount: input.transientRetryCount + 1,
        detail: resultSummary(input.result)
      };
    }

    return {
      kind: "pause",
      resumeRole: input.role,
      pause: infraPause(input.result)
    };
  }

  switch (input.role) {
    case "planner":
      if (input.result.outcome === "succeeded" && input.result.decision === "slice-ready") {
        return {
          kind: "continue",
          nextRole: "executor"
        };
      }
      return {
        kind: "pause",
        resumeRole: "planner",
        pause: blockedPause(input.result)
      };
    case "executor":
      if (input.result.outcome === "succeeded") {
        return {
          kind: "continue",
          nextRole: "reviewer"
        };
      }
      return {
        kind: "pause",
        resumeRole: "executor",
        pause: blockedPause(input.result)
      };
    case "reviewer":
      if (input.result.decision === "review-blocked") {
        return repairOrPause(input);
      }
      if (input.result.outcome === "succeeded" && input.result.decision === "ready-for-verification") {
        return {
          kind: "continue",
          nextRole: "verifier"
        };
      }
      return {
        kind: "pause",
        resumeRole: "reviewer",
        pause: blockedPause(input.result)
      };
    case "verifier":
      if (input.result.decision === "verification-failed") {
        return repairOrPause(input);
      }
      if (
        input.result.outcome === "succeeded" &&
        input.result.decision === "accepted-with-closeout-pending"
      ) {
        return {
          kind: "continue",
          nextRole: "closeout"
        };
      }
      return {
        kind: "pause",
        resumeRole: "verifier",
        pause: blockedPause(input.result)
      };
    case "closeout":
      if (
        input.result.outcome === "succeeded" &&
        (input.result.decision === "accepted" || input.result.decision === undefined)
      ) {
        return {
          kind: "accepted"
        };
      }
      return {
        kind: "pause",
        resumeRole: "closeout",
        pause: blockedPause(input.result)
      };
    case "hygiene":
      return {
        kind: "continue",
        nextRole: "planner"
      };
  }
}
