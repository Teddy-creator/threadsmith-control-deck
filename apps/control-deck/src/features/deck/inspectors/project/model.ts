import type { ProviderRouting } from "@threadsmith/domain";
import { isAllCodexRouting, type SupervisorState } from "@threadsmith/runtime";
import {
  buildRoleRoutingCardModel,
  buildRoutingOverviewItems,
  buildSkillRoutingVisibilityModel,
  type LatestBridgeModel
} from "../../deckViewModels";
import { formatProjectOverallState } from "../../../display/labels";
import { compactText, pickProjectTone, routingSupportSummary } from "../shared";
import type {
  ProjectInspectorProps,
  ProviderRoutingRole,
  SelectOption
} from "./types";

interface BuildProjectInspectorViewModelArgs {
  projectState: ProjectInspectorProps["projectState"];
  projectSummary: ProjectInspectorProps["projectSummary"];
  headline: ProjectInspectorProps["headline"];
  projectOverallState: string | null;
  homepageRoadmapVersion: ProjectInspectorProps["homepageRoadmapVersion"];
  homepageRoadmapProgressLabel: ProjectInspectorProps["homepageRoadmapProgressLabel"];
  homepageRoadmapGoal: ProjectInspectorProps["homepageRoadmapGoal"];
  homepageRoadmapLatestDone: ProjectInspectorProps["homepageRoadmapLatestDone"];
  homepageRoadmapCurrent: ProjectInspectorProps["homepageRoadmapCurrent"];
  homepageRoadmapNext: ProjectInspectorProps["homepageRoadmapNext"];
  homepageRoadmapMilestones: ProjectInspectorProps["homepageRoadmapMilestones"];
  providerRoutingDraft: ProviderRouting | null;
  committedProviderRouting: ProviderRouting | null;
  currentSourceIsAppHome: boolean;
  supervisorState: SupervisorState;
  latestBridgeModel: LatestBridgeModel;
  providerRoutingSaveState: ProjectInspectorProps["providerRoutingSaveState"];
  providerRoutingDirty: boolean;
  providerRoutingError: string | null;
}

export type ProjectInspectorViewModel = Omit<
  ProjectInspectorProps,
  | "projectState"
  | "onUpdateConductorSurface"
  | "onUpdateProviderRoutingRole"
  | "onSaveProviderRouting"
  | "onResetProviderRouting"
>;

const PROVIDER_OPTIONS: Array<SelectOption<ProviderRouting["planner"]>> = [
  { value: "codex", label: "Codex" },
  { value: "claude", label: "Claude" }
];

const CONDUCTOR_SURFACE_OPTIONS: Array<SelectOption<ProviderRouting["conductorSurface"]>> = [
  { value: "codex-desktop", label: "Codex Desktop" },
  { value: "codex-cli", label: "Codex CLI" },
  { value: "claude-cli", label: "Claude CLI" }
];

const ROUTING_ROLE_ORDER: ProviderRoutingRole[] = [
  "planner",
  "executor",
  "reviewer",
  "verifier",
  "closeout"
];

const ROUTING_SELECT_CLASS_NAME =
  "w-full rounded-lg border border-zinc-700/80 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-purple-400/60 focus:ring-1 focus:ring-purple-400/30 disabled:cursor-not-allowed disabled:opacity-60";

function buildProviderRoutingStatusBadge(
  providerRoutingSaveState: ProjectInspectorProps["providerRoutingSaveState"],
  providerRoutingDirty: boolean
): ProjectInspectorProps["providerRoutingStatusBadge"] {
  if (providerRoutingSaveState === "saving") {
    return {
      label: "保存中",
      className: "bg-blue-500/10 text-blue-300"
    };
  }

  if (providerRoutingSaveState === "failed") {
    return {
      label: "保存失败",
      className: "bg-red-500/10 text-red-300"
    };
  }

  if (providerRoutingDirty) {
    return {
      label: "有未保存更改",
      className: "bg-amber-500/10 text-amber-300"
    };
  }

  return {
    label: "已同步",
    className: "bg-emerald-500/10 text-emerald-300"
  };
}

