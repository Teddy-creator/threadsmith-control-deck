import {
  evidenceSummarySchema,
  type EvidenceSummary,
  type EvidenceSummaryArtifact,
  type EvidenceSummaryCommand,
  type VerificationCommandResult
} from "@threadsmith/domain";

export interface BuildEvidenceSummaryOptions {
  generatedAt?: string;
  summaryId?: string;
  commands?: EvidenceSummaryCommandInput[];
  artifactRefs?: EvidenceSummaryArtifact[];
  source?: EvidenceSummary["source"];
  warnings?: string[];
}

export interface EvidenceSummaryCommandInput extends VerificationCommandResult {
  exitCode?: number | null;
  durationMs?: number | null;
  failureFocus?: string | null;
  artifactRefs?: string[];
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function buildSummaryId(source: EvidenceSummary["source"], generatedAt: string) {
  const sourceSlug = slugify(source) || "evidence";
  const timestampSlug = generatedAt.replace(/[^0-9TZ]/g, "");
  return `ev-${sourceSlug}-${timestampSlug}`;
}

function normalizeCommand(command: EvidenceSummaryCommandInput): EvidenceSummaryCommand {
  return {
    command: command.command,
    status: command.status,
    summary: command.summary,
    exitCode: command.exitCode ?? null,
    durationMs: command.durationMs ?? null,
    failureFocus: command.failureFocus ?? null,
    artifactRefs: command.artifactRefs ?? []
  };
}

function deriveStatus(commands: EvidenceSummaryCommand[]) {
  if (commands.length === 0) {
    return "empty" as const;
  }

  if (commands.some((command) => command.status === "failed")) {
    return commands.every((command) => command.status === "failed")
      ? "failed" as const
      : "mixed" as const;
  }

  if (commands.some((command) => command.status === "pending")) {
    return "running" as const;
  }

  if (commands.every((command) => command.status === "passed")) {
    return "passed" as const;
  }

  if (commands.every((command) => command.status === "skipped")) {
    return "unknown" as const;
  }

  return "mixed" as const;
}

function summarizeCommandCounts(commands: EvidenceSummaryCommand[]) {
  const counts = commands.reduce(
    (accumulator, command) => ({
      ...accumulator,
      [command.status]: accumulator[command.status] + 1
    }),
    {
      pending: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    }
  );

  return `${counts.passed} passed, ${counts.failed} failed, ${counts.pending} pending, ${counts.skipped} skipped`;
}

function deriveFailureFocus(commands: EvidenceSummaryCommand[]) {
  const failedCommand = commands.find((command) => command.status === "failed");
  return failedCommand?.failureFocus ?? failedCommand?.summary ?? null;
}

function deriveHeadline(status: EvidenceSummary["status"], commands: EvidenceSummaryCommand[]) {
  switch (status) {
    case "empty":
      return "No verification evidence summarized yet";
    case "passed":
      return "Verification evidence passed";
    case "failed":
      return "Verification evidence failed";
    case "mixed":
      return "Verification evidence is mixed";
    case "running":
      return "Verification evidence is still running";
    case "unknown":
      return "Verification evidence is unknown";
  }
}

function deriveDetail(commands: EvidenceSummaryCommand[], artifacts: EvidenceSummaryArtifact[]) {
  if (commands.length === 0) {
    return "No verification commands have been summarized. Keep raw logs as artifacts and add concise command results here.";
  }

  const artifactDetail =
    artifacts.length > 0
      ? `${artifacts.length} artifact reference(s) available.`
      : "No artifact references recorded.";

  return `${summarizeCommandCounts(commands)}. ${artifactDetail}`;
}

export function buildEvidenceSummary(
  options: BuildEvidenceSummaryOptions = {}
): EvidenceSummary {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const source = options.source ?? (options.commands?.length ? "verification" : "empty");
  const commands = (options.commands ?? []).map(normalizeCommand);
  const artifactRefs = options.artifactRefs ?? [];
  const status = deriveStatus(commands);

  return evidenceSummarySchema.parse({
    summaryId: options.summaryId ?? buildSummaryId(source, generatedAt),
    generatedAt,
    status,
    headline: deriveHeadline(status, commands),
    detail: deriveDetail(commands, artifactRefs),
    commands,
    artifactRefs,
    failureFocus: deriveFailureFocus(commands),
    source,
    warnings: options.warnings ?? []
  });
}

export function toContextPacketEvidence(summary: EvidenceSummary) {
  return {
    status:
      summary.status === "empty"
        ? "missing" as const
        : summary.status === "failed" || summary.status === "mixed"
          ? "blocked" as const
          : summary.status === "unknown" || summary.status === "running"
            ? "unknown" as const
            : "ready" as const,
    summary: summary.failureFocus
      ? `${summary.headline}: ${summary.failureFocus}`
      : summary.detail,
    commands: summary.commands.map((command) => ({
      command: command.command,
      status: command.status,
      summary: command.summary
    })),
    artifactRefs: [
      ...summary.artifactRefs.map((artifact) => artifact.path),
      ...summary.commands.flatMap((command) => command.artifactRefs)
    ]
  };
}
