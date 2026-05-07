import { Activity, CheckCircle2, FolderKanban, Layers3, Target, Zap } from "lucide-react";
import type { SupervisorState } from "@threadsmith/runtime";
import {
  formatCollaborationThreadLabel,
  formatProviderLabel,
  type LatestRunModel
} from "../deckViewModels";
import { compactText } from "../inspectors/shared";
import { formatRole } from "../../display/labels";

export type InspectorView =
  | "project"
  | "action"
  | "objects"
  | "events"
  | "projects"
  | "acceptance";

export function buildDeckInspectorMeta(args: {
  activeInspector: InspectorView;
  projectPhaseName: string | null;
  currentProjectSourceLabel: string;
  currentProjectIdentityName: string;
  supervisorState: SupervisorState | null;
  latestRunModel: LatestRunModel;
}) {
  const content = (() => {
    switch (args.activeInspector) {
      case "objects":
        return {
          title: "阶段工作台",
          description: "查看当前 phase contract、slice 边界、阶段出口与角色归属。",
          objectLabel: args.projectPhaseName ?? "当前阶段",
          roleLabel: formatRole("executor"),
          threadLabel: formatCollaborationThreadLabel("executor"),
          providerLabel:
            args.supervisorState?.phaseParticipants.find(
              (item) => item.role === "executor"
            )?.providerLabel ?? "Codex"
        };
      case "events":
        return {
          title: "证据工作台",
          description: "查看最近一次运行、结果写回、验证收尾与交接时间线。",
          objectLabel: args.latestRunModel.exists
            ? args.latestRunModel.headline
            : args.supervisorState?.latestVerificationEvidence.headline
              ?? args.supervisorState?.latestContinuationState.headline
              ?? "证据与事件",
          roleLabel: args.latestRunModel.roleLabel ?? formatRole("verifier"),
          threadLabel:
            args.latestRunModel.threadLabel ?? formatCollaborationThreadLabel("verifier"),
          providerLabel: args.latestRunModel.providerLabel ?? "Codex"
        };
      case "acceptance":
        return {
          title: "验收工作台",
          description: "查看当前 claim 还差什么才 legally accepted、谁已签字，以及备用流转入口。",
          objectLabel: compactText(
            args.supervisorState?.acceptanceSummary.currentClaim ?? "验收状态",
            56
          ),
          roleLabel: formatRole("reviewer"),
          threadLabel: formatCollaborationThreadLabel("reviewer"),
          providerLabel:
            formatProviderLabel(args.supervisorState?.providerRouting.reviewer) ?? "Codex"
        };
      case "projects":
        return {
          title: "来源工作台",
          description: "切换来源、连接项目并管理最近项目。",
          objectLabel: args.currentProjectSourceLabel,
          roleLabel: null,
          threadLabel: null,
          providerLabel: null
        };
      case "action":
        return {
          title: "推进参考",
          description: "查看当前建议、参与角色、后续路线，以及备用的手动桥接入口。",
          objectLabel: args.supervisorState?.nextBestStep.primary.label ?? "当前动作",
          roleLabel: formatRole("planner"),
          threadLabel: formatCollaborationThreadLabel("planner"),
          providerLabel:
            formatProviderLabel(args.supervisorState?.providerRouting.planner) ?? "Codex"
        };
      default:
        return {
          title: "项目工作台",
          description: "查看项目定义、版本路线、指挥入口与默认路由。",
          objectLabel: args.currentProjectIdentityName,
          roleLabel: formatRole("planner"),
          threadLabel: formatCollaborationThreadLabel("planner"),
          providerLabel:
            formatProviderLabel(args.supervisorState?.providerRouting.planner) ?? "Codex"
        };
    }
  })();

  const icon =
    args.activeInspector === "objects" ? (
      <Layers3 className="h-4.5 w-4.5 text-amber-400" />
    ) : args.activeInspector === "events" ? (
      <Activity className="h-4.5 w-4.5 text-cyan-400" />
    ) : args.activeInspector === "acceptance" ? (
      <CheckCircle2 className="h-4.5 w-4.5 text-cyan-400" />
    ) : args.activeInspector === "projects" ? (
      <FolderKanban className="h-4.5 w-4.5 text-amber-400" />
    ) : args.activeInspector === "action" ? (
      <Zap className="h-4.5 w-4.5 text-amber-400" />
    ) : (
      <Target className="h-4.5 w-4.5 text-amber-400" />
    );

  const surfaceClassName =
    args.activeInspector === "events" || args.activeInspector === "acceptance"
      ? "border-cyan-500/15 bg-cyan-500/8"
      : "border-amber-500/15 bg-amber-500/8";

  return {
    ...content,
    icon,
    surfaceClassName
  };
}
