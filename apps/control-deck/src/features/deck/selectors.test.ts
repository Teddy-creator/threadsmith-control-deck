import { describe, expect, it } from "vitest";
import {
  formatHeadlineProject,
  formatHeadlineSupport,
  isBootstrapProjectGoal
} from "./selectors";

describe("selectors", () => {
  it("detects bootstrap project goals", () => {
    expect(isBootstrapProjectGoal("让 live-project 接入 Threadsmith 工作流")).toBe(true);
    expect(isBootstrapProjectGoal("Ship Threadsmith v1")).toBe(false);
  });

  it("uses project name as the headline for bootstrap goals", () => {
    expect(
      formatHeadlineProject(
        "让 live-project 接入 Threadsmith 工作流",
        "live-project"
      )
    ).toBe("live-project");
  });

  it("keeps authored goals as the headline", () => {
    expect(
      formatHeadlineProject(
        "让 PromptPet-AR 交付第一版可用工作流",
        "PromptPet-AR"
      )
    ).toBe("让 PromptPet-AR 交付第一版可用工作流");
  });

  it("returns a compact support line for bootstrap goals", () => {
    expect(
      formatHeadlineSupport(
        "让 live-project 接入 Threadsmith 工作流",
        "live-project"
      )
    ).toBe("当前目标：接入 Threadsmith 工作流");
    expect(formatHeadlineSupport("Ship Threadsmith v1", "Threadsmith")).toBeNull();
  });
});
