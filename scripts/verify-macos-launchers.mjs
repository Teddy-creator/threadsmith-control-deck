import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

if (process.platform === "win32") {
  console.log("macOS launcher check skipped on Windows.");
  process.exit(0);
}

const zsh = process.env.THREADSMITH_ZSH_BIN || "zsh";
const launchers = [
  "Launch-Threadsmith.command",
  "Open-Threadsmith-App.command"
];

const zshVersion = spawnSync(zsh, ["--version"], { encoding: "utf8" });

if (zshVersion.error || zshVersion.status !== 0) {
  console.log("macOS launcher check skipped: zsh was not found.");
  console.log("Install zsh or set THREADSMITH_ZSH_BIN to enable .command validation.");
  process.exit(0);
}

for (const launcher of launchers) {
  if (!existsSync(launcher)) {
    console.error(`Missing launcher: ${launcher}`);
    process.exit(1);
  }

  const syntax = spawnSync(zsh, ["-n", launcher], { encoding: "utf8" });
  if (syntax.status !== 0) {
    process.stdout.write(syntax.stdout);
    process.stderr.write(syntax.stderr);
    process.exit(syntax.status ?? 1);
  }

  console.log(`zsh syntax OK: ${launcher}`);
}

for (const launcher of launchers) {
  const dryRun = spawnSync(zsh, [launcher], {
    encoding: "utf8",
    env: {
      ...process.env,
      THREADSMITH_DRY_RUN: "1",
      THREADSMITH_SKIP_OPEN: "1"
    }
  });

  if (dryRun.status !== 0) {
    process.stdout.write(dryRun.stdout);
    process.stderr.write(dryRun.stderr);
    process.exit(dryRun.status ?? 1);
  }

  console.log(`zsh dry run OK: ${launcher}`);
}

