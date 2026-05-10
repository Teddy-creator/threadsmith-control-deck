import type { SkillCapability, SkillRoutingConfig } from "@threadsmith/domain";
import { formatRole } from "../../../display/labels";
import { compactText } from "../shared";
import type { SkillRoutingVisibilityModel } from "./types";

const ROUTE_PREVIEW_LIMIT = 6;
const NOTE_PREVIEW_LIMIT = 2;

function formatCapability(capability: SkillCapability) {
  switch (capability) {
    case "brief":
      return "任务简报";
    case "plan":
      return "计划";
    case "debug":
      return "调试";
    case "review":
      return "评审";
    case "verify":
      return "验证";
    case "closeout":
      return "收尾";
    case "handoff":
      return "交接";
    case "recover":
      return "恢复";
    case "research":
      return "研究";
    case "implement":
      return "实现";
    case "frontend":
      return "前端";
    case "docs":
      return "文档";
    default:
      return capability;
  }
}

function formatFallbackLabel(config: SkillRoutingConfig) {
  switch (config.fallbackAvailability) {
    case "available":
      return "内置 fallback 可用";
    case "disabled":
      return "fallback 已禁用";
    case "stale":
      return "fallback 需刷新";
    case "unsafe":
      return "fallback 不安全";
    case "missing":
    default:
      return "回退到内置协议";
  }
}

function pickFallbackTone(config: SkillRoutingConfig): SkillRoutingVisibilityModel["fallbackTone"] {
  switch (config.fallbackAvailability) {
    case "disabled":
    case "unsafe":
      return "amber";
    case "stale":
      return "amber";
    case "available":
      return "green";
    case "missing":
    default:
      return "zinc";
  }
}

export function buildSkillRoutingVisibilityModel(
  config: SkillRoutingConfig
): SkillRoutingVisibilityModel {
  const selectedRoutes = config.routePreferences
    .slice(0, ROUTE_PREVIEW_LIMIT)
    .map((preference) => {
      const roleLabel = preference.role ? formatRole(preference.role) : "全局";
      const capabilityLabel = formatCapability(preference.capability);

      return {
        label: `${roleLabel} · ${capabilityLabel}`,
        value: preference.adapterId,
        detail: compactText(preference.reason, 88) || "使用项目级 route preference。"
      };
    });

  return {
    discoveredLabel: `${config.generatedFrom.discoverySkillCount} 个 skill`,
    routePreferenceLabel: `${config.routePreferences.length} 条偏好`,
    disabledLabel: `${config.disabledAdapters.length} 个禁用`,
    fallbackLabel: formatFallbackLabel(config),
    fallbackTone: pickFallbackTone(config),
    boundary: "只做发现与路由提示，不自动执行外部 skill。",
    selectedRoutes,
    notes: config.notes.slice(0, NOTE_PREVIEW_LIMIT).map((note) => compactText(note, 96))
  };
}
