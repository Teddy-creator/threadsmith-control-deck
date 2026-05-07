import { compactText } from "../../shared";
import { formatRole, formatRoleStatus } from "../../../../display/labels";

export function formatExecutionInline(item: {
  role: string;
  status: string;
  taskSummary: string;
  requiresUserDecision: boolean;
}) {
  let summary = `${compactText(item.taskSummary, 72)} · ${formatRole(item.role)} · ${formatRoleStatus(item.status)}`;

  if (item.requiresUserDecision) {
    summary += " · 需要用户决策";
  }

  return summary;
}

export function buildHomepageConductorPrompt(args: {
  title: string;
  summary: string;
  stopCondition: string;
  failureLoop: { label: string; detail: string; nextStep: string } | null;
  requiresUserDecision: boolean;
  guidanceMode: "default" | "pause" | "wait" | "accepted-handoff";
}) {
  if (args.failureLoop) {
    return [
      `请以 Conductor 身份处理当前异常：${args.failureLoop.label}。`,
      `背景：${args.failureLoop.detail}`,
      `当前目标：${args.title}。`,
      "请先解释失败原因，再收束一轮最小修复 slice，并在结果回写后决定是否重新进入 review 或 verification。"
    ].join(" ");
  }

  if (args.requiresUserDecision) {
    return [
      `请以 Conductor 身份处理当前决策点：${args.title}。`,
      `背景：${args.summary}`,
      `完成标志：${args.stopCondition}`,
      "请给出推荐决策、原因，以及这个决策对当前 phase 的影响。"
    ].join(" ");
  }

  if (args.guidanceMode === "pause") {
    return [
      `请以 Conductor 身份处理当前恢复点：${args.title}。`,
      `背景：${args.summary}`,
      `完成标志：${args.stopCondition}`,
      "请先判断恢复条件是否已经满足；如果还没满足，就收束一轮最小恢复动作，满足后再指导回到指挥入口 continue。"
    ].join(" ");
  }

  if (args.guidanceMode === "wait") {
    return [
      `请以 Conductor 身份监控当前等待态：${args.title}。`,
      `背景：${args.summary}`,
      `完成标志：${args.stopCondition}`,
      "请先确认当前无需追加执行，等待 committed truth / run result 回流；如果等待超时或出现新 blocker，再收束恢复动作。"
    ].join(" ");
  }

  if (args.guidanceMode === "accepted-handoff") {
    return [
      `请以 Conductor 身份承接 accepted handoff，并推进当前总命令：${args.title}。`,
      `背景：${args.summary}`,
      `完成标志：${args.stopCondition}`,
      "请先用已接受 handoff 复盘上一刀边界，再收束下一条最小可执行 slice，并整理 formal phase reset draft。"
    ].join(" ");
  }

  return [
    `请以 Conductor 身份推进当前总命令：${args.title}。`,
    `背景：${args.summary}`,
    `完成标志：${args.stopCondition}`,
    "请先收束下一轮最小可执行 slice，再安排 Builder / Critic 按顺序继续推进。"
  ].join(" ");
}
