#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function getFlagValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function extractPromptField(prompt, label, fallback) {
  const match = prompt.match(new RegExp(`^${label}:\\s*(.+)$`, "m"));
  return match?.[1]?.trim() || fallback;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readScenario(projectRoot) {
  const scenarioPath = join(projectRoot, "threadsmith-fake-codex-scenario.json");

  if (!(await exists(scenarioPath))) {
    return null;
  }

  const parsed = JSON.parse(await readFile(scenarioPath, "utf8"));
  const steps = Array.isArray(parsed?.steps) ? parsed.steps : [];
  const cursor =
    Number.isInteger(parsed?.cursor) && parsed.cursor >= 0 ? parsed.cursor : 0;

  return {
    scenarioPath,
    scenario: {
      cursor,
      steps
    }
  };
}

async function writeScenarioState(scenarioPath, scenario) {
  await writeFile(scenarioPath, `${JSON.stringify(scenario, null, 2)}\n`, "utf8");
}

function defaultSummary(role, outcome) {
  if (outcome === "failed") {
    return `Fake Codex simulated a ${role} failure for the autopilot flow.`;
  }

  return `Fake Codex completed the ${role} step for the autopilot flow.`;
}

async function buildLegacyResult({
  projectRoot,
  runId,
  role,
  provider,
  targetMarker
}) {
  const smokeTargetPath = join(projectRoot, "smoke-target.txt");
  const modePath = join(projectRoot, "threadsmith-fake-codex-mode.txt");
  const mode =
    (await exists(modePath))
      ? (await readFile(modePath, "utf8")).trim().toLowerCase()
      : "success";

  const changedFiles = [];
  const verification = [];
  const evidenceRefs = [];

  if (mode !== "fail" && (await exists(smokeTargetPath))) {
    await writeFile(smokeTargetPath, `${targetMarker}\n`, "utf8");
    changedFiles.push(relative(projectRoot, smokeTargetPath).replace(/\\/g, "/"));
    verification.push({
      command: "sed -n '1,40p' smoke-target.txt",
      status: "passed"
    });
    evidenceRefs.push("smoke-target.txt");
  } else if (await exists(smokeTargetPath)) {
    verification.push({
      command: "sed -n '1,40p' smoke-target.txt",
      status: "failed"
    });
    evidenceRefs.push("smoke-target.txt");
  }

  return {
    runId,
    role,
    provider,
    outcome: mode === "fail" ? "failed" : "succeeded",
    summary:
      mode === "fail"
        ? "Fake Codex simulated an executor failure for the bridge e2e flow."
        : "Fake Codex updated smoke-target.txt and returned a structured executor result for the bridge e2e flow.",
    changedFiles,
    verification,
    evidenceRefs
  };
}

async function buildScenarioResult({
  projectRoot,
  runId,
  role,
  provider,
  targetMarker
}) {
  const loaded = await readScenario(projectRoot);

  if (!loaded) {
    return null;
  }

  const { scenarioPath, scenario } = loaded;
  const step = scenario.steps[scenario.cursor];

  if (!step) {
    return {
      runId,
      role,
      provider,
      outcome: "failed",
      summary: `Fake Codex has no scripted step left for ${role}.`,
      changedFiles: [],
      verification: [],
      evidenceRefs: [],
      blocker: `No scripted step left for ${role}.`
    };
  }

  if (step.role && step.role !== role) {
    return {
      runId,
      role,
      provider,
      outcome: "failed",
      summary: `Fake Codex expected ${step.role} but received ${role}.`,
      changedFiles: [],
      verification: [],
      evidenceRefs: [],
      blocker: `Scenario out of order: expected ${step.role}, got ${role}.`
    };
  }

  scenario.cursor += 1;
  await writeScenarioState(scenarioPath, scenario);

  const result = step.result && typeof step.result === "object" ? step.result : {};
  const smokeTargetPath = join(projectRoot, "smoke-target.txt");
  const shouldWriteSmokeTarget =
    role === "executor" &&
    result.outcome !== "failed" &&
    result.writeSmokeTarget !== false &&
    (await exists(smokeTargetPath));

  const changedFiles = Array.isArray(result.changedFiles)
    ? [...result.changedFiles]
    : [];
  const verification = Array.isArray(result.verification)
    ? [...result.verification]
    : [];
  const evidenceRefs = Array.isArray(result.evidenceRefs)
    ? [...result.evidenceRefs]
    : [];

  if (shouldWriteSmokeTarget) {
    await writeFile(smokeTargetPath, `${targetMarker}\n`, "utf8");
    const relativeSmokeTargetPath = relative(projectRoot, smokeTargetPath).replace(/\\/g, "/");

    if (!changedFiles.includes(relativeSmokeTargetPath)) {
      changedFiles.push(relativeSmokeTargetPath);
    }

    if (!verification.some((item) => item?.command === "sed -n '1,40p' smoke-target.txt")) {
      verification.push({
        command: "sed -n '1,40p' smoke-target.txt",
        status: "passed"
      });
    }

    if (!evidenceRefs.includes("smoke-target.txt")) {
      evidenceRefs.push("smoke-target.txt");
    }
  }

  return {
    runId,
    role,
    provider,
    outcome: typeof result.outcome === "string" ? result.outcome : "succeeded",
    decision: typeof result.decision === "string" ? result.decision : undefined,
    pauseRecommendation:
      result.pauseRecommendation && typeof result.pauseRecommendation === "object"
        ? result.pauseRecommendation
        : undefined,
    riskHits: Array.isArray(result.riskHits) ? result.riskHits : undefined,
    summary:
      typeof result.summary === "string"
        ? result.summary
        : defaultSummary(role, result.outcome === "failed" ? "failed" : "succeeded"),
    changedFiles,
    verification,
    evidenceRefs,
    blocker: typeof result.blocker === "string" ? result.blocker : undefined
  };
}

async function main() {
  const projectRoot = getFlagValue("--cd") ?? process.cwd();
  const resultPath = getFlagValue("--output-last-message");

  if (!resultPath) {
    console.error("fake-codex: missing --output-last-message");
    process.exit(1);
  }

  const prompt = await readStdin();
  const runId = extractPromptField(prompt, "Run ID", "fake-run");
  const role = extractPromptField(prompt, "Role", "executor");
  const provider = extractPromptField(prompt, "Provider", "codex");
  const targetMarker =
    prompt.match(/THREADSMITH_SMOKE_OK/)?.[0] ?? "THREADSMITH_SMOKE_OK";
  const result =
    (await buildScenarioResult({
      projectRoot,
      runId,
      role,
      provider,
      targetMarker
    })) ??
    (await buildLegacyResult({
      projectRoot,
      runId,
      role,
      provider,
      targetMarker
    }));

  await mkdir(dirname(resultPath), { recursive: true });
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  const outputSchemaPath = getFlagValue("--output-schema");
  if (outputSchemaPath && (await exists(outputSchemaPath))) {
    await readFile(outputSchemaPath, "utf8");
  }

  process.stdout.write("fake-codex completed\n");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
