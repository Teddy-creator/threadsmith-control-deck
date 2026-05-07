import { describe, expect, it } from "vitest";
import {
  buildProjectIdentity,
  getProjectDisplayName
} from "./projectIdentity";

describe("projectIdentity", () => {
  it("derives the leaf folder as the display name", () => {
    expect(getProjectDisplayName("/workspace/Threadsmith")).toBe(
      "Threadsmith"
    );
  });

  it("trims whitespace and trailing separators", () => {
    expect(getProjectDisplayName(" /tmp/demo-project/ ")).toBe("demo-project");
    expect(getProjectDisplayName("C:\\Code\\PromptPet\\")).toBe("PromptPet");
  });

  it("falls back when the path is empty", () => {
    expect(getProjectDisplayName("   ", "当前项目")).toBe("当前项目");
  });

  it("builds a reusable name and path pair", () => {
    expect(buildProjectIdentity("/tmp/recent-alpha")).toEqual({
      name: "recent-alpha",
      path: "/tmp/recent-alpha"
    });
  });

  it("allows a preferred display name override", () => {
    expect(
      buildProjectIdentity("/tmp/threadsmith-app-home", "当前项目", "Threadsmith front door")
    ).toEqual({
      name: "Threadsmith front door",
      path: "/tmp/threadsmith-app-home"
    });
  });
});
