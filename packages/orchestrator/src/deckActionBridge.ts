import type { ContinuationBehavior, ProviderRouting } from "@threadsmith/domain";
import {
  appendActionHistoryEntry,
  applyDeckActionState,
  loadProviderRouting,
  recordCommandBridgeDispatch,
  recordCommandBridgeFailure,
  recordCommandBridgeRunStarted
} from "@threadsmith/fs-bridge";
import type { SpawnProcess } from "./providerTypes.ts";
import {
  launchProjectRoleRun,
  type RoleRunLaunchResponse
} from "./runEngine.ts";

export interface AdvancePhaseFromDeckOptions {
  projectRoot: string;
  continuationBehavior?: ContinuationBehavior;
  startedAt?: string;
  spawnProcess?: SpawnProcess;
}

export interface AdvancePhaseFromDeckUnsupportedResult {
  kind: "unsupported-provider";
  detail: string;
  routeId: string | null;
  providerRouting: ProviderRouting;
}

export interface AdvancePhaseFromDeckLaunchedResult {
  kind: "launched";
  routeId: string | null;
  providerRouting: ProviderRouting;
  launch: RoleRunLaunchResponse;
}

export type AdvancePhaseFromDeckResult =
  | AdvancePhaseFromDeckUnsupportedResult
  | AdvancePhaseFromDeckLaunchedResult;

function formatConductorSurfaceLabel(surface: ProviderRouting["conductorSurface"]) {
  switch (surface) {
    case "codex-cli":
      return "Codex CLI";
    case "claude-cli":
      return "Claude CLI";
    case "codex-desktop":
    default:
      return "Codex Desktop";
  }
}

function resolveExecutorProvider(routing: ProviderRouting) {
  return routing.executor === "claude" ? "claude" : "codex";
}

function buildUnsupportedProviderMessage(
  routing: ProviderRouting,
  role: "executor"
) {
  return `当前 ${role} 已路由到 Claude；auto-execution v1 暂不支持自动执行，请回到当前入口（${formatConductorSurfaceLabel(routing.conductorSurface)}）继续。`;
}

export async function advancePhaseFromDeck(
  options: AdvancePhaseFromDeckOptions
): Promise<AdvancePhaseFromDeckResult> {
  const createdAt = options.startedAt ?? new Date().toISOString();
  const providerRouting = await loadProviderRouting(options.projectRoot);
  const targetProvider = resolveExecutorProvider(providerRouting);

  if (targetProvider !== "codex") {
    const detail = buildUnsupportedProviderMessage(providerRouting, "executor");
    const bridgeState = await recordCommandBridgeDispatch(options.projectRoot, {
      surface: "deck-action-bridge",
      sourceActionId: "advance-phase",
      provider: targetProvider,
      targetRole: "executor",
      createdAt,
      statusDetail: detail
    });

    if (bridgeState.latestRoute) {
      await recordCommandBridgeFailure(
        options.projectRoot,
        bridgeState.latestRoute.routeId,
        detail,
        createdAt
      );
    }

    return {
      kind: "unsupported-provider",
      detail,
      routeId: bridgeState.latestRoute?.routeId ?? null,
      providerRouting
    };
  }

  await appendActionHistoryEntry(options.projectRoot, {
    id: crypto.randomUUID(),
    actionId: "advance-phase",
    createdAt,
    projectRoot: options.projectRoot,
    previewAccepted: true,
    continuationBehavior: options.continuationBehavior,
    persistenceScope: undefined
  });
  await applyDeckActionState(options.projectRoot, "advance-phase", {
    continuationBehavior: options.continuationBehavior
  });

  const bridgeState = await recordCommandBridgeDispatch(options.projectRoot, {
    surface: "deck-action-bridge",
    sourceActionId: "advance-phase",
    provider: "codex",
    targetRole: "executor",
    createdAt
  });

  try {
    const launch = await launchProjectRoleRun({
      projectRoot: options.projectRoot,
      role: "executor",
      provider: "codex",
      startedAt: createdAt,
      spawnProcess: options.spawnProcess
    });

    if (bridgeState.latestRoute) {
      await recordCommandBridgeRunStarted(
        options.projectRoot,
        bridgeState.latestRoute.routeId,
        launch.run
      );
    }

    return {
      kind: "launched",
      routeId: bridgeState.latestRoute?.routeId ?? null,
      providerRouting,
      launch
    };
  } catch (error) {
    if (bridgeState.latestRoute) {
      await recordCommandBridgeFailure(
        options.projectRoot,
        bridgeState.latestRoute.routeId,
        error instanceof Error ? error.message : "Unknown bridge error",
        createdAt
      );
    }

    throw error;
  }
}
