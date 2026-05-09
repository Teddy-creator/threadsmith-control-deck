import { describe, expect, it } from "vitest";
import {
  APP_HOME_PROJECT_ROOT,
  FRESH_DEMO_PROJECT_ROOT,
  STALE_PACKET_DEMO_PROJECT_ROOT,
  buildSearchForProjectSelection,
  getDemoProjectSelection,
  getPresetProjectSelection,
  resolveInitialProjectSelection,
  resolveProjectSelectionFromRoot
} from "./projectRoots";

describe("resolveInitialProjectSelection", () => {
  it("defaults to the fresh demo fixture when no self-host default exists", () => {
    expect(resolveInitialProjectSelection({ search: "" })).toMatchObject({
      sourceId: "fresh-demo",
      label: "Demo：已收口项目",
      projectRoot: FRESH_DEMO_PROJECT_ROOT
    });
  });

  it("defaults to the self-host project when a committed project root is provided", () => {
    expect(
      resolveInitialProjectSelection({
        search: "",
        defaultProjectRoot: "/tmp/threadsmith-self"
      })
    ).toMatchObject({
      sourceId: "custom-project",
      label: "自定义项目",
      projectRoot: "/tmp/threadsmith-self"
    });
  });

  it("prefers the stored daily-entry project before the self-host fallback", () => {
    expect(
      resolveInitialProjectSelection({
        search: "",
        preferredProjectRoot: "/tmp/daily-project",
        defaultProjectRoot: "/tmp/threadsmith-self"
      })
    ).toMatchObject({
      sourceId: "custom-project",
      label: "自定义项目",
      projectRoot: "/tmp/daily-project"
    });
  });

  it("switches to the stale demo fixture from the query string", () => {
    expect(
      resolveInitialProjectSelection({ search: "?demoFixture=stale-packet" })
    ).toMatchObject({
      sourceId: "stale-packet-demo",
      label: "Demo：过期交接点",
      projectRoot: STALE_PACKET_DEMO_PROJECT_ROOT
    });
  });

  it("lets a demo query override the self-host default project", () => {
    expect(
      resolveInitialProjectSelection({
        search: "?demoFixture=stale-packet",
        defaultProjectRoot: "/tmp/threadsmith-self"
      })
    ).toMatchObject({
      sourceId: "stale-packet-demo",
      label: "Demo：过期交接点",
      projectRoot: STALE_PACKET_DEMO_PROJECT_ROOT
    });
  });

  it("treats an explicit custom projectRoot as a custom project", () => {
    expect(
      resolveInitialProjectSelection({
        search: "?demoFixture=stale-packet&projectRoot=/tmp/custom-project"
      })
    ).toMatchObject({
      sourceId: "custom-project",
      label: "自定义项目",
      projectRoot: "/tmp/custom-project"
    });
  });

  it("lets an explicit custom projectRoot query override the stored daily-entry project", () => {
    expect(
      resolveInitialProjectSelection({
        search: "?projectRoot=/tmp/query-project",
        preferredProjectRoot: "/tmp/daily-project",
        defaultProjectRoot: "/tmp/threadsmith-self"
      })
    ).toMatchObject({
      sourceId: "custom-project",
      label: "自定义项目",
      projectRoot: "/tmp/query-project"
    });
  });

  it("resolves the app-home route before daily-entry and self-host fallback", () => {
    expect(
      resolveInitialProjectSelection({
        search: "?appHome=1",
        preferredProjectRoot: "/tmp/daily-project",
        defaultProjectRoot: "/tmp/threadsmith-self"
      })
    ).toMatchObject({
      sourceId: "app-home",
      label: "前门入口",
      projectRoot: APP_HOME_PROJECT_ROOT
    });
  });

  it("prefers app-home when the saved entry mode is app-home", () => {
    expect(
      resolveInitialProjectSelection({
        search: "",
        preferredEntryMode: "app-home",
        preferredProjectRoot: "/tmp/daily-project",
        defaultProjectRoot: "/tmp/threadsmith-self"
      })
    ).toMatchObject({
      sourceId: "app-home",
      projectRoot: APP_HOME_PROJECT_ROOT
    });
  });

  it("prefers the saved project path when the saved entry mode is direct-project", () => {
    expect(
      resolveInitialProjectSelection({
        search: "",
        preferredEntryMode: "direct-project",
        preferredProjectRoot: "/tmp/daily-project",
        defaultProjectRoot: "/tmp/threadsmith-self"
      })
    ).toMatchObject({
      sourceId: "custom-project",
      projectRoot: "/tmp/daily-project"
    });
  });

  it("falls back to app-home when direct-project mode has nothing to open", () => {
    expect(
      resolveInitialProjectSelection({
        search: "",
        preferredEntryMode: "direct-project"
      })
    ).toMatchObject({
      sourceId: "app-home",
      projectRoot: APP_HOME_PROJECT_ROOT
    });
  });

  it("maps known env roots back to their demo source instead of custom", () => {
    expect(
      resolveInitialProjectSelection({
        envProjectRoot: STALE_PACKET_DEMO_PROJECT_ROOT,
        defaultProjectRoot: "/tmp/threadsmith-self",
        search: "?demoFixture=stale-packet"
      })
    ).toMatchObject({
      sourceId: "stale-packet-demo",
      projectRoot: STALE_PACKET_DEMO_PROJECT_ROOT
    });
  });
});

describe("buildSearchForProjectSelection", () => {
  it("serializes the stale demo selection into a shareable query string", () => {
    expect(
      buildSearchForProjectSelection(getDemoProjectSelection("stale-packet-demo"))
    ).toBe("?demoFixture=stale-packet");
  });

  it("clears demo-specific params for the fresh default while preserving unrelated ones", () => {
    expect(
      buildSearchForProjectSelection(
        getDemoProjectSelection("fresh-demo"),
        "?tab=acceptance&demoFixture=stale-packet"
      )
    ).toBe("?tab=acceptance");
  });

  it("keeps custom project roots shareable", () => {
    expect(
      buildSearchForProjectSelection(
        resolveProjectSelectionFromRoot("/tmp/custom-project"),
        "?tab=acceptance"
      )
    ).toBe("?tab=acceptance&projectRoot=%2Ftmp%2Fcustom-project");
  });

  it("serializes the app-home selection without exposing its fixture root", () => {
    expect(
      buildSearchForProjectSelection(
        getPresetProjectSelection("app-home"),
        "?tab=project&projectRoot=%2Ftmp%2Fold-project"
      )
    ).toBe("?tab=project&appHome=1");
  });
});
