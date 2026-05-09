import type { AgentRunRecord, ProjectState } from "@threadsmith/domain";
import type { LatestContinuationState } from "./continuationState.ts";
import {
  createMissingPhasePauseSummary,
  createMissingPhaseRunSummary,
  type PhasePauseSummary,
  type PhaseRunSummary
} from "./phaseRun.ts";
import type { ContextRecoverySignal } from "./contextRecovery.ts";

export type RuntimeActionId =
  | "advance-phase"
  | "open-current-phase"
  | "run-verification"
  | "sync-context"
  | "run-hygiene"
  | "create-handoff";

export interface ActionRecommendation {
  actionId: RuntimeActionId;
  label: string;
  reason: string;
  expectedRoles: string[];
  stopCondition: string;
}

export interface NextBestStepDecision {
  primary: ActionRecommendation;
  alternatives: [ActionRecommendation, ActionRecommendation];
}

function appendIfMissing(base: string, fragment: string) {
  return base.includes(fragment) ? base : `${base} ${fragment}`.trim();
}

function recommendation(
  actionId: RuntimeActionId,
  label: string,
  reason: string,
  expectedRoles: string[],
  stopCondition: string
): ActionRecommendation {
  return {
    actionId,
    label,
    reason,
    expectedRoles,
    stopCondition
  };
}

function formatRunningRole(role: string) {
  switch (role) {
    case "executor":
      return "执行";
    case "reviewer":
      return "评审";
    case "verifier":
      return "验证";
    case "closeout":
      return "收尾";
    case "hygiene":
      return "整理";
    default:
      return "工作流";
  }
}

function isReportingFailureAfterSuccessfulTask(latestRun: AgentRunRecord | null) {
  return (
    latestRun?.status === "failed" &&
    latestRun.taskOutcome === "succeeded" &&
    latestRun.failureStage === "result-reporting"
  );
}

function findPendingUserDecision(state: ProjectState) {
  return state.activeWork.items.find((item) => item.requiresUserDecision);
}

function isBootstrapDecisionStage(
  state: ProjectState,
  latestRun: AgentRunRecord | null,
  latestPhaseRun: PhaseRunSummary
) {
  return (
    latestRun === null &&
    latestPhaseRun.status === "missing" &&
    state.acceptanceState.implementationStatus === "not-started" &&
    state.acceptanceState.reviewStatus === "not-started" &&
    state.acceptanceState.verificationStatus === "not-started" &&
    state.currentPhase.activeOwners.every((role) => role === "planner") &&
    Boolean(findPendingUserDecision(state))
  );
}

