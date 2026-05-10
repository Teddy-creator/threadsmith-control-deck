import { resolve } from "node:path";
import {
  readLatestPhaseRun,
  readPhasePause
} from "@threadsmith/fs-bridge";
import {
  buildAutopilotCliCommand,
  bootstrapProjectState,
  decideAutopilotContinuation,
  describeAutopilotContinuationDecision,
  resumeAutopilotPhaseRun,
  startAutopilotPhaseRun
} from "@threadsmith/orchestrator";

function usage() {
  console.error(
    [
      "Usage:",
      "  npm run threadsmith:autopilot -- start <project-root>",
      "  npm run threadsmith:autopilot -- resume <project-root>",
      "  npm run threadsmith:autopilot -- continue <project-root>",
      "  npm run threadsmith:autopilot -- status <project-root>"
    ].join("\n")
  );
}

function printBridgeStatus(args: {
  bootstrap: Awaited<ReturnType<typeof bootstrapProjectState>>;
  projectRoot: string;
  latestPhaseRun: Awaited<ReturnType<typeof readLatestPhaseRun>>;
  latestPause: Awaited<ReturnType<typeof readPhasePause>>;
}) {
  const decision = decideAutopilotContinuation({
    projectRoot: args.projectRoot,
    bootstrap: args.bootstrap,
    latestPhaseRun: args.latestPhaseRun,
    latestPhasePause: args.latestPause
  });

  console.log(`Recommended action: ${decision.action}`);
  console.log(`Summary: ${decision.headline}`);
  console.log(`Detail: ${decision.detail}`);
  console.log(`Continuous mode: ${describeAutopilotContinuationDecision(decision)}`);
  if (decision.recommendedCommand) {
    console.log(`Recommended command: ${decision.recommendedCommand}`);
  }

  return decision;
}

async function main() {
  const [command, projectRootArg] = process.argv.slice(2);

  if (
    !command ||
    !projectRootArg ||
    !["start", "resume", "continue", "status"].includes(command)
  ) {
    usage();
    process.exitCode = 1;
    return;
  }

  const projectRoot = resolve(projectRootArg);
  const bootstrap = await bootstrapProjectState(projectRoot);

  console.log(`Threadsmith autopilot ${command}`);
  console.log(`Project: ${projectRoot}`);
  console.log(`Bootstrap: ${bootstrap.kind}`);
  console.log(`Project label: ${bootstrap.state.projectStatus.projectLabel}`);
  console.log(`Phase: ${bootstrap.state.currentPhase.phaseName}`);

  if (bootstrap.kind === "paused") {
    console.log("Status: paused-before-run");
    console.log(bootstrap.summary);
    for (const item of bootstrap.missingInfo) {
      console.log(`Missing info: ${item}`);
    }
    return;
  }

  if (command === "resume" && bootstrap.kind === "bootstrapped") {
    console.log("Status: bootstrap-complete");
    console.log("当前还没有可恢复的 paused phase run；请先使用 start。");
    return;
  }

  const latestBeforeRun = await readLatestPhaseRun(projectRoot);
  const latestPauseBeforeRun =
    latestBeforeRun ? await readPhasePause(projectRoot, latestBeforeRun.phaseRunId) : null;

  if (command === "status") {
    printBridgeStatus({
      bootstrap,
      projectRoot,
      latestPhaseRun: latestBeforeRun,
      latestPause: latestPauseBeforeRun
    });
    return;
  }

  if (command === "continue") {
    const decision = printBridgeStatus({
      bootstrap,
      projectRoot,
      latestPhaseRun: latestBeforeRun,
      latestPause: latestPauseBeforeRun
    });

    if (decision.action === "wait" || decision.action === "reset-needed") {
      return;
    }

    const resolvedCommand = decision.action === "resume" ? "resume" : "start";
    console.log(`Resolved command: ${resolvedCommand}`);
  }

  const effectiveCommand =
    command === "continue"
      ? decideAutopilotContinuation({
          projectRoot,
          bootstrap,
          latestPhaseRun: latestBeforeRun,
          latestPhasePause: latestPauseBeforeRun
        }).action === "resume"
        ? "resume"
        : "start"
      : command;

  const phaseRun =
    effectiveCommand === "start"
      ? await startAutopilotPhaseRun({ projectRoot })
      : await resumeAutopilotPhaseRun({ projectRoot });

  const latestPause =
    phaseRun.status === "paused"
      ? await readPhasePause(projectRoot, phaseRun.phaseRunId)
      : null;
  const latestPhaseRun = await readLatestPhaseRun(projectRoot);

  console.log(`Phase run: ${phaseRun.phaseRunId}`);
  console.log(`Status: ${phaseRun.status}`);
  console.log(`Current role: ${phaseRun.currentRole ?? "none"}`);
  console.log(`Repair count: ${phaseRun.repairCount}`);
  console.log(`Latest successful role: ${phaseRun.latestSuccessfulRole ?? "none"}`);
  console.log(`Latest run ref: ${latestPhaseRun?.latestRunRef ?? "none"}`);

  if (latestPause) {
    console.log(`Pause: ${latestPause.summary}`);
    console.log(`Resume hint: ${latestPause.recommendedPrompt}`);
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
