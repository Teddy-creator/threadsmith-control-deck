import type { ProjectLoadFailureKind } from "./types";

export class ProjectLoadError extends Error {
  kind: ProjectLoadFailureKind;
  projectRoot: string;

  constructor(
    projectRoot: string,
    message: string,
    kind: ProjectLoadFailureKind
  ) {
    super(message);
    this.name = "ProjectLoadError";
    this.projectRoot = projectRoot;
    this.kind = kind;
  }
}

export function classifyProjectLoadFailure(
  rawMessage: string
): ProjectLoadFailureKind {
  if (rawMessage.includes("ENOENT")) {
    return "missing-state";
  }

  if (
    rawMessage.includes("Unexpected token") ||
    rawMessage.includes("JSON") ||
    rawMessage.includes("ZodError")
  ) {
    return "invalid-state";
  }

  return "unknown";
}

export function explainProjectLoadFailure(
  projectRoot: string,
  rawMessage: string
) {
  if (classifyProjectLoadFailure(rawMessage) === "missing-state") {
    return `在 "${projectRoot}" 找不到完整的 Threadsmith 状态。你可以直接点击“初始化 Threadsmith”，为这个目录创建最小 .threadsmith，然后继续进入这个项目。`;
  }

  if (classifyProjectLoadFailure(rawMessage) === "invalid-state") {
    return `Threadsmith 在 "${projectRoot}" 找到了状态文件，但其中至少有一个文件无效或不完整。请修复 .threadsmith 里的文件后再重试。`;
  }

  return `无法打开 "${projectRoot}"。${rawMessage}`;
}
