import type { SupervisorState } from "@threadsmith/runtime";
import { compactText } from "../../shared";
import type {
  LatestBridgeModel,
  LatestPhaseRunModel,
  LatestRunModel
} from "../../runBridge";

export type HomepageCollaborationItem = {
  roleLabel: string;
  threadLabel: string;
  assignmentLabel: string;
  statusLabel: string;
  taskSummary: string;
};

export type HomepageCollaborationSignal = {
  label: string;
  value: string;
  className: string;
};

export type HomepageCollaborationModel = {
  state: {
    label: string;
    className: string;
  };
  phaseRun: {
    tone: LatestPhaseRunModel["tone"];
    statusLabel: string;
    providerLabel: string | null;
    roleLabel: string | null;
    threadLabel: string | null;
    repairLabel: string | null;
    summary: string;
    timingLine: string;
    truthImpact: string;
  };
  signals: HomepageCollaborationSignal[];
  items: HomepageCollaborationItem[];
  latestRun: LatestRunModel;
  latestBridge: LatestBridgeModel;
  hiddenCount: number;
  alert: string;
};

function collaborationSignalClass(
  kind: "running" | "waiting" | "blocked",
  active: boolean
) {
  if (!active) {
    return "border-zinc-800/70 bg-zinc-950/30 text-zinc-300";
  }

  return "border-purple-500/20 bg-purple-500/10 text-purple-300";
}

function buildHomepageCollaborationItem(
  item: SupervisorState["projectSupervision"]["lines"][number]
): HomepageCollaborationItem {
  return {
    roleLabel: item.roleLabel,
    threadLabel: item.threadLabel,
    assignmentLabel:
      item.presence === "live" ? (item.providerLabel ?? item.assignmentLabel) : item.assignmentLabel,
    statusLabel: item.statusLabel,
    taskSummary: item.taskSummary
  };
}

export function buildHomepageCollaborationModel(
  supervisorState: SupervisorState | null,
  latestPhaseRun: LatestPhaseRunModel,
  latestRun: LatestRunModel,
  latestBridge: LatestBridgeModel
): HomepageCollaborationModel {
  if (!supervisorState) {
    return {
      state: {
        label: "等待状态",
        className: "border border-zinc-800/70 bg-zinc-950/30 text-zinc-500"
      },
      phaseRun: {
        tone: "zinc",
        statusLabel: "暂无记录",
        providerLabel: null,
        roleLabel: null,
        threadLabel: null,
        repairLabel: null,
        summary: "连接真实项目后，这里会显示 automatic chain 的当前状态。",
        timingLine: "等待第一次 phase run",
        truthImpact: "尚未写入 automatic chain truth"
      },
      signals: [
        {
          label: "运行中",
          value: "0 条",
          className: collaborationSignalClass("running", false)
        },
        {
          label: "等待中",
          value: "0 条",
          className: collaborationSignalClass("waiting", false)
        },
        {
          label: "阻塞",
          value: "无",
          className: collaborationSignalClass("blocked", false)
        }
      ],
      items: [
        {
          roleLabel: "执行",
          threadLabel: "Main",
          assignmentLabel: "逻辑角色",
          statusLabel: "空闲",
          taskSummary: "连接真实项目后，这里会显示当前协作现场。"
        }
      ],
      latestRun,
      latestBridge,
      hiddenCount: 0,
      alert: "连接真实项目后，这里会显示当前最需要注意的一条现场提醒。"
    };
  }

  const projectSupervision = supervisorState.projectSupervision;
  const blockedCount = projectSupervision.blockedCount;
  const waitingCount = projectSupervision.waitingCount;
  const runningCount = projectSupervision.runningCount;

  const state =
    blockedCount > 0
      ? {
          label: projectSupervision.statusLabel,
          className: "border border-purple-500/20 bg-purple-500/10 text-purple-300"
        }
      : runningCount > 0 || waitingCount > 0
        ? {
            label: projectSupervision.statusLabel,
            className: "border border-purple-500/20 bg-purple-500/10 text-purple-300"
          }
        : {
            label: projectSupervision.statusLabel,
            className: "border border-zinc-800/70 bg-zinc-950/30 text-zinc-500"
          };

  const signals: HomepageCollaborationSignal[] = [
    {
      label: "运行中",
      value: `${runningCount} 条`,
      className: collaborationSignalClass("running", runningCount > 0)
    },
    {
      label: "等待中",
      value: `${waitingCount} 条`,
      className: collaborationSignalClass("waiting", waitingCount > 0)
    },
    {
      label: "阻塞",
      value: blockedCount > 0 ? `${blockedCount} 条` : "无",
      className: collaborationSignalClass("blocked", blockedCount > 0)
    }
  ];

  const visibleItemCount = latestRun.exists ? 2 : 3;
  const items =
    projectSupervision.lines.length > 0
      ? projectSupervision.lines
          .slice(0, visibleItemCount)
          .map((item) => buildHomepageCollaborationItem(item))
      : [
          {
            roleLabel: "执行",
            threadLabel: "Main",
            assignmentLabel: "逻辑角色",
            statusLabel: "空闲",
            taskSummary: "当前没有正在推进的工作"
          }
        ];

  return {
    state,
    phaseRun: {
      tone: latestPhaseRun.tone,
      statusLabel: latestPhaseRun.statusLabel,
      providerLabel: null,
      roleLabel: latestPhaseRun.roleLabel,
      threadLabel: latestPhaseRun.sliceLabel,
      repairLabel: latestPhaseRun.repairLabel,
      summary: latestPhaseRun.operatorDetail || latestPhaseRun.summary,
      timingLine: latestPhaseRun.timingLine,
      truthImpact: latestPhaseRun.timingLine
    },
    signals,
    items,
    latestRun,
    latestBridge,
    hiddenCount: Math.max(projectSupervision.lines.length - visibleItemCount, 0),
    alert: projectSupervision.alert
  };
}
