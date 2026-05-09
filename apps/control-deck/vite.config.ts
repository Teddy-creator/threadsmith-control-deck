import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { bootstrapProjectState } from "../../packages/orchestrator/src/bootstrap";
import { advancePhaseFromDeck, startProjectRun } from "../../packages/orchestrator/src/index";
import {
  appendActionHistoryEntry,
  readActionHistory
} from "../../packages/fs-bridge/src/actionQueue";
import { readLatestAgentRuns } from "../../packages/fs-bridge/src/agentRuns";
import {
  readCommandBridgeState,
  recordCommandBridgeDispatch,
  recordCommandBridgeFailure,
  recordCommandBridgeRunStarted
} from "../../packages/fs-bridge/src/commandBridge";
import { readRecentEvents } from "../../packages/fs-bridge/src/events";
import {
  applyDeckActionState,
  applyWorkflowTransition
} from "../../packages/fs-bridge/src/workflow";
import { applyPhaseReset } from "../../packages/fs-bridge/src/phaseReset";
import {
  loadProjectSupervisionState,
  loadProjectState,
  persistContinuationPreference,
  writeStateFragment
} from "../../packages/fs-bridge/src/fileStore";
import {
  readLatestPhaseRun,
  readPhasePause
} from "../../packages/fs-bridge/src/phaseRuns";
import {
  loadProviderRouting,
  writeProviderRouting
} from "../../packages/fs-bridge/src/providerRouting";
import {
  acceptanceStateUpdateRequestSchema,
  currentPhaseUpdateRequestSchema,
  deckActionRequestSchema,
  phaseResetRequestSchema,
  providerRoutingUpdateRequestSchema,
  projectBriefUpdateRequestSchema,
  projectRoadmapUpdateRequestSchema,
  projectStatusUpdateRequestSchema,
  projectSupervisionUpdateRequestSchema,
  runStartRequestSchema,
  workflowTransitionRequestSchema
} from "../../packages/fs-bridge/src/schema";
import { STATE_FILES } from "../../packages/fs-bridge/src/paths";
import { createAppHomeBridgeResponse } from "./server/appHomeBridge";
import { APP_HOME_PROJECT_ROOT, isAppHomeProjectRoot } from "./src/features/deck/appHomeSource";

const appDir = dirname(fileURLToPath(import.meta.url));
const defaultProjectRoot = resolve(appDir, "../../examples/project-state");
const stalePacketProjectRoot = resolve(
  appDir,
  "../../examples/project-state-stale-packet"
);
const selfHostedProjectRoot = resolve(appDir, "../..");
const selfHostedStateDir = resolve(selfHostedProjectRoot, ".threadsmith");
const selfHostedProjectRootAvailable = [
  STATE_FILES.projectBrief,
  STATE_FILES.projectStatus,
  STATE_FILES.currentPhase,
  STATE_FILES.acceptanceState,
  STATE_FILES.activeWork,
  STATE_FILES.preferences
].every((fileName) => existsSync(resolve(selfHostedStateDir, fileName)));

function manualControlDeckChunks(id: string) {
  if (id.includes("/node_modules/react/") || id.includes("/node_modules/react-dom/")) {
    return "react-vendor";
  }

  if (id.includes("/node_modules/lucide-react/")) {
    return "icons";
  }

  if (id.includes("/node_modules/zustand/")) {
    return "state-vendor";
  }

  if (id.includes("/packages/domain/") || id.includes("/packages/runtime/")) {
    return "threadsmith-core";
  }

  return undefined;
}

function getProjectRoot(requestUrl: string | undefined) {
  const url = new URL(requestUrl ?? "/", "http://localhost");
  const explicitProjectRoot = url.searchParams.get("projectRoot");

  if (explicitProjectRoot) {
    return explicitProjectRoot;
  }

  if (url.searchParams.get("appHome") === "1") {
    return APP_HOME_PROJECT_ROOT;
  }

  return defaultProjectRoot;
}

async function readBody(request: Parameters<NonNullable<ReturnType<typeof defineConfig>["plugins"]>[number]["configureServer"]>[0]["middlewares"]["use"] extends (...args: infer P) => unknown ? P[1] : never) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return chunks.length > 0 ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

function json(response: Parameters<NonNullable<ReturnType<typeof defineConfig>["plugins"]>[number]["configureServer"]>[0]["middlewares"]["use"] extends (...args: infer P) => unknown ? P[2] : never, status: number, body: unknown) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
}

