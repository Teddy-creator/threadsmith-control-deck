import type { SupervisorState } from "@threadsmith/runtime";
import { formatRole } from "../../../display/labels";
import { formatEventTime } from "../../../events/formatters";
import { formatProviderLabel, type Tone } from "../shared";
import type { LatestBridgeModel } from "./types";

function pickLatestBridgeTone(
  status: SupervisorState["commandBridge"]["latestRoute"]["status"]
): Tone {
  switch (status) {
    case "succeeded":
      return "green";
    case "running":
      return "amber";
    case "failed":
      return "red";
    case "dispatched":
      return "blue";
    default:
      return "zinc";
  }
}

export function buildLatestBridgeModel(
  commandBridge: SupervisorState["commandBridge"] | null
): LatestBridgeModel {
  const latestRoute = commandBridge?.latestRoute ?? null;
  const recommendedRoute = commandBridge?.recommendedRoute ?? null;
  const hasLatestRoute = latestRoute?.status !== "missing";
  const promptAvailable = Boolean(recommendedRoute?.suggestedPrompt);

  if (!commandBridge || (!hasLatestRoute && !recommendedRoute)) {
    return {
      visible: false,
      headline: "当前没有桥接建议",
      summary: "需要桥接时，这里会显示最新路由与交接状态。",
      statusLabel: "暂无记录",
      tone: "zinc",
      providerLabel: null,
      roleLabel: null,
      surfaceLabel: null,
      recordedAtLabel: "未记录",
      artifactPath: null,
      handoffLabel: "暂无",
      handoffTone: "zinc",
      handoffDetail: "当前还没有 provider-aware handoff artifact。"
    };
  }

  const handoff = promptAvailable
    ? {
        label: "交接已就绪",
        tone: "amber" as const,
        detail: `当前为 ${formatProviderLabel(recommendedRoute?.provider)} 路由，可在桥接预览中复制交接提示词。`
      }
    : recommendedRoute?.availability === "available"
      ? {
          label: "自动执行",
          tone: "blue" as const,
          detail: `当前推荐路由仍是 ${formatProviderLabel(recommendedRoute.provider)} 自动执行，不需要额外交接提示词。`
        }
      : {
          label: "暂无",
          tone: "zinc" as const,
          detail: "当前还没有可用的 provider-aware 交接提示词。"
        };

  return {
    visible: true,
    headline: hasLatestRoute
      ? latestRoute.headline
      : promptAvailable
        ? "当前桥接已准备外部交接"
        : "当前桥接尚未签发",
    summary: hasLatestRoute
      ? latestRoute.detail
      : recommendedRoute?.detail ?? "当前没有桥接建议。",
    statusLabel: hasLatestRoute ? latestRoute.statusLabel : "未签发",
    tone: hasLatestRoute
      ? pickLatestBridgeTone(latestRoute.status)
      : promptAvailable
        ? "amber"
        : "zinc",
    providerLabel: formatProviderLabel(
      hasLatestRoute ? latestRoute.provider : recommendedRoute?.provider
    ),
    roleLabel: hasLatestRoute
      ? (latestRoute.targetRole ? formatRole(latestRoute.targetRole) : null)
      : recommendedRoute?.targetRole
        ? formatRole(recommendedRoute.targetRole)
        : null,
    surfaceLabel: hasLatestRoute
      ? latestRoute.bridgeSurfaceLabel
      : recommendedRoute?.bridgeSurfaceLabel ?? null,
    recordedAtLabel:
      hasLatestRoute && latestRoute.recordedAt
        ? formatEventTime(latestRoute.recordedAt)
        : "未记录",
    artifactPath: hasLatestRoute ? latestRoute.artifactPath : null,
    handoffLabel: handoff.label,
    handoffTone: handoff.tone,
    handoffDetail: handoff.detail
  };
}
