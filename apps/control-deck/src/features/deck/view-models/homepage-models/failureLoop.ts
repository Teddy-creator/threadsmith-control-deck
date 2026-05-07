import type { SupervisorState } from "@threadsmith/runtime";
import { compactText } from "../shared";

export type HomepageFailureLoop = {
  label: string;
  detail: string;
  nextStep: string;
};

export function buildHomepageFailureLoop(
  supervisorState: SupervisorState
): HomepageFailureLoop | null {
  const { acceptanceState, activeWork } = supervisorState.projectState;

  if (supervisorState.latestRun?.status === "failed") {
    return {
      label: "自动执行失败",
      detail: compactText(
        supervisorState.latestRun.statusDetail
          ?? "最新一轮自动执行没有完成，需要先处理失败原因。",
        112
      ),
      nextStep: "先发起一轮修复 slice，再让结果重新准备进入 review。"
    };
  }

  if (acceptanceState.reviewStatus === "review-blocked") {
    return {
      label: "评审阻塞",
      detail: compactText(
        acceptanceState.knownGaps[0]
          ?? activeWork.blockerSummary
          ?? "review 暴露出阻塞性发现，需要先处理。",
        112
      ),
      nextStep: "先清掉阻塞性评审发现，再重新放行到 verification。"
    };
  }

  if (acceptanceState.verificationStatus === "failed") {
    return {
      label: "验证失败",
      detail: compactText(
        supervisorState.latestVerificationEvidence.detail
          || "verification 没有支持当前 claim，需要先补修失败原因。",
        112
      ),
      nextStep: "先修复失败原因，再把候选修改重新送回 verification。"
    };
  }

  return null;
}