function formatConductorSurfaceLabel(surface: string | undefined) {
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

function resolveRoutedProvider(routing: Awaited<ReturnType<typeof loadProviderRouting>>, role: string) {
  if (role === "hygiene") {
    return "codex" as const;
  }

  return routing[role as keyof typeof routing] === "claude" ? "claude" : "codex";
}

function buildUnsupportedProviderMessage(
  routing: Awaited<ReturnType<typeof loadProviderRouting>>,
  role: string
) {
  return `当前 ${role} 已路由到 Claude；auto-execution v1 暂不支持自动执行，请回到当前入口（${formatConductorSurfaceLabel(routing.conductorSurface)}）继续。`;
}

async function buildBridgeResponse(projectRoot: string) {
  if (isAppHomeProjectRoot(projectRoot)) {
    const providerRouting = await loadProviderRouting(selfHostedProjectRoot);
    return createAppHomeBridgeResponse(providerRouting);
  }

  const state = await loadProjectState(projectRoot);
  const providerRouting = await loadProviderRouting(projectRoot);
  const projectSupervision = await loadProjectSupervisionState(projectRoot, state);
  const actionHistory = await readActionHistory(projectRoot);
  const recentEvents = await readRecentEvents(projectRoot);
  const latestRun = (await readLatestAgentRuns(projectRoot, 1))[0] ?? null;
  const latestPhaseRun = await readLatestPhaseRun(projectRoot);
  const latestPhasePause = latestPhaseRun
    ? await readPhasePause(projectRoot, latestPhaseRun.phaseRunId)
    : null;
  const commandBridgeState = await readCommandBridgeState(projectRoot);

  return {
    projectRoot,
    state,
    providerRouting,
    projectSupervision,
    recentEvents,
    latestRun,
    latestPhaseRun,
    latestPhasePause,
    commandBridgeState,
    actionHistoryLength: actionHistory.length
  };
}

const threadsmithApiPlugin = {
  name: "threadsmith-api",
  configureServer(server: { middlewares: { use: (path: string, handler: (req: any, res: any) => void | Promise<void>) => void } }) {
    server.middlewares.use("/api/threadsmith/state", async (req, res) => {
      try {
        const projectRoot = getProjectRoot(req.url);
        json(res, 200, await buildBridgeResponse(projectRoot));
      } catch (error) {
        json(res, 500, {
          message: error instanceof Error ? error.message : "Unknown state error"
        });
      }
    });

    server.middlewares.use("/api/threadsmith/provider-routing", async (req, res) => {
      try {
        const projectRoot = getProjectRoot(req.url);
        const routingProjectRoot = isAppHomeProjectRoot(projectRoot)
          ? selfHostedProjectRoot
          : projectRoot;

        if (req.method === "GET") {
          json(res, 200, await loadProviderRouting(routingProjectRoot));
          return;
        }

        if (req.method === "POST") {
          const body = providerRoutingUpdateRequestSchema.parse(await readBody(req));
          json(res, 200, await writeProviderRouting(routingProjectRoot, body.value));
          return;
        }

        json(res, 405, { message: "Method not allowed" });
      } catch (error) {
        json(res, 500, {
          message:
            error instanceof Error ? error.message : "Unknown provider routing error"
        });
      }
    });

    server.middlewares.use("/api/threadsmith/actions", async (req, res) => {
      if (req.method !== "POST") {
        json(res, 405, { message: "Method not allowed" });
        return;
      }

      try {
        const projectRoot = getProjectRoot(req.url);
        const body = deckActionRequestSchema.parse(await readBody(req));
        if (body.persistenceScope && !body.continuationBehavior) {
          throw new Error("Continuation behavior is required when saving a default");
        }

        if (body.continuationBehavior && body.persistenceScope) {
          await persistContinuationPreference(
            projectRoot,
            body.persistenceScope,
            body.continuationBehavior
          );
        }

        if (body.actionId === "advance-phase") {
          const result = await advancePhaseFromDeck({
            projectRoot,
            continuationBehavior: body.continuationBehavior
          });

          if (result.kind === "unsupported-provider") {
            json(res, 409, { message: result.detail });
            return;
          }

          json(res, 200, await buildBridgeResponse(projectRoot));
          return;
        }

        await appendActionHistoryEntry(projectRoot, {
          id: crypto.randomUUID(),
          actionId: body.actionId,
          createdAt: new Date().toISOString(),
          projectRoot,
          previewAccepted: true,
          continuationBehavior: body.continuationBehavior,
          persistenceScope: body.persistenceScope
        });
        await applyDeckActionState(projectRoot, body.actionId, {
          continuationBehavior: body.continuationBehavior
        });

        json(res, 200, await buildBridgeResponse(projectRoot));
      } catch (error) {
        json(res, 500, {
          message: error instanceof Error ? error.message : "Unknown action error"
        });
      }
    });

    server.middlewares.use("/api/threadsmith/runs", async (req, res) => {
      if (req.method !== "POST") {
        json(res, 405, { message: "Method not allowed" });
        return;
      }

      try {
        const projectRoot = getProjectRoot(req.url);
        const body = runStartRequestSchema.parse(await readBody(req));
        const targetRole = body.role ?? "executor";
        const providerRouting = await loadProviderRouting(projectRoot);
        const targetProvider = resolveRoutedProvider(providerRouting, targetRole);

        if (targetProvider !== "codex") {
          const detail = buildUnsupportedProviderMessage(
            providerRouting,
            targetRole
          );
          const bridgeState = await recordCommandBridgeDispatch(projectRoot, {
            surface: "direct-run",
            sourceActionId: null,
            provider: targetProvider,
            targetRole,
            statusDetail: detail
          });

          if (bridgeState.latestRoute) {
            await recordCommandBridgeFailure(
              projectRoot,
              bridgeState.latestRoute.routeId,
              detail
            );
          }

          json(res, 409, { message: detail });
          return;
        }

        const bridgeState = await recordCommandBridgeDispatch(projectRoot, {
          surface: "direct-run",
          sourceActionId: null,
          provider: "codex",
          targetRole
        });
        try {
          const launched = await startProjectRun({
            projectRoot,
            role: targetRole
          });

          if (bridgeState.latestRoute) {
            await recordCommandBridgeRunStarted(
              projectRoot,
              bridgeState.latestRoute.routeId,
              launched.run
            );
          }

          json(res, 200, {
            projectRoot: launched.projectRoot,
            packet: launched.packet,
            run: launched.run
          });
        } catch (error) {
          if (bridgeState.latestRoute) {
            await recordCommandBridgeFailure(
              projectRoot,
              bridgeState.latestRoute.routeId,
              error instanceof Error ? error.message : "Unknown run error"
            );
          }
          throw error;
        }
      } catch (error) {
        json(res, 500, {
          message: error instanceof Error ? error.message : "Unknown run error"
        });
      }
    });

    server.middlewares.use("/api/threadsmith/init", async (req, res) => {
      if (req.method !== "POST") {
        json(res, 405, { message: "Method not allowed" });
        return;
      }

      try {
        const projectRoot = getProjectRoot(req.url);
        await bootstrapProjectState(projectRoot);

        json(res, 200, await buildBridgeResponse(projectRoot));
      } catch (error) {
        json(res, 500, {
          message: error instanceof Error ? error.message : "Unknown init error"
        });
      }
    });

    server.middlewares.use("/api/threadsmith/project-brief", async (req, res) => {
      if (req.method !== "POST") {
        json(res, 405, { message: "Method not allowed" });
        return;
      }

      try {
        const projectRoot = getProjectRoot(req.url);
        const body = projectBriefUpdateRequestSchema.parse(await readBody(req));

        await writeStateFragment(
          projectRoot,
          STATE_FILES.projectBrief,
          body.value
        );

        json(res, 200, await buildBridgeResponse(projectRoot));
      } catch (error) {
        json(res, 500, {
          message:
            error instanceof Error ? error.message : "Unknown project brief error"
        });
      }
    });

    server.middlewares.use("/api/threadsmith/current-phase", async (req, res) => {
      if (req.method !== "POST") {
        json(res, 405, { message: "Method not allowed" });
        return;
      }

      try {
        const projectRoot = getProjectRoot(req.url);
        const body = currentPhaseUpdateRequestSchema.parse(await readBody(req));

        await writeStateFragment(
          projectRoot,
          STATE_FILES.currentPhase,
          body.value
        );

        json(res, 200, await buildBridgeResponse(projectRoot));
      } catch (error) {
        json(res, 500, {
          message:
            error instanceof Error ? error.message : "Unknown current phase error"
        });
      }
    });

    server.middlewares.use("/api/threadsmith/project-roadmap", async (req, res) => {
      if (req.method !== "POST") {
        json(res, 405, { message: "Method not allowed" });
        return;
      }

      try {
        const projectRoot = getProjectRoot(req.url);
        const body = projectRoadmapUpdateRequestSchema.parse(await readBody(req));

        await writeStateFragment(
          projectRoot,
          STATE_FILES.projectRoadmap,
          body.value
        );

        json(res, 200, await buildBridgeResponse(projectRoot));
      } catch (error) {
        json(res, 500, {
          message:
            error instanceof Error ? error.message : "Unknown project roadmap error"
        });
      }
    });

    server.middlewares.use("/api/threadsmith/project-status", async (req, res) => {
      if (req.method !== "POST") {
        json(res, 405, { message: "Method not allowed" });
        return;
      }

      try {
        const projectRoot = getProjectRoot(req.url);
        const body = projectStatusUpdateRequestSchema.parse(await readBody(req));

        await writeStateFragment(
          projectRoot,
          STATE_FILES.projectStatus,
          body.value
        );

        json(res, 200, await buildBridgeResponse(projectRoot));
      } catch (error) {
        json(res, 500, {
          message:
            error instanceof Error ? error.message : "Unknown project status error"
        });
      }
    });

    server.middlewares.use("/api/threadsmith/project-supervision", async (req, res) => {
      if (req.method !== "POST") {
        json(res, 405, { message: "Method not allowed" });
        return;
      }

      try {
        const projectRoot = getProjectRoot(req.url);
        const body = projectSupervisionUpdateRequestSchema.parse(await readBody(req));

        await writeStateFragment(
          projectRoot,
          STATE_FILES.projectSupervision,
          body.value
        );

        json(res, 200, await buildBridgeResponse(projectRoot));
      } catch (error) {
        json(res, 500, {
          message:
            error instanceof Error
              ? error.message
              : "Unknown project supervision error"
        });
      }
    });

    server.middlewares.use("/api/threadsmith/acceptance-state", async (req, res) => {
      if (req.method !== "POST") {
        json(res, 405, { message: "Method not allowed" });
        return;
      }

      try {
        const projectRoot = getProjectRoot(req.url);
        const body = acceptanceStateUpdateRequestSchema.parse(await readBody(req));

        await writeStateFragment(
          projectRoot,
          STATE_FILES.acceptanceState,
          body.value
        );

        json(res, 200, await buildBridgeResponse(projectRoot));
      } catch (error) {
        json(res, 500, {
          message:
            error instanceof Error
              ? error.message
              : "Unknown acceptance state error"
        });
      }
    });

    server.middlewares.use("/api/threadsmith/phase-reset", async (req, res) => {
      if (req.method !== "POST") {
        json(res, 405, { message: "Method not allowed" });
        return;
      }

      try {
        const projectRoot = getProjectRoot(req.url);
        const body = phaseResetRequestSchema.parse(await readBody(req));
        await applyPhaseReset(projectRoot, body.value);
        json(res, 200, await buildBridgeResponse(projectRoot));
      } catch (error) {
        json(res, 500, {
          message:
            error instanceof Error ? error.message : "Unknown phase reset error"
        });
      }
    });

    server.middlewares.use("/api/threadsmith/transitions", async (req, res) => {
      if (req.method !== "POST") {
        json(res, 405, { message: "Method not allowed" });
        return;
      }

      try {
        const projectRoot = getProjectRoot(req.url);
        const body = workflowTransitionRequestSchema.parse(await readBody(req));
        await applyWorkflowTransition(projectRoot, body.transitionId);
        json(res, 200, { ok: true });
      } catch (error) {
        json(res, 500, {
          message:
            error instanceof Error ? error.message : "Unknown transition error"
        });
      }
    });
  }
};

export default defineConfig({
  define: {
    "import.meta.env.VITE_THREADSMITH_SELF_PROJECT_ROOT": JSON.stringify(
      selfHostedProjectRootAvailable ? selfHostedProjectRoot : ""
    ),
    "import.meta.env.VITE_THREADSMITH_FRESH_DEMO_PROJECT_ROOT": JSON.stringify(
      defaultProjectRoot
    ),
    "import.meta.env.VITE_THREADSMITH_STALE_PACKET_DEMO_PROJECT_ROOT":
      JSON.stringify(stalePacketProjectRoot)
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: manualControlDeckChunks
      }
    }
  },
  plugins: [react(), tailwindcss(), threadsmithApiPlugin],
  server: {
    host: "127.0.0.1",
    port: 4173
  },
  test: {
    environment: "jsdom",
    setupFiles: []
  }
});