function acceptedStateRecommendation(
  latestContinuationState: LatestContinuationState
): NextBestStepDecision {
  if (latestContinuationState.status === "available") {
    if (latestContinuationState.freshness === "stale") {
      return {
        primary: recommendation(
          "create-handoff",
          "刷新 continuation packet",
          "已经有 packet 了，但它之后又出现了更新的 workflow truth，所以现在最稳妥的动作是刷新 handoff 边界。",
          ["hygiene", "closeout"],
          "最新的 continuation packet 与当前已接受 truth 保持一致。"
        ),
        alternatives: [
          recommendation(
            "open-current-phase",
            "查看已接受的 phase",
            "在重新生成 packet 之前，先检查最新已接受的边界。",
            ["planner"],
            "当前已接受的 slice 已被完整理解。"
          ),
          recommendation(
            "run-hygiene",
            "刷新前先重新锚定",
            "如果你想在替换过期 packet 前先做一次轻量 hygiene，这会很合适。",
            ["hygiene"],
            "当前 truth 已为 packet 刷新重新锚定。"
          )
        ]
      };
    }

    if (latestContinuationState.kind === "handoff") {
      return {
        primary: recommendation(
          "open-current-phase",
          "起草下一刀并准备 phase reset",
          "上一刀已经 accepted，而且最新 handoff packet 已经就绪；最佳下一步不是重复查看，而是基于这份边界收束下一条窄 slice，并准备正式的 phase reset。",
          ["planner", "hygiene"],
          "新的 current phase draft 已准备好，并且可以正式 phase reset。"
        ),
        alternatives: [
          recommendation(
            "run-hygiene",
            "为下一 slice 重新锚定",
            "如果你想在继续使用这个 packet 前再做一次 hygiene，这会很有用。",
            ["hygiene"],
            "当前 truth 已为下一步重新锚定。"
          ),
          recommendation(
            "open-current-phase",
            "查看 accepted handoff 边界",
            "如果你想先重新阅读上一刀的 accepted 边界与 packet 内容，可以先从这里开始。",
            ["planner"],
            "当前已接受的 slice 与 handoff 边界已被完整理解。"
          )
        ]
      };
    }

    return {
      primary: recommendation(
        "create-handoff",
        "打包已接受状态",
        "虽然已经有 hygiene packet，但已接受的 slice 仍然更适合为下一 phase 生成一个专用 handoff packet。",
        ["hygiene", "closeout"],
        "下一 phase 已有可复用的 handoff packet。"
      ),
      alternatives: [
        recommendation(
          "open-current-phase",
          "查看已接受的 phase",
          "在继续前先检查已经完成的 phase contract 和 acceptance 状态。",
          ["planner"],
          "当前已接受的 slice 已被完整理解。"
        ),
        recommendation(
          "run-hygiene",
          "为下一 slice 重新锚定",
          "在起草下一 phase 或切到新的 continuation 之前这样做会更稳。",
          ["hygiene"],
          "当前 truth 已为下一步重新锚定。"
        )
      ]
    };
  }

  return {
    primary: recommendation(
      "create-handoff",
      "打包已接受状态",
      "这个 slice 已被接受，因此最佳下一步是保留一个干净的 continuation 点或 phase handoff。",
      ["hygiene", "closeout"],
      "下一 phase 已有可复用的 continuation packet。"
    ),
    alternatives: [
      recommendation(
        "open-current-phase",
        "查看已接受的 phase",
        "在继续前先检查已经完成的 phase contract 和 acceptance 状态。",
        ["planner"],
        "当前已接受的 slice 已被完整理解。"
      ),
      recommendation(
        "run-hygiene",
        "为下一 slice 重新锚定",
        "在起草下一 phase 或切到新的 continuation 之前这样做会更稳。",
        ["hygiene"],
        "当前 truth 已为下一步重新锚定。"
      )
    ]
  };
}

