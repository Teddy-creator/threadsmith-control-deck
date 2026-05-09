import {
  contextBudgetLedgerSchema,
  type ContextBudgetLedger,
  type ContextBudgetLevel,
  type ContextBudgetSection
} from "@threadsmith/domain";

export interface BuildContextBudgetOptions {
  watchChars?: number;
  heavyChars?: number;
  overBudgetChars?: number;
  sectionItemWatch?: number;
  sectionItemHeavy?: number;
  heaviestSectionLimit?: number;
}

const DEFAULT_LIMITS = {
  watchChars: 8_000,
  heavyChars: 16_000,
  overBudgetChars: 28_000,
  sectionItemWatch: 8,
  sectionItemHeavy: 16,
  heaviestSectionLimit: 4
};

const SECTION_ADVICE: Record<string, string> = {
  project: "Keep project summary to the durable headline and current track.",
  goal: "Prefer priority headlines over full strategy prose.",
  currentPhase: "Keep phase goal, deliverable, and stop condition concise.",
  scope: "Move detailed scope notes into source refs when scope lists grow.",
  acceptance: "Keep only the current claim, checklist status, and unresolved gaps.",
  nextStep: "Keep next step focused on one role and one action.",
  risks: "Keep only decision-changing risks and move stale risks out of packet.",
  relevantFiles: "Prioritize changed files and entry points; avoid dumping whole repo maps.",
  recentDiff: "Summarize diff intent instead of copying file-by-file commentary.",
  evidence: "Keep command summaries and artifact refs; do not copy raw stdout or stderr.",
  sourceRefs: "Reference durable files rather than repeating their contents."
};

function estimateChars(value: unknown) {
  return JSON.stringify(value).length;
}

function estimateTokens(chars: number) {
  return Math.ceil(chars / 4);
}

function levelForChars(
  chars: number,
  limits: Pick<BuildContextBudgetOptions, "watchChars" | "heavyChars" | "overBudgetChars">
): ContextBudgetLevel {
  if (chars >= limits.overBudgetChars!) {
    return "over-budget";
  }
  if (chars >= limits.heavyChars!) {
    return "heavy";
  }
  if (chars >= limits.watchChars!) {
    return "watch";
  }
  return "compact";
}

function itemCount(value: unknown) {
  if (Array.isArray(value)) {
    return value.length;
  }

  if (typeof value === "object" && value !== null) {
    return Object.keys(value).length;
  }

  return value === undefined || value === null ? 0 : 1;
}

function sectionAdvice(
  section: string,
  level: ContextBudgetLevel,
  items: number,
  limits: Required<BuildContextBudgetOptions>
) {
  if (level === "compact" && items < limits.sectionItemWatch) {
    return null;
  }

  return SECTION_ADVICE[section] ?? "Compress this section before handing it to another role.";
}

function sectionLevel(args: {
  estimatedChars: number;
  itemCount: number;
  limits: Required<BuildContextBudgetOptions>;
}) {
  const charLevel = levelForChars(args.estimatedChars, args.limits);

  if (args.itemCount >= args.limits.sectionItemHeavy && charLevel === "compact") {
    return "heavy" as const;
  }

  if (args.itemCount >= args.limits.sectionItemWatch && charLevel === "compact") {
    return "watch" as const;
  }

  return charLevel;
}

function buildSection(
  section: string,
  value: unknown,
  limits: Required<BuildContextBudgetOptions>
): ContextBudgetSection {
  const estimatedChars = estimateChars(value);
  const items = itemCount(value);
  const level = sectionLevel({
    estimatedChars,
    itemCount: items,
    limits
  });

  return {
    section,
    estimatedChars,
    itemCount: items,
    level,
    advice: sectionAdvice(section, level, items, limits)
  };
}

function buildWarnings(
  sections: ContextBudgetSection[],
  budgetLevel: ContextBudgetLevel
) {
  const warnings: string[] = [];

  if (budgetLevel === "over-budget") {
    warnings.push("Context Packet is over the heuristic budget and should be compressed before handoff.");
  } else if (budgetLevel === "heavy") {
    warnings.push("Context Packet is heavy; review heaviest sections before role handoff.");
  } else if (budgetLevel === "watch") {
    warnings.push("Context Packet is approaching the watch threshold.");
  }

  for (const section of sections) {
    if (section.level === "over-budget" || section.level === "heavy") {
      warnings.push(`${section.section} is ${section.level} (${section.estimatedChars} estimated chars).`);
    }
  }

  return warnings;
}

function buildCompressionAdvice(sections: ContextBudgetSection[]) {
  const advice = sections
    .filter((section) => section.advice)
    .sort((left, right) => right.estimatedChars - left.estimatedChars)
    .map((section) => `${section.section}: ${section.advice}`);

  return [...new Set(advice)].slice(0, 6);
}

export function buildContextBudgetLedger(
  packetBody: Record<string, unknown>,
  options: BuildContextBudgetOptions = {}
): ContextBudgetLedger {
  const limits: Required<BuildContextBudgetOptions> = {
    ...DEFAULT_LIMITS,
    ...options
  };
  const sections = Object.entries(packetBody).map(([section, value]) =>
    buildSection(section, value, limits)
  );
  const estimatedChars = estimateChars(packetBody);
  const budgetLevel = levelForChars(estimatedChars, limits);
  const heaviestSections = [...sections]
    .sort((left, right) => right.estimatedChars - left.estimatedChars)
    .slice(0, limits.heaviestSectionLimit);

  return contextBudgetLedgerSchema.parse({
    estimatedChars,
    estimatedTokens: estimateTokens(estimatedChars),
    budgetLevel,
    method: "heuristic-json-char-estimate-v1",
    limits: {
      watchChars: limits.watchChars,
      heavyChars: limits.heavyChars,
      overBudgetChars: limits.overBudgetChars
    },
    sections,
    heaviestSections,
    warnings: buildWarnings(sections, budgetLevel),
    compressionAdvice: buildCompressionAdvice(sections)
  });
}
