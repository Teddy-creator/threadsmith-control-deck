import type {
  MiniProtocolId,
  PhaseOwner,
  SkillAdapterAvailability,
  SkillAdapterDeclaration,
  SkillCapability,
  SkillOrchestratorConfig,
  SkillRouteDecision,
  SkillRoutePreference
} from "@threadsmith/domain";
import { getSelfHostingSafetyWarnings } from "@threadsmith/domain";

export interface ResolveSkillRouteInput {
  role: PhaseOwner;
  requestedCapability: SkillCapability;
  config: SkillOrchestratorConfig;
  preferredAdapterId?: string | null;
}

export interface SelfHostingSafetyReport {
  canUseExternalAdapters: boolean;
  protectedPaths: string[];
  warnings: string[];
}

function isMiniProtocol(
  capability: SkillCapability,
  config: SkillOrchestratorConfig
): capability is MiniProtocolId {
  return config.builtInProtocols.includes(capability as MiniProtocolId);
}

function fallbackProtocolFor(args: {
  requestedCapability: SkillCapability;
  adapter?: SkillAdapterDeclaration | null;
  config: SkillOrchestratorConfig;
}): MiniProtocolId {
  if (args.adapter) {
    return args.adapter.fallbackProtocol;
  }

  if (isMiniProtocol(args.requestedCapability, args.config)) {
    return args.requestedCapability;
  }

  return args.config.defaultFallback;
}

function effectiveAvailability(
  adapter: SkillAdapterDeclaration,
  selfHostingSafety: SelfHostingSafetyReport
): SkillAdapterAvailability {
  if (!selfHostingSafety.canUseExternalAdapters) {
    return "unsafe";
  }

  if (adapter.safety.canMutateGlobalSkill) {
    return "unsafe";
  }

  return adapter.availability;
}

export function inspectSelfHostingSafety(
  config: SkillOrchestratorConfig
): SelfHostingSafetyReport {
  const warnings = getSelfHostingSafetyWarnings(config.selfHosting);
  const protectedPaths = config.selfHosting.installedSkillPath
    ? [config.selfHosting.installedSkillPath]
    : [];

  return {
    canUseExternalAdapters: warnings.length === 0,
    protectedPaths,
    warnings
  };
}

function safetyWarningsFor(
  adapter: SkillAdapterDeclaration | null,
  selfHostingSafety: SelfHostingSafetyReport
) {
  const warnings = [...selfHostingSafety.warnings];

  if (!adapter) {
    return warnings;
  }

  if (adapter.safety.canMutateGlobalSkill) {
    warnings.push(
      "Adapter safety allows global skill mutation; falling back to a built-in mini protocol."
    );
  }

  for (const path of adapter.safety.forbiddenPaths) {
    warnings.push(`Adapter declares forbidden path: ${path}`);
  }

  return warnings;
}

function resolvePreferredAdapterId(args: ResolveSkillRouteInput) {
  return args.preferredAdapterId
    ?? findRoutePreference(args.config.routePreferences ?? [], {
      role: args.role,
      requestedCapability: args.requestedCapability
    })?.adapterId
    ?? null;
}

function findAdapter(args: ResolveSkillRouteInput, preferredAdapterId: string | null) {
  const capabilityMatches = args.config.adapters.filter((adapter) =>
    adapter.capabilities.includes(args.requestedCapability)
  );

  if (preferredAdapterId) {
    return (
      capabilityMatches.find((adapter) => adapter.id === preferredAdapterId) ??
      null
    );
  }

  return capabilityMatches[0] ?? null;
}

function findRoutePreference(
  preferences: SkillRoutePreference[],
  args: Pick<ResolveSkillRouteInput, "role" | "requestedCapability">
) {
  return (
    preferences.find((preference) =>
      preference.role === args.role &&
      preference.capability === args.requestedCapability
    )
    ?? preferences.find((preference) =>
      preference.role === null &&
      preference.capability === args.requestedCapability
    )
    ?? null
  );
}

export function resolveSkillRoute(
  input: ResolveSkillRouteInput
): SkillRouteDecision {
  const preferredAdapterId = resolvePreferredAdapterId(input);
  const adapter = findAdapter(input, preferredAdapterId);
  const selfHostingSafety = inspectSelfHostingSafety(input.config);
  const selectedProtocol = fallbackProtocolFor({
    requestedCapability: input.requestedCapability,
    adapter,
    config: input.config
  });
  const safetyWarnings = safetyWarningsFor(adapter, selfHostingSafety);

  if (!adapter) {
    return {
      role: input.role,
      requestedCapability: input.requestedCapability,
      selectedProtocol,
      selectedAdapterId: null,
      source: isMiniProtocol(input.requestedCapability, input.config)
        ? "built-in"
        : "fallback",
      availability: "missing",
      reason: preferredAdapterId
        ? `Preferred adapter "${preferredAdapterId}" is missing for ${input.requestedCapability}; using built-in ${selectedProtocol}.`
        : `No external adapter is configured for ${input.requestedCapability}; using built-in ${selectedProtocol}.`,
      safetyWarnings
    };
  }

  const availability = effectiveAvailability(adapter, selfHostingSafety);

  if (availability === "available") {
    return {
      role: input.role,
      requestedCapability: input.requestedCapability,
      selectedProtocol,
      selectedAdapterId: adapter.id,
      source: "external-adapter",
      availability,
      reason: `External adapter "${adapter.id}" is available for ${input.requestedCapability}.`,
      safetyWarnings
    };
  }

  return {
    role: input.role,
    requestedCapability: input.requestedCapability,
    selectedProtocol,
    selectedAdapterId: adapter.id,
    source: "fallback",
    availability,
    reason: `External adapter "${adapter.id}" is ${availability}; using built-in ${selectedProtocol}.`,
    safetyWarnings
  };
}
