import {
  skillOrchestratorConfigSchema,
  type DiscoveredSkill,
  type SkillAdapterDeclaration,
  type SkillCapability,
  type SkillDiscoverySummary,
  type SkillOrchestratorConfig,
  type SkillRoutePreference,
  type SkillRoutingConfig
} from "@threadsmith/domain";

const KNOWN_SKILL_CAPABILITIES: Record<string, SkillCapability[]> = {
  "agents-md-builder": ["docs"],
  "bug-driver": ["debug"],
  "figma-implement-design": ["frontend"],
  "frontend-skill": ["frontend"],
  "independent-verification": ["verify"],
  "session-hygiene": ["recover"],
  "systematic-debugging": ["debug"],
  "task-brief-drafter": ["brief"],
  "task-closeout": ["closeout"],
  "thread-handoff": ["handoff", "recover"],
  "verification-before-completion": ["verify"],
  "writing-plans": ["plan"]
};

const PREFERRED_SKILL_BY_CAPABILITY: Partial<Record<SkillCapability, string[]>> = {
  brief: ["task-brief-drafter", "brainstorming"],
  plan: ["writing-plans", "executing-plans"],
  debug: ["systematic-debugging", "bug-driver"],
  review: [],
  verify: ["independent-verification", "verification-before-completion"],
  closeout: ["task-closeout"],
  handoff: ["thread-handoff"],
  recover: ["session-hygiene", "thread-handoff"],
  research: [],
  frontend: ["figma-implement-design", "frontend-skill"],
  docs: ["agents-md-builder"],
  implement: []
};

const CAPABILITY_KEYWORDS: Array<{
  capability: SkillCapability;
  patterns: RegExp[];
}> = [
  {
    capability: "brief",
    patterns: [/\bbrief\b/i, /task[- ]brief/i, /requirements?/i]
  },
  {
    capability: "plan",
    patterns: [/\bplan(?:ning)?\b/i, /implementation plan/i]
  },
  {
    capability: "debug",
    patterns: [/\bdebug(?:ging)?\b/i, /\bbug\b/i, /root cause/i, /failure/i]
  },
  {
    capability: "review",
    patterns: [/\breview\b/i, /critique/i]
  },
  {
    capability: "verify",
    patterns: [/\bverify\b/i, /verification/i, /test evidence/i, /acceptance/i]
  },
  {
    capability: "closeout",
    patterns: [/\bcloseout\b/i, /cleanup/i, /residual risk/i]
  },
  {
    capability: "handoff",
    patterns: [/\bhandoff\b/i, /continuation/i]
  },
  {
    capability: "recover",
    patterns: [/\brecover(?:y)?\b/i, /hygiene/i, /stale/i]
  },
  {
    capability: "research",
    patterns: [/\bresearch\b/i, /sources?/i]
  },
  {
    capability: "frontend",
    patterns: [/\bfrontend\b/i, /\bfigma\b/i, /\bui\b/i, /visual/i]
  },
  {
    capability: "docs",
    patterns: [/\bdocs?\b/i, /documentation/i, /readme/i, /agents\.md/i]
  },
  {
    capability: "implement",
    patterns: [/\bimplement\b/i, /execution/i, /coding/i]
  }
];

function uniqueCapabilities(capabilities: SkillCapability[]) {
  return [...new Set(capabilities)];
}

function searchableSkillText(skill: Pick<
  DiscoveredSkill,
  "name" | "description" | "bodyPreview"
>) {
  return [
    skill.name,
    skill.description ?? "",
    skill.bodyPreview
  ].join("\n");
}

export function inferSkillCapabilities(
  skill: Pick<DiscoveredSkill, "name" | "description" | "bodyPreview">
): SkillCapability[] {
  const known = KNOWN_SKILL_CAPABILITIES[skill.name];

  if (known) {
    return known;
  }

  const text = searchableSkillText(skill);
  const inferred = CAPABILITY_KEYWORDS.flatMap(({ capability, patterns }) =>
    patterns.some((pattern) => pattern.test(text)) ? [capability] : []
  );

  return uniqueCapabilities(inferred);
}

function fallbackProtocolFor(capabilities: SkillCapability[]) {
  const protocolCapability = capabilities.find((capability) =>
    [
      "brief",
      "plan",
      "debug",
      "review",
      "verify",
      "closeout",
      "handoff",
      "recover",
      "research"
    ].includes(capability)
  );

  return protocolCapability ?? "plan";
}

