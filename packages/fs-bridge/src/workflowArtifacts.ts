import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DoneWhenItem, ProjectState, WorkflowEvent } from "@threadsmith/domain";
import { THREADSMITH_DIR, getThreadsmithDir } from "./paths.ts";

export type WorkflowArtifactKind = "verification" | "closeout";
export type VerificationArtifactStatus = "running" | "passed" | "failed";

export interface WorkflowArtifactSummary {
  kind: WorkflowArtifactKind;
  title: string;
  detail: string;
  createdAt: string;
  fileName: string;
  relativePath: string;
  status: string | null;
}

const ARTIFACT_DIRS: Record<WorkflowArtifactKind, string> = {
  verification: "evidence",
  closeout: "closeouts"
};

const ARTIFACT_SUMMARY_HEADER = "## 摘要";
const ARTIFACT_SUMMARY_HEADERS = [ARTIFACT_SUMMARY_HEADER, "## Summary"];

function slugTimestamp(createdAt: string) {
  return createdAt.replaceAll(":", "-").replaceAll(".", "-");
}

function formatBulletList(items: string[]) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- 无";
}

function formatChecklist(items: DoneWhenItem[]) {
  if (items.length === 0) {
    return "- 无";
  }

  return items
    .map((item) => {
      const marker =
        item.status === "pass" ? "x" : item.status === "fail" ? "!" : " ";
      return `- [${marker}] ${item.label}`;
    })
    .join("\n");
}

