import type { SupervisorState } from "@threadsmith/runtime";
import { formatGateReason } from "../../../../display/labels";
import { compactText } from "../../shared";
import {
  isAcceptedHandoffNextSlice,
  hasPendingUserDecision,
  isBootstrapBoundary,
  isPausedRecovery,
  isWaitingForResult
} from "./core";

export function buildHomepageDecisionSummary(
  supervisorState: SupervisorState,
  topProjectRisks: string[]
) {
  if (isPausedRecovery(supervisorState)) {
    return "自动链路已经暂停，当前先补齐恢复条件；满足后回到指挥入口 continue 更稳。";
  }

  if (isWaitingForResult(supervisorState)) {
    return "当前关键结果还在回流，先等待 committed truth 更新，再决定下一步更稳。";
  }

  if (isBootstrapBoundary(supervisorState)) {
    return "项目还没进入自动推进，当前先把启动边界补齐，再进入第一条真实执行线。";
  }

  if (supervisorState.health.currentBlocker) {
    return "当前主线存在明确阻塞，继续推进前要先清掉 blocker。";
  }

  if (supervisorState.gateSignal.reasons.includes("verification-failed")) {
    return "当前 verification 已失败，继续推进前先修复失败原因。";
  }

  if (supervisorState.gateSignal.reasons.includes("latest-run-failed")) {
    return "最新自动执行已经失败，继续推进前先处理失败原因更稳。";
  }

  if (supervisorState.gateSignal.reasons.includes("blocking-review-findings")) {
    return "当前评审存在阻塞结论，先处理 review 问题再继续更稳。";
  }

  if (hasPendingUserDecision(supervisorState)) {
    return "当前没有执行阻塞，但下一步依赖你的决策，确认后才能继续推进。";
  }

  if (isAcceptedHandoffNextSlice(supervisorState)) {
    return "当前 slice 已 accepted，下一步不是重复查看 handoff，而是基于这份边界起草下一刀并准备 phase reset。";
  }

  if (supervisorState.gateSignal.reasons.includes("closeout-pending")) {
    return "当前主线没有硬阻塞，但 closeout 还没收口，继续推进前先处理更稳。";
  }

  if (supervisorState.gateSignal.reasons.includes("stale-continuation-packet")) {
    return "当前真相已经继续向前推进，先整理继续点再继续会更稳。";
  }

  if (supervisorState.gateSignal.reasons.includes("handoff-recommended")) {
    return "当前 slice 已经接受，下一步更适合先创建 handoff。";
  }

  if (supervisorState.health.verificationDebtCount > 0) {
    return "当前主线没有硬阻塞，但还有关键检查未补齐，继续推进前先处理更稳。";
  }

  if (topProjectRisks.length > 0) {
    return "当前主线可以继续推进，但仍有项目级风险需要持续盯住。";
  }

  if (supervisorState.latestVerificationEvidence.status === "running") {
    return "当前没有执行阻塞，但验证结果还在回流，继续推进前先看结果更稳。";
  }

  if (
    supervisorState.latestVerificationEvidence.status === "ready" ||
    supervisorState.latestVerificationEvidence.status === "not-started"
  ) {
    return "当前主线可以继续推进，但最新验证证据还没补齐。";
  }

  return "当前主线可以继续推进，暂时没有新的阻塞信号。";
}

export function buildHomepageDecisionAlert(
  supervisorState: SupervisorState,
  topProjectRisks: string[]
) {
  if (isPausedRecovery(supervisorState)) {
    return `先恢复：${compactText(supervisorState.latestPhaseRunSummary.operatorDetail, 72)}`;
  }

  if (isWaitingForResult(supervisorState)) {
    return `等待回流：${compactText(supervisorState.nextBestStep.primary.reason, 72)}`;
  }

  if (isBootstrapBoundary(supervisorState)) {
    return `先补边界：${compactText(supervisorState.nextBestStep.primary.reason, 72)}`;
  }

  if (supervisorState.health.currentBlocker) {
    return `先处理：${compactText(supervisorState.health.currentBlocker, 78)}`;
  }

  if (hasPendingUserDecision(supervisorState)) {
    const pendingDecision = supervisorState.projectState.activeWork.items.find(
      (item) => item.requiresUserDecision
    );
    return `待决策：${compactText(pendingDecision?.taskSummary ?? "先确认下一步方向。", 72)}`;
  }

  if (isAcceptedHandoffNextSlice(supervisorState)) {
    return "下一刀：基于 accepted handoff 收束窄 slice，并准备 phase reset。";
  }

  if (supervisorState.gateSignal.reasons.length > 0) {
    return `先处理：${compactText(formatGateReason(supervisorState.gateSignal.reasons[0]), 72)}`;
  }

  if (supervisorState.health.verificationDebtCount > 0) {
    return `先处理：还有 ${supervisorState.health.verificationDebtCount} 项验收检查未通过。`;
  }

  if (topProjectRisks.length > 0) {
    return `注意：${compactText(topProjectRisks[0], 76)}`;
  }

  if (
    supervisorState.latestVerificationEvidence.status === "ready" ||
    supervisorState.latestVerificationEvidence.status === "not-started" ||
    supervisorState.latestVerificationEvidence.status === "failed"
  ) {
    return `先处理：${compactText(supervisorState.latestVerificationEvidence.detail, 72)}`;
  }

  if (supervisorState.latestContinuationState.freshnessDetail) {
    return `注意：${compactText(supervisorState.latestContinuationState.freshnessDetail, 76)}`;
  }

  return "注意：可以直接沿当前总命令继续推进。";
}