export function skillToAdapterDeclaration(
  skill: DiscoveredSkill
): SkillAdapterDeclaration | null {
  const capabilities = uniqueCapabilities(
    skill.capabilities.length > 0
      ? skill.capabilities
      : inferSkillCapabilities(skill)
  );

  if (capabilities.length === 0) {
    return null;
  }

  return {
    id: skill.id,
    label: skill.name,
    capabilities,
    entry: {
      kind: "codex-skill",
      ref: `$${skill.name}`
    },
    fallbackProtocol: fallbackProtocolFor(capabilities),
    availability: skill.health,
    safety: {
      canMutateCommittedTruth: false,
      canMutateGlobalSkill: false,
      forbiddenPaths: []
    }
  };
}

function availabilityCounts(skills: DiscoveredSkill[]) {
  return {
    total: skills.length,
    available: skills.filter((skill) => skill.health === "available").length,
    missing: skills.filter((skill) => skill.health === "missing").length,
    stale: skills.filter((skill) => skill.health === "stale").length,
    disabled: skills.filter((skill) => skill.health === "disabled").length,
    unsafe: skills.filter((skill) => skill.health === "unsafe").length
  };
}

export function summarizeSkillDiscovery(
  input: Omit<SkillDiscoverySummary, "counts">
): SkillDiscoverySummary {
  return {
    ...input,
    counts: availabilityCounts(input.skills)
  };
}

function adapterPriority(skill: DiscoveredSkill) {
  switch (skill.source) {
    case "project-codex":
      return 0;
    case "repo":
      return 1;
    case "global-codex":
      return 2;
    default:
      return 3;
  }
}

function capabilityPreferencePriority(skill: DiscoveredSkill) {
  const capabilities = skill.capabilities.length > 0
    ? skill.capabilities
    : inferSkillCapabilities(skill);
  const ranks = capabilities.map((capability) => {
    const preferred = PREFERRED_SKILL_BY_CAPABILITY[capability] ?? [];
    const index = preferred.indexOf(skill.id);
    return index >= 0 ? index : Number.POSITIVE_INFINITY;
  });

  return Math.min(...ranks, Number.POSITIVE_INFINITY);
}

function sortDiscoveredSkills(left: DiscoveredSkill, right: DiscoveredSkill) {
  return (
    adapterPriority(left) - adapterPriority(right) ||
    capabilityPreferencePriority(left) - capabilityPreferencePriority(right) ||
    left.capabilities.length - right.capabilities.length ||
    left.id.localeCompare(right.id)
  );
}

export function buildSkillOrchestratorConfigFromDiscovery(args: {
  baseConfig: SkillOrchestratorConfig;
  discovery: SkillDiscoverySummary;
  routingConfig?: SkillRoutingConfig;
}): SkillOrchestratorConfig {
  const discoveredAdapters = args.discovery.skills
    .filter((skill) => skill.health !== "missing")
    .sort(sortDiscoveredSkills)
    .flatMap((skill) => {
      const adapter = skillToAdapterDeclaration(skill);
      return adapter ? [adapter] : [];
    });
  const adapterById = new Map<string, SkillAdapterDeclaration>();

  for (const adapter of [...discoveredAdapters, ...args.baseConfig.adapters]) {
    if (!adapterById.has(adapter.id)) {
      adapterById.set(adapter.id, adapter);
    }
  }

  const disabledAdapterReasons = new Map(
    args.routingConfig?.disabledAdapters.map((adapter) => [
      adapter.adapterId,
      adapter.reason
    ]) ?? []
  );
  const adapters = [...adapterById.values()].map((adapter) =>
    disabledAdapterReasons.has(adapter.id)
      ? {
          ...adapter,
          availability: "disabled" as const
        }
      : adapter
  );

  return skillOrchestratorConfigSchema.parse({
    ...args.baseConfig,
    adapters,
    routePreferences: mergeRoutePreferences(
      args.routingConfig?.routePreferences ?? [],
      args.baseConfig.routePreferences
    )
  });
}

function routePreferenceKey(preference: SkillRoutePreference) {
  return `${preference.role ?? "*"}:${preference.capability}`;
}

function mergeRoutePreferences(
  primary: SkillRoutePreference[],
  fallback: SkillRoutePreference[] = []
) {
  const merged = new Map<string, SkillRoutePreference>();

  for (const preference of [...primary, ...fallback]) {
    const key = routePreferenceKey(preference);
    if (!merged.has(key)) {
      merged.set(key, preference);
    }
  }

  return [...merged.values()];
}
