import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const launchers = [
  "Launch-Threadsmith.ps1",
  "Open-Threadsmith-App.ps1"
];

const pwsh = process.env.THREADSMITH_PWSH_BIN || "pwsh";
const pwshVersion = spawnSync(pwsh, ["-NoLogo", "-NoProfile", "-Command", "$PSVersionTable.PSVersion.ToString()"], {
  encoding: "utf8"
});

if (pwshVersion.error || pwshVersion.status !== 0) {
  console.log("PowerShell launcher syntax check skipped: pwsh was not found.");
  console.log("Install PowerShell 7+ or set THREADSMITH_PWSH_BIN to enable local .ps1 validation.");
  process.exit(0);
}

console.log(`PowerShell detected: ${pwshVersion.stdout.trim()}`);

for (const launcher of launchers) {
  if (!existsSync(launcher)) {
    console.error(`Missing launcher: ${launcher}`);
    process.exit(1);
  }

  const result = spawnSync(
    pwsh,
    [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `$tokens = $null; $errors = $null; $null = [System.Management.Automation.Language.Parser]::ParseFile('${launcher}', [ref]$tokens, [ref]$errors); if ($errors.Count -gt 0) { $errors | ForEach-Object { Write-Error $_ }; exit 1 }`
    ],
    {
      encoding: "utf8"
    }
  );

  if (result.status !== 0) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  console.log(`PowerShell syntax OK: ${launcher}`);
}

const dryRun = spawnSync(
  pwsh,
  [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-File",
    "Launch-Threadsmith.ps1"
  ],
  {
    encoding: "utf8",
    env: {
      ...process.env,
      THREADSMITH_DRY_RUN: "1",
      THREADSMITH_SKIP_OPEN: "1"
    }
  }
);

if (dryRun.status !== 0) {
  process.stdout.write(dryRun.stdout);
  process.stderr.write(dryRun.stderr);
  process.exit(dryRun.status ?? 1);
}

console.log("PowerShell dry run OK: Launch-Threadsmith.ps1");
