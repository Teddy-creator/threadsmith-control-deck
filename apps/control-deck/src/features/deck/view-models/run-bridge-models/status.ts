import type { AgentRunRecord } from "@threadsmith/domain";
import type { Tone } from "../shared";

export function formatRunStatusLabel(
  status: AgentRunRecord["status"] | null | undefined
) {
  switch (status) {
    case "queued":
      return "已排队";
    case "running":
      return "进行中";
    case "succeeded":
      return "已完成";
    case "failed":
      return "失败";
    case "cancelled":
      return "已取消";
    default:
      return "未执行";
  }
}

export function formatTruthWritebackStatus(run: AgentRunRecord | null) {
  if (!run) {
    return "尚未写回";
  }

  switch (run.status) {
    case "queued":
    case "running":
      return "等待写回";
    case "failed":
      return "已回流阻塞";
    case "cancelled":
      return "未写回";
    case "succeeded":
      return "已写回";
    default:
      return "尚未写回";
  }
}

export function pickTruthWritebackTone(run: AgentRunRecord | null): Tone {
  if (!run) {
    return "zinc";
  }

  switch (run.status) {
    case "queued":
    case "running":
      return "amber";
    case "failed":
      return "red";
    case "succeeded":
      return "green";
    case "cancelled":
    default:
      return "zinc";
  }
}
