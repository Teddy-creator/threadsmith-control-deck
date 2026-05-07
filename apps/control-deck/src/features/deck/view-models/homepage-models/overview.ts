import type { ProjectState } from "@threadsmith/domain";
import type { SupervisorState } from "@threadsmith/runtime";
import { formatProjectOverallState } from "../../../display/labels";
import type { HomepageOverviewGridProps, RoadmapMilestone } from "../../homepage-overview";
import type {
  LatestBridgeModel,
  LatestPhaseRunModel,
  LatestRunModel
} from "../runBridge";
import {
  buildHomepageAcceptanceAlert,
  buildHomepageAcceptanceItems
} from "../acceptance";
import { buildHomepageCollaborationModel } from "./collaboration";
import {
  buildHomepageDecisionAlert,
  buildHomepageDecisionSignals,
  buildHomepageDecisionState,
  buildHomepageDecisionSummary
} from "./decision";

interface BuildHomepageOverviewModelArgs {
  homepageTitle: string;
  projectState: ProjectState | null;
  projectOverallState: ProjectState["projectStatus"]["overallState"] | null;
  topProjectRisks: string[];
  supervisorState: SupervisorState | null;
  latestPhaseRunModel: LatestPhaseRunModel;
  latestRunModel: LatestRunModel;
  latestBridgeModel: LatestBridgeModel;
}

function findCurrentMilestoneIndex(milestones: ProjectState["projectRoadmap"]["milestones"]) {
  const activeIndex = milestones.findIndex(
    (item) => item.state === "current" || item.state === "blocked"
  );

  if (activeIndex >= 0) {
    return activeIndex;
  }

  const nextIndex = milestones.findIndex((item) => item.state === "next");

  if (nextIndex >= 0) {
    return nextIndex;
  }

  let lastDoneIndex = -1;

  milestones.forEach((item, index) => {
    if (item.state === "done") {
      lastDoneIndex = index;
    }
  });

  return lastDoneIndex >= 0 ? lastDoneIndex : 0;
}

function buildRoadmapWindow(
  milestones: ProjectState["projectRoadmap"]["milestones"],
  currentIndex: number
) {
  const visibleCount = milestones.length > 0 ? Math.min(5, milestones.length) : 0;
  const windowStart =
    visibleCount === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            currentIndex - Math.floor(visibleCount / 2),
            milestones.length - visibleCount
          )
        );

  return milestones.slice(windowStart, windowStart + visibleCount).map<RoadmapMilestone>(
    (milestone) => ({
      id: milestone.id,
      label: milestone.label,
      title: milestone.title,
      state:
        milestone.state === "blocked"
          ? "current"
          : milestone.state
    })
  );
}

function findLatestDoneMilestone(
  milestones: ProjectState["projectRoadmap"]["milestones"],
  currentIndex: number
) {
  for (let index = Math.min(currentIndex - 1, milestones.length - 1); index >= 0; index -= 1) {
    if (milestones[index]?.state === "done") {
      return milestones[index]?.title ?? "尚无";
    }
  }

  return "尚无";
}

function findNextMilestone(
  milestones: ProjectState["projectRoadmap"]["milestones"],
  currentIndex: number
) {
  return (
    milestones
      .slice(currentIndex + 1)
      .find((item) => item.state === "next" || item.state === "later")?.title
    ?? "待定义"
  );
}

export function buildHomepageOverviewModel(
  args: BuildHomepageOverviewModelArgs
): HomepageOverviewGridProps {
  const roadmap = args.projectState?.projectRoadmap ?? null;
  const milestones = roadmap?.milestones ?? [];
  const currentIndex = findCurrentMilestoneIndex(milestones);
  const collaboration = buildHomepageCollaborationModel(
    args.supervisorState,
    args.latestPhaseRunModel,
    args.latestRunModel,
    args.latestBridgeModel
  );

  return {
    roadmapVersion: roadmap?.versionLabel ?? `${args.homepageTitle} v1`,
    roadmapProgressLabel:
      milestones.length > 0 ? `里程碑 ${currentIndex + 1} / ${milestones.length}` : "里程碑未定义",
    projectStateLabel: formatProjectOverallState(args.projectOverallState ?? "planning"),
    visibleMilestones: buildRoadmapWindow(milestones, currentIndex),
    latestDone: findLatestDoneMilestone(milestones, currentIndex),
    currentMilestone: milestones[currentIndex]?.title ?? "待定义",
    nextMilestone: findNextMilestone(milestones, currentIndex),
    goal:
      roadmap?.finalGoal
      ?? args.projectState?.projectBrief.successFrame
      ?? "让项目进入可持续推进的真实开发节奏。",
    collaboration: {
      ...collaboration,
      phaseRun: {
        ...collaboration.phaseRun
      },
      latestRun: {
        ...collaboration.latestRun
      },
      latestBridge: {
        ...collaboration.latestBridge
      }
    },
    collaborationSignalsClassName: "grid grid-cols-3 gap-3",
    decisionSummary: args.supervisorState
      ? buildHomepageDecisionSummary(args.supervisorState, args.topProjectRisks)
      : "连接真实项目后，这里会根据 gate、verification 和风险信号给出推进判断。",
    decisionStateLabel: args.supervisorState
      ? buildHomepageDecisionState(args.supervisorState, args.topProjectRisks).label
      : "等待状态",
    decisionSignals: buildHomepageDecisionSignals(args.supervisorState),
    decisionAlert: args.supervisorState
      ? buildHomepageDecisionAlert(args.supervisorState, args.topProjectRisks)
      : "连接真实项目后，这里会显示当前最重要的一条推进提醒。",
    acceptanceItems: args.projectState
      ? buildHomepageAcceptanceItems(args.projectState.acceptanceState)
      : [
          { label: "评审", status: "pending" as const },
          { label: "验证", status: "pending" as const },
          { label: "收尾", status: "pending" as const },
          { label: "最终接受", status: "pending" as const }
        ],
    acceptanceAlert: args.supervisorState
      ? buildHomepageAcceptanceAlert(args.supervisorState)
      : "连接真实项目后，这里会显示当前最关键的一条验收提醒。"
  };
}