export function selectNextBestStep(
  state: ProjectState,
  latestContinuationState: LatestContinuationState = {
    status: "missing",
    kind: null,
    freshness: null,
    headline: "还没有 handoff 或 hygiene packet",
    detail: "运行 hygiene 或创建 handoff，把当前 Threadsmith truth 收进可复用的 packet。",
    freshnessDetail: null,
    recordedAt: null
  },
  latestRun: AgentRunRecord | null = null,
  latestPhaseRun: PhaseRunSummary = createMissingPhaseRunSummary(),
  latestPhasePause: PhasePauseSummary = createMissingPhasePauseSummary(),
  contextRecovery: ContextRecoverySignal | null = null
): NextBestStepDecision {
  if (latestPhaseRun.status === "paused") {
    const pauseReason = latestPhasePause.summary
      ? `自动链路当前需要你介入：${latestPhasePause.summary}`
      : latestPhaseRun.operatorDetail;
    const recoveryReason = latestPhaseRun.resumeHint
      ? appendIfMissing(
          pauseReason,
          "请先补齐恢复条件，再回到指挥入口 continue 当前自动链路。"
        )
      : pauseReason;

    return {
      primary: recommendation(
        "open-current-phase",
        "先处理恢复条件",
        recoveryReason,
        [latestPhaseRun.currentRole ?? "planner"],
        latestPhaseRun.resumeHint
          ? "恢复条件已满足，并且已经回到指挥入口显式 continue 当前自动链路。"
          : "暂停原因已被处理，自动链路可以安全继续。"
      ),
      alternatives: [
        recommendation(
          "run-hygiene",
          "暂停后先重新锚定",
          "如果暂停暴露出范围漂移或上下文污染，先做一次 hygiene 会更稳。",
          ["hygiene"],
          "当前 truth、暂停原因和恢复条件已经重新拆开。"
        ),
        recommendation(
          "create-handoff",
          "为暂停态创建恢复点",
          "如果你想先留一个更干净的恢复边界，这会很有用。",
          ["hygiene"],
          "已经存在一个最新 continuation packet。"
        )
      ]
    };
  }

  if (latestPhaseRun.status === "running") {
    const roleLabel = latestPhaseRun.currentRoleLabel ?? "自动链路";
    return {
      primary: recommendation(
        "open-current-phase",
        "等待自动链路结果回流",
        latestPhaseRun.operatorDetail,
        [latestPhaseRun.currentRole ?? "planner"],
        "这轮 automatic chain 写回 committed truth，或进入新的暂停 / 失败状态。"
      ),
      alternatives: [
        recommendation(
          "run-hygiene",
          "等待结果前先重新锚定",
          "如果你担心线程继续变重，先做一次 hygiene 会更稳。",
          ["hygiene"],
          "当前 truth 与下一步边界已经重新清晰化。"
        ),
        recommendation(
          "create-handoff",
          "为当前执行创建恢复点",
          "如果你需要为这轮 automatic chain 留一个干净恢复点，可以先做 handoff。",
          ["hygiene"],
          "已经存在一个最新 continuation packet。"
        )
      ]
    };
  }

  if (latestRun?.status === "running") {
    const roleLabel = formatRunningRole(latestRun.role);
    return {
      primary: recommendation(
        "open-current-phase",
        `等待${roleLabel}结果回流`,
        latestRun.statusDetail?.trim()
          ? `${latestRun.statusDetail.trim()} 当前无需重新签发动作，先等待结果回流到 committed truth，等 committed truth 更新后再判断下一步。`
          : `${latestRun.provider} 已经在执行当前 ${latestRun.role} 任务，当前无需重新签发动作，先等待结果回流到 committed truth，等 committed truth 更新后再判断下一步。`,
        [latestRun.role],
        "这轮自动执行完成，并把结果写回当前项目 truth。"
      ),
      alternatives: [
        recommendation(
          "run-hygiene",
          "等待结果前先重新锚定",
          "如果你担心线程继续变重，先做一次 hygiene 会更稳。",
          ["hygiene"],
          "当前 truth 与下一步边界已经重新清晰化。"
        ),
        recommendation(
          "create-handoff",
          "为当前执行创建恢复点",
          "如果你需要为这轮自动执行保留一个干净恢复点，可以先做 handoff。",
          ["hygiene"],
          "已经存在一个最新 continuation packet。"
        )
      ]
    };
  }

  if (latestRun?.status === "failed") {
    if (isReportingFailureAfterSuccessfulTask(latestRun)) {
      return {
        primary: recommendation(
          "advance-phase",
          "处理结果上报失败",
          latestRun.statusDetail?.trim()
            ? `最新自动执行的任务体已完成，但结果上报失败：${latestRun.statusDetail.trim()}`
            : "最新自动执行的任务体已完成，但结果没有成功回流；现在最有价值的动作是先处理 bridge / CLI 上报问题。",
          ["planner", "executor"],
          "结果上报问题已被定位或修复，最新运行 truth 与任务体真实状态重新一致。"
        ),
        alternatives: [
          recommendation(
            "open-current-phase",
            "查看当前 phase 边界",
            "先确认这轮任务主体完成了什么、哪些证据已可信，再决定如何修复回流问题。",
            ["planner"],
            "phase contract、最新证据与修复目标重新对齐。"
          ),
          recommendation(
            "run-hygiene",
            "失败后先重新锚定",
            "如果这次上报失败让上下文开始混乱，先做一次 hygiene 会更稳。",
            ["hygiene"],
            "已把任务主体结果、上报失败原因与下一步修复动作重新拆开。"
          )
        ]
      };
    }

    return {
      primary: recommendation(
        "advance-phase",
        "修复自动执行失败",
        latestRun.statusDetail?.trim()
          ? `最新自动执行失败：${latestRun.statusDetail.trim()}`
          : "最新自动执行没有完成，因此现在最有价值的动作是做一个窄范围修复 slice。",
        ["planner", "executor"],
        "自动执行失败的原因已被修复，新的候选修改重新准备好进入 review。"
      ),
      alternatives: [
        recommendation(
          "open-current-phase",
          "查看当前 phase 边界",
          "先确认这次失败仍然落在当前 slice 范围内，再决定如何修复。",
          ["planner"],
          "phase contract 与修复目标重新对齐。"
        ),
        recommendation(
          "run-hygiene",
          "失败后先重新锚定",
          "如果失败暴露出旧假设或上下文漂移，先做 hygiene 会更稳。",
          ["hygiene"],
          "已把失败原因、当前事实和下一步修复动作重新分开。"
        )
      ]
    };
  }

  if (state.acceptanceState.finalState === "accepted") {
    return acceptedStateRecommendation(latestContinuationState);
  }

  const shouldPrioritizeContextRecovery =
    contextRecovery &&
    (contextRecovery.action === "sync-context" ||
      contextRecovery.action === "run-hygiene") &&
    state.activeWork.items.every((item) => item.status !== "running");

  if (shouldPrioritizeContextRecovery && contextRecovery.action === "sync-context") {
    return {
      primary: recommendation(
        "sync-context",
        contextRecovery.currentPacketStatus === "missing"
          ? "生成 Context Packet"
          : "刷新 Context Packet",
        contextRecovery.detail,
        ["hygiene"],
        "Context Packet 与当前 committed truth 重新一致。"
      ),
      alternatives: [
        recommendation(
          "open-current-phase",
          "查看当前 phase 边界",
          "在刷新 context 前，先确认当前 phase 与 acceptance 是否就是新的 source of truth。",
          ["planner"],
          "当前 phase、claim 与刷新目标已确认。"
        ),
        recommendation(
          "create-handoff",
          "创建恢复 handoff",
          "如果这个线程已经很长，先保留一个恢复点再同步 context 会更稳。",
          ["hygiene"],
          "已经存在一个可继续的恢复边界。"
        )
      ]
    };
  }

  if (shouldPrioritizeContextRecovery && contextRecovery.action === "run-hygiene") {
    return {
      primary: recommendation(
        "run-hygiene",
        "运行 context hygiene",
        contextRecovery.detail,
        ["hygiene"],
        "过期或矛盾的 context artifact 已被重新锚定。"
      ),
      alternatives: [
        recommendation(
          "open-current-phase",
          "检查 packet 来源",
          "先检查 current phase、acceptance 和 role packet 的冲突点。",
          ["planner"],
          "冲突来源已经明确。"
        ),
        recommendation(
          "create-handoff",
          "保存恢复点",
          "如果要切线程或暂停当前工作，先保存一个干净恢复点。",
          ["hygiene"],
          "恢复点已经可供下一轮继续。"
        )
      ]
    };
  }

  const pendingUserDecision = findPendingUserDecision(state);

  if (pendingUserDecision && isBootstrapDecisionStage(state, latestRun, latestPhaseRun)) {
    return {
      primary: recommendation(
        "advance-phase",
        "补齐启动边界",
        `项目还没进入自动推进，当前先要补齐启动边界：${pendingUserDecision.taskSummary} 补完后再回到 autopilot 主线。`,
        ["planner"],
        state.currentPhase.stopCondition ||
          "项目已经具备第一条可执行 slice 的边界，可以进入真实推进。"
      ),
      alternatives: [
        recommendation(
          "open-current-phase",
          "查看当前 phase 合同",
          "如果你想先重新确认这轮启动边界，先读一遍当前 phase 会更稳。",
          ["planner"],
          "当前 phase 的范围、停止条件和交付物重新对齐。"
        ),
        recommendation(
          "run-hygiene",
          "启动前先重新锚定",
          "如果这个项目是跨天恢复或刚初始化完成，先做一次 hygiene 会更稳。",
          ["hygiene"],
          "当前 truth、缺口与下一步启动动作已经重新拆开。"
        )
      ]
    };
  }

  const runningRole = state.activeWork.items.find(
    (item) => item.status === "running" && item.role !== "planner"
  );

  if (runningRole) {
    const roleLabel = formatRunningRole(runningRole.role);
    return {
      primary: recommendation(
        "open-current-phase",
        `${roleLabel}进行中`,
        `${roleLabel} 已经是当前活跃流程，因此最稳妥的下一步是检查 phase 边界，或等待这个角色产出结果。`,
        [runningRole.role],
        "当前角色完成，或 handoff 到下一阶段。"
      ),
      alternatives: [
        recommendation(
          "create-handoff",
          "创建 continuation handoff",
          "在线程变得更重之前，先把当前 truth 收起来。",
          ["hygiene"],
          "已经存在一个最新 continuation packet。"
        ),
        recommendation(
          "run-hygiene",
          "下一次 handoff 前先重新锚定",
          "如果当前流程暴露了过期假设或线程漂移，这样做会很有用。",
          ["hygiene"],
          "当前 truth 已重新清晰化。"
        )
      ]
    };
  }

  if (state.acceptanceState.verificationStatus === "failed") {
    return {
      primary: recommendation(
        "advance-phase",
        "修复 verification 缺口",
        "verification 已经失败了，因此现在最有价值的动作是做一个窄范围修复 slice。",
        ["planner", "executor", "reviewer"],
        "新的候选修改再次准备好进入 verification。"
      ),
      alternatives: [
        recommendation(
          "run-hygiene",
          "重新锚定当前线程",
          "如果这次失败暴露了过期假设或范围漂移，先做 hygiene 会更稳。",
          ["hygiene"],
          "已验证事实、假设和下一步窄动作已经重新分开。"
        ),
        recommendation(
          "create-handoff",
          "创建 continuation handoff",
          "如果当前线程太吵，或者你想留一个干净的恢复路径，这会很有用。",
          ["hygiene"],
          "已经存在一个最新 continuation packet。"
        )
      ]
    };
  }

  if (state.acceptanceState.reviewStatus === "review-blocked") {
    return {
      primary: recommendation(
        "advance-phase",
        "解决阻塞性评审发现",
        "review 已经暴露出真实阻塞，因此接下来的 phase 工作应该围绕它们收窄。",
        ["planner", "executor", "reviewer"],
        "阻塞性发现已被清除，工作重新准备好进入 verification。"
      ),
      alternatives: [
        recommendation(
          "open-current-phase",
          "检查当前 phase 边界",
          "如果 review 表明范围已经漂移，就重新读一遍当前 phase。",
          ["planner"],
          "团队已经对正确的范围内修复达成一致。"
        ),
        recommendation(
          "run-hygiene",
          "修复前先运行 hygiene",
          "当 review 暴露出相互冲突的假设时，这会很有帮助。",
          ["hygiene"],
          "当前 truth 已重新锚定。"
        )
      ]
    };
  }

  if (
    state.acceptanceState.verificationStatus === "ready" ||
    state.acceptanceState.finalState === "ready-for-verification"
  ) {
    return {
      primary: recommendation(
        "run-verification",
        "运行 verification",
        "工作已经准备好进入证明阶段，现在该把实现转化成证据了。",
        ["verifier"],
        "acceptance 状态将带着证据变成通过或失败。"
      ),
      alternatives: [
        recommendation(
          "open-current-phase",
          "查看当前 phase contract",
          "快速做一次范围检查，可以避免验证错 claim。",
          ["planner"],
          "phase contract 仍然与当前 claim 一致。"
        ),
        recommendation(
          "create-handoff",
          "创建可供审阅的 handoff",
          "如果 verification 更适合在干净一点的 continuation 中进行，这会很有用。",
          ["hygiene", "verifier"],
          "verification 可以从紧凑的 packet 继续。"
        )
      ]
    };
  }

  if (state.currentPhase.blockedBy.length > 0 || state.activeWork.blockerSummary) {
    return {
      primary: recommendation(
        "run-hygiene",
        "在阻塞 phase 上运行 hygiene",
        "项目已经有明确阻塞了，因此在继续执行消耗前先重新锚定。",
        ["hygiene", "planner"],
        "阻塞已被澄清，下一步也已经收窄。"
      ),
      alternatives: [
        recommendation(
          "open-current-phase",
          "打开当前 phase",
          "检查 phase 边界，确认这个阻塞到底在范围内还是范围外。",
          ["planner"],
          "phase 边界重新变得明确。"
        ),
        recommendation(
          "create-handoff",
          "为阻塞状态创建 handoff",
          "如果切到新的 continuation 会更稳妥，就先把当前阻塞状态保存下来。",
          ["hygiene"],
          "已经存在一个干净的阻塞态 continuation。"
        )
      ]
    };
  }

  return {
    primary: recommendation(
      "advance-phase",
      "推进当前 phase",
      "这是当前活跃项目里价值最高、且没有被阻塞的下一步。",
      ["planner", "executor", "reviewer"],
      "当前 slice 到达待评审或待验证状态。"
    ),
    alternatives: [
      recommendation(
        "open-current-phase",
        "检查当前 phase",
        "如果你想先确认当前 slice，再开始编码前打开 phase contract。",
        ["planner"],
        "当前边界已经清晰。"
      ),
      recommendation(
        "create-handoff",
        "准备 continuation packet",
        "在线程变得更重之前，先把干净的交接点准备好。",
        ["hygiene"],
        "已经存在一个最新 continuation packet。"
      )
    ]
  };
}