export function buildProjectInspectorViewModel(
  args: BuildProjectInspectorViewModelArgs
): ProjectInspectorViewModel {
  const editableProviderRouting =
    args.providerRoutingDraft
    ?? args.committedProviderRouting
    ?? args.supervisorState.providerRouting;
  const allCodexRouting = isAllCodexRouting(editableProviderRouting);
  const routingModeLabel = allCodexRouting ? "全 Codex" : "混合 provider";
  const providerRoutingStatusBadge = buildProviderRoutingStatusBadge(
    args.providerRoutingSaveState,
    args.providerRoutingDirty
  );
  const providerRoutingStatusDetail = args.providerRoutingError
    ? compactText(args.providerRoutingError, 104)
    : args.providerRoutingDirty
      ? "当前只是本地草稿；保存后，首页、阶段与推进参考会切到新的 committed 路由。"
      : args.currentSourceIsAppHome
        ? "这里维护的是 Threadsmith 前门的默认路由语义；进入真实项目后，项目可以继续覆盖自己的 committed 路由。"
        : "这里维护项目默认路由；指挥官聊天面之外的展示都以 committed truth 为准。";

  return {
    projectSummary: args.projectSummary,
    headline: args.headline,
    projectOverallStateTone: pickProjectTone(args.projectOverallState),
    projectOverallStateLabel: formatProjectOverallState(args.projectOverallState ?? "planning"),
    priorityPreview: args.projectState.projectBrief.priorityOrder.slice(0, 2),
    definitionSections: [
      {
        label: "开放问题",
        items: args.projectState.projectBrief.openStrategicQuestions,
        empty: "当前没有额外开放问题。"
      },
      {
        label: "非目标",
        items: args.projectState.projectBrief.nonGoals,
        empty: "当前没有额外非目标。"
      },
      {
        label: "关键约束",
        items: args.projectState.projectBrief.keyConstraints,
        empty: "当前没有额外关键约束。"
      }
    ],
    homepageRoadmapVersion: args.homepageRoadmapVersion,
    homepageRoadmapProgressLabel: args.homepageRoadmapProgressLabel,
    homepageRoadmapGoal: args.homepageRoadmapGoal,
    homepageRoadmapLatestDone: args.homepageRoadmapLatestDone,
    homepageRoadmapCurrent: args.homepageRoadmapCurrent,
    homepageRoadmapNext: args.homepageRoadmapNext,
    homepageRoadmapMilestones: args.homepageRoadmapMilestones,
    editableProviderRouting,
    routingModeLabel,
    providerRoutingStatusBadge,
    routingOverviewItems: buildRoutingOverviewItems({
      routing: editableProviderRouting,
      latestBridgeModel: args.latestBridgeModel,
      latestRun: args.supervisorState.latestRun
    }),
    structureItems: ROUTING_ROLE_ORDER.map((role) =>
      buildRoleRoutingCardModel({
        role,
        routing: editableProviderRouting,
        latestBridgeModel: args.latestBridgeModel,
        latestRun: args.supervisorState.latestRun
      })
    ),
    currentSourceIsAppHome: args.currentSourceIsAppHome,
    providerRoutingStatusDetail,
    routingSupportSummaryText: routingSupportSummary(allCodexRouting),
    skillRoutingVisibility: buildSkillRoutingVisibilityModel(
      args.supervisorState.skillRouting
    ),
    providerRoutingSaveState: args.providerRoutingSaveState,
    routingSelectClassName: ROUTING_SELECT_CLASS_NAME,
    conductorSurfaceOptions: CONDUCTOR_SURFACE_OPTIONS,
    providerOptions: PROVIDER_OPTIONS,
    saveRoutingDisabled:
      !editableProviderRouting ||
      args.providerRoutingSaveState === "saving" ||
      !args.providerRoutingDirty,
    resetRoutingDisabled:
      !args.committedProviderRouting ||
      args.providerRoutingSaveState === "saving" ||
      (!args.providerRoutingDirty && !args.providerRoutingError)
  };
}
