import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  ContinuationBehavior,
  ProjectState,
  WorkflowEvent
} from "@threadsmith/domain";
import { THREADSMITH_DIR, getThreadsmithDir } from "./paths.ts";

export type ContinuationPacketKind = "handoff" | "hygiene";

export interface ContinuationPacketSummary {
  kind: ContinuationPacketKind;
  title: string;
  detail: string;
  createdAt: string;
  phaseName: string;
  fileName: string;
  relativePath: string;
}

const PACKETS_DIR = "packets";
const PACKET_SUMMARY_HEADER = "## 摘要";
const PACKET_SUMMARY_HEADERS = [PACKET_SUMMARY_HEADER, "## Summary"];

export function getContinuationPacketsDir(projectRoot: string) {
  return join(getThreadsmithDir(projectRoot), PACKETS_DIR);
}

function slugTimestamp(createdAt: string) {
  return createdAt.replaceAll(":", "-").replaceAll(".", "-");
}

function packetFileName(kind: ContinuationPacketKind, createdAt: string) {
  return `${slugTimestamp(createdAt)}-${kind}.md`;
}

function formatBulletList(items: string[]) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- 无";
}

function formatActiveWork(state: ProjectState) {
  return state.activeWork.items.length > 0
    ? state.activeWork.items
        .map(
          (item) =>
            `- ${item.role}: ${item.status} - ${item.taskSummary}${
              item.requiresUserDecision ? "（需要 supervisor 决策）" : ""
            }`
        )
        .join("\n")
    : "- 无";
}

function formatRecentEvents(recentEvents: WorkflowEvent[]) {
  return recentEvents.length > 0
    ? recentEvents
        .slice(0, 5)
        .map(
          (event) =>
            `- ${event.createdAt}: ${event.title} - ${event.detail}`
        )
        .join("\n")
    : "- 无";
}

function buildSummary(
  kind: ContinuationPacketKind,
  state: ProjectState
): Pick<ContinuationPacketSummary, "title" | "detail"> {
  if (kind === "handoff") {
    return {
      title: "已创建 handoff packet",
      detail: `已为 phase「${state.currentPhase.phaseName}」记录当前 truth，下一段 slice 可以从这份紧凑 packet 继续。`
    };
  }

  return {
    title: "已创建 hygiene packet",
    detail: `已把 phase「${state.currentPhase.phaseName}」的当前 truth 重新锚定到可复用的 hygiene packet。`
  };
}

function readPrefixedValue(lines: string[], prefixes: string[]) {
  const line = lines.find((item) => prefixes.some((prefix) => item.startsWith(prefix)));

  if (!line) {
    return null;
  }

  const prefix = prefixes.find((item) => line.startsWith(item));

  return prefix ? line.slice(prefix.length) : null;
}

function buildPacketContents(
  kind: ContinuationPacketKind,
  state: ProjectState,
  recentEvents: WorkflowEvent[],
  createdAt: string,
  continuationBehavior?: ContinuationBehavior
) {
  const summary = buildSummary(kind, state);
  const title =
    kind === "handoff"
      ? "# Threadsmith Handoff Packet"
      : "# Threadsmith Hygiene Packet";
  const continuationLine = continuationBehavior
    ? `- Continuation 策略：${continuationBehavior}\n`
    : "";

  return `${title}

- 类型：${kind}
- 创建时间：${createdAt}
- 项目目标：${state.projectBrief.projectGoal}
- 当前 phase：${state.currentPhase.phaseName}
${continuationLine}
${PACKET_SUMMARY_HEADER}

${summary.title}

${summary.detail}

## 项目简介

- 当前范围：${state.projectBrief.currentVersionScope}
- 成功画面：${state.projectBrief.successFrame}
- 约束：
${formatBulletList(state.projectBrief.keyConstraints)}

## 当前 Phase

- 目标：${state.currentPhase.phaseGoal}
- 交付物：${state.currentPhase.deliverable}
- 停止条件：${state.currentPhase.stopCondition}
- 范围内：
${formatBulletList(state.currentPhase.inScope)}
- 范围外：
${formatBulletList(state.currentPhase.outOfScope)}
- 验证：
${formatBulletList(state.currentPhase.verificationForThisPhase)}

## 验收状态

- 当前 claim：${state.acceptanceState.currentClaim}
- 最终状态：${state.acceptanceState.finalState}
- Review：${state.acceptanceState.reviewStatus}
- Verification：${state.acceptanceState.verificationStatus}
- Closeout：${state.acceptanceState.closeoutStatus}
- 已知缺口：
${formatBulletList(state.acceptanceState.knownGaps)}

## 进行中的工作

${formatActiveWork(state)}

## 最近事件

${formatRecentEvents(recentEvents)}
`;
}

export async function writeContinuationPacket(
  projectRoot: string,
  options: {
    kind: ContinuationPacketKind;
    state: ProjectState;
    recentEvents: WorkflowEvent[];
    createdAt?: string;
    continuationBehavior?: ContinuationBehavior;
  }
): Promise<ContinuationPacketSummary> {
  const createdAt = options.createdAt ?? new Date().toISOString();
  const summary = buildSummary(options.kind, options.state);
  const fileName = packetFileName(options.kind, createdAt);
  const relativePath = `${THREADSMITH_DIR}/${PACKETS_DIR}/${fileName}`;

  await mkdir(getContinuationPacketsDir(projectRoot), { recursive: true });
  await writeFile(
    join(getContinuationPacketsDir(projectRoot), fileName),
    `${buildPacketContents(
      options.kind,
      options.state,
      options.recentEvents,
      createdAt,
      options.continuationBehavior
    ).trim()}\n`,
    "utf8"
  );

  return {
    ...summary,
    kind: options.kind,
    createdAt,
    phaseName: options.state.currentPhase.phaseName,
    fileName,
    relativePath
  };
}

export async function readLatestContinuationPacket(
  projectRoot: string,
  options?: {
    kind?: ContinuationPacketKind;
  }
) {
  try {
    const fileNames = (await readdir(getContinuationPacketsDir(projectRoot)))
      .filter((fileName) => {
        if (!fileName.endsWith(".md")) {
          return false;
        }

        if (!options?.kind) {
          return true;
        }

        return fileName.endsWith(`-${options.kind}.md`);
      })
      .sort()
      .reverse();

    const fileName = fileNames[0];

    if (!fileName) {
      return null;
    }

    const contents = await readFile(
      join(getContinuationPacketsDir(projectRoot), fileName),
      "utf8"
    );
    const lines = contents
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const kind = readPrefixedValue(lines, ["- 类型：", "- Kind: "]);
    const createdAt = readPrefixedValue(lines, ["- 创建时间：", "- Created: "]);
    const phaseName = readPrefixedValue(lines, ["- 当前 phase：", "- Current phase: "]);
    const summaryIndex = lines.findIndex((line) =>
      PACKET_SUMMARY_HEADERS.includes(line)
    );
    const titleLine = summaryIndex >= 0 ? lines[summaryIndex + 1] : null;
    const detailLine = summaryIndex >= 0 ? lines[summaryIndex + 2] : null;

    if (
      (kind !== "handoff" && kind !== "hygiene") ||
      !createdAt ||
      !phaseName ||
      !titleLine ||
      !detailLine
    ) {
      return null;
    }

    return {
      kind,
      title: titleLine,
      detail: detailLine,
      createdAt,
      phaseName,
      fileName,
      relativePath: `${THREADSMITH_DIR}/${PACKETS_DIR}/${fileName}`
    } satisfies ContinuationPacketSummary;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
