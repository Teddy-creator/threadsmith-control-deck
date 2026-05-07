import { describe, expect, it } from "vitest";
import { createPreferences, resolveContinuationBehavior } from "./preferences.ts";

describe("resolveContinuationBehavior", () => {
  it("prefers the project default over the global default", () => {
    const resolved = resolveContinuationBehavior(
      "return-current-thread",
      "smart-continuation"
    );

    expect(resolved.continuationBehavior).toBe("return-current-thread");
    expect(resolved.continuationBehaviorSource).toBe("project-default");
  });

  it("falls back to ask every time when no defaults exist", () => {
    const resolved = createPreferences(null, null);

    expect(resolved.resolved.continuationBehavior).toBe("ask-every-time");
    expect(resolved.resolved.continuationBehaviorSource).toBe("fallback");
  });
});