function formatRecentEvents(recentEvents: WorkflowEvent[]) {
  return recentEvents.length > 0
    ? recentEvents
        .slice(0, 5)
        .map((event) => `- ${event.createdAt}: ${event.title} - ${event.detail}`)
        .join("\n")
    : "- 无";
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

function getArtifactDir(projectRoot: string, kind: WorkflowArtifactKind) {
  return join(getThreadsmithDir(projectRoot), ARTIFACT_DIRS[kind]);
}

function artifactFileName(
  kind: WorkflowArtifactKind,
  createdAt: string,
  status?: VerificationArtifactStatus
) {
  const timestamp = slugTimestamp(createdAt);

  if (kind === "verification") {
    return `${timestamp}-verification-${status ?? "running"}.md`;
  }

  return `${timestamp}-closeout.md`;
}

function verificationSummary(
  state: ProjectState,
  status: VerificationArtifactStatus
): Pick<WorkflowArtifactSummary, "title" | "detail" | "status"> {
  if (status === "passed") {
    return {
      title: "已记录 verification 通过证据",
      detail: `phase「${state.currentPhase.phaseName}」的当前 claim 已被 verification 接受，并保存为可追溯 evidence。`,
      status
    };
  }

  if (status === "failed") {
    return {
      title: "已记录 verification 失败证据",
      detail: `phase「${state.currentPhase.phaseName}」的当前 claim 未通过 verification，失败证据已被保存以支撑下一条修复 slice。`,
      status
    };
  }

  return {
    title: "已记录 verification 运行证据",
    detail: `phase「${state.currentPhase.phaseName}」的当前 claim、done when 与最近事件已被固化为 verification evidence。`,
    status
  };
}

function closeoutSummary(
  state: ProjectState
): Pick<WorkflowArtifactSummary, "title" | "detail" | "status"> {
  return {
    title: "已记录 closeout artifact",
    detail: `phase「${state.currentPhase.phaseName}」的 closeout 边界已被保存，这个 slice 可以作为 accepted truth 被后续 handoff 复用。`,
    status: null
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

function buildVerificationContents(
  state: ProjectState,
  recentEvents: WorkflowEvent[],
  createdAt: string,
  status: VerificationArtifactStatus
) {
  const summary = verificationSummary(state, status);

  return `# Threadsmith Verification Evidence

- 类型：verification
- 状态：${status}
- 创建时间：${createdAt}
- 项目目标：${state.projectBrief.projectGoal}
- 当前 phase：${state.currentPhase.phaseName}

${ARTIFACT_SUMMARY_HEADER}

${summary.title}

${summary.detail}

## 当前 Claim

- 当前 claim：${state.acceptanceState.currentClaim}
- Review：${state.acceptanceState.reviewStatus}
- Verification：${state.acceptanceState.verificationStatus}
- Closeout：${state.acceptanceState.closeoutStatus}

## Done When

${formatChecklist(state.acceptanceState.doneWhenChecklist)}

## 已知缺口

${formatBulletList(state.acceptanceState.knownGaps)}

## 最近事件

${formatRecentEvents(recentEvents)}
`;
}

function buildCloseoutContents(
  state: ProjectState,
  recentEvents: WorkflowEvent[],
  createdAt: string
) {
  const summary = closeoutSummary(state);
  const passedChecklistCount = state.acceptanceState.doneWhenChecklist.filter(
    (item) => item.status === "pass"
  ).length;

  return `# Threadsmith Closeout Record

- 类型：closeout
- 创建时间：${createdAt}
- 项目目标：${state.projectBrief.projectGoal}
- 当前 phase：${state.currentPhase.phaseName}

${ARTIFACT_SUMMARY_HEADER}

${summary.title}

${summary.detail}

## 验收状态

- 当前 claim：${state.acceptanceState.currentClaim}
- 最终状态：${state.acceptanceState.finalState}
- Done When：${passedChecklistCount}/${state.acceptanceState.doneWhenChecklist.length}
- 已知缺口：
${formatBulletList(state.acceptanceState.knownGaps)}

## 进行中的工作

${formatActiveWork(state)}

## 最近事件

${formatRecentEvents(recentEvents)}
`;
}

async function writeArtifactFile(
  projectRoot: string,
  kind: WorkflowArtifactKind,
  contents: string,
  createdAt: string,
  status: string | null,
  summary: Pick<WorkflowArtifactSummary, "title" | "detail">
) {
  const fileName = artifactFileName(
    kind,
    createdAt,
    kind === "verification" ? (status as VerificationArtifactStatus) : undefined
  );
  const relativePath = `${THREADSMITH_DIR}/${ARTIFACT_DIRS[kind]}/${fileName}`;

  await mkdir(getArtifactDir(projectRoot, kind), { recursive: true });
  await writeFile(join(getArtifactDir(projectRoot, kind), fileName), `${contents.trim()}\n`, "utf8");

  return {
    ...summary,
    kind,
    createdAt,
    fileName,
    relativePath,
    status
  } satisfies WorkflowArtifactSummary;
}

export async function writeVerificationEvidenceArtifact(
  projectRoot: string,
  options: {
    state: ProjectState;
    recentEvents: WorkflowEvent[];
    createdAt?: string;
    status: VerificationArtifactStatus;
  }
) {
  const createdAt = options.createdAt ?? new Date().toISOString();
  const summary = verificationSummary(options.state, options.status);

  return writeArtifactFile(
    projectRoot,
    "verification",
    buildVerificationContents(
      options.state,
      options.recentEvents,
      createdAt,
      options.status
    ),
    createdAt,
    options.status,
    summary
  );
}

export async function writeCloseoutArtifact(
  projectRoot: string,
  options: {
    state: ProjectState;
    recentEvents: WorkflowEvent[];
    createdAt?: string;
  }
) {
  const createdAt = options.createdAt ?? new Date().toISOString();
  const summary = closeoutSummary(options.state);

  return writeArtifactFile(
    projectRoot,
    "closeout",
    buildCloseoutContents(options.state, options.recentEvents, createdAt),
    createdAt,
    null,
    summary
  );
}

export async function readLatestWorkflowArtifact(
  projectRoot: string,
  kind: WorkflowArtifactKind
) {
  try {
    const fileNames = (await readdir(getArtifactDir(projectRoot, kind)))
      .filter((fileName) => fileName.endsWith(".md"))
      .sort()
      .reverse();

    const fileName = fileNames[0];

    if (!fileName) {
      return null;
    }

    const contents = await readFile(join(getArtifactDir(projectRoot, kind), fileName), "utf8");
    const lines = contents
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const parsedKind = readPrefixedValue(lines, ["- 类型：", "- Kind: "]);
    const createdAt = readPrefixedValue(lines, ["- 创建时间：", "- Created: "]);
    const status = readPrefixedValue(lines, ["- 状态：", "- Status: "]);
    const summaryIndex = lines.findIndex((line) =>
      ARTIFACT_SUMMARY_HEADERS.includes(line)
    );
    const titleLine = summaryIndex >= 0 ? lines[summaryIndex + 1] : null;
    const detailLine = summaryIndex >= 0 ? lines[summaryIndex + 2] : null;

    if (parsedKind !== kind || !createdAt || !titleLine || !detailLine) {
      return null;
    }

    return {
      kind,
      title: titleLine,
      detail: detailLine,
      createdAt,
      fileName,
      relativePath: `${THREADSMITH_DIR}/${ARTIFACT_DIRS[kind]}/${fileName}`,
      status
    } satisfies WorkflowArtifactSummary;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}
