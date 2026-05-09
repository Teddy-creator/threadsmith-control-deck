import { describe, expect, it } from "vitest";
import {
  buildEvidenceSummary,
  toContextPacketEvidence
} from "./evidenceSummary.ts";

describe("buildEvidenceSummary", () => {
  it("summarizes passing verification commands and artifact refs", () => {
    const summary = buildEvidenceSummary({
      generatedAt: "2026-05-09T14:30:00.000Z",
      commands: [
        {
          command: "npm run test",
          status: "passed",
          summary: "217 tests passed.",
          exitCode: 0,
          durationMs: 2400,
          artifactRefs: [".threadsmith/evidence/test-summary.md"]
        },
        {
          command: "npm run build",
          status: "passed",
          summary: "Production build succeeded.",
          exitCode: 0,
          durationMs: 900
        }
      ],
      artifactRefs: [
        {
          path: "playwright-report/index.html",
          kind: "report",
          description: "Smoke e2e HTML report."
        }
      ]
    });

    expect(summary.summaryId).toBe("ev-verification-20260509T143000000Z");
    expect(summary.status).toBe("passed");
    expect(summary.headline).toBe("Verification evidence passed");
    expect(summary.detail).toContain("2 passed");
    expect(summary.failureFocus).toBeNull();
    expect(summary.artifactRefs[0]?.path).toBe("playwright-report/index.html");
  });

  it("captures the first failure focus without copying raw logs", () => {
    const summary = buildEvidenceSummary({
      generatedAt: "2026-05-09T14:31:00.000Z",
      commands: [
        {
          command: "npm run test:e2e",
          status: "failed",
          summary: "homepage.spec.ts failed.",
          exitCode: 1,
          failureFocus: "Expected project summary text was not visible.",
          artifactRefs: ["test-results/homepage/error-context.md"]
        }
      ]
    });

    expect(summary.status).toBe("failed");
    expect(summary.failureFocus).toBe(
      "Expected project summary text was not visible."
    );
    expect(JSON.stringify(summary)).not.toContain("full stdout");
  });

  it("marks mixed evidence when only some commands fail", () => {
    const summary = buildEvidenceSummary({
      generatedAt: "2026-05-09T14:32:00.000Z",
      commands: [
        {
          command: "npm run test",
          status: "passed",
          summary: "All unit tests passed."
        },
        {
          command: "npm run test:e2e",
          status: "failed",
          summary: "One smoke test failed."
        }
      ]
    });

    expect(summary.status).toBe("mixed");
    expect(summary.failureFocus).toBe("One smoke test failed.");
  });

  it("degrades to an empty summary when no evidence exists", () => {
    const summary = buildEvidenceSummary({
      generatedAt: "2026-05-09T14:33:00.000Z"
    });

    expect(summary.status).toBe("empty");
    expect(summary.source).toBe("empty");
    expect(summary.commands).toEqual([]);
    expect(summary.detail).toContain("No verification commands");
  });
});

describe("toContextPacketEvidence", () => {
  it("converts structured evidence into compact context packet evidence", () => {
    const summary = buildEvidenceSummary({
      generatedAt: "2026-05-09T14:34:00.000Z",
      commands: [
        {
          command: "npm run test",
          status: "passed",
          summary: "All workspace tests passed.",
          artifactRefs: [".threadsmith/evidence/test-summary.md"]
        }
      ],
      artifactRefs: [
        {
          path: "playwright-report/index.html",
          kind: "report",
          description: "Playwright report."
        }
      ]
    });

    const evidence = toContextPacketEvidence(summary);

    expect(evidence.status).toBe("ready");
    expect(evidence.commands[0]).toEqual({
      command: "npm run test",
      status: "passed",
      summary: "All workspace tests passed."
    });
    expect(evidence.artifactRefs).toEqual([
      "playwright-report/index.html",
      ".threadsmith/evidence/test-summary.md"
    ]);
  });
});
