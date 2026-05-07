import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const e2ePort = process.env.THREADSMITH_E2E_PORT ?? "4174";
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;
process.env.THREADSMITH_CODEX_BIN ??= resolve(
  process.cwd(),
  "tests/e2e/fixtures/fake-codex.js"
);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: e2eBaseUrl,
    trace: "on-first-retry"
  },
  webServer: {
    command:
      `npm run dev --workspace @threadsmith/control-deck -- --host 127.0.0.1 --port ${e2ePort}`,
    url: e2eBaseUrl,
    reuseExistingServer: process.env.THREADSMITH_REUSE_E2E_SERVER === "1",
    timeout: 30_000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
