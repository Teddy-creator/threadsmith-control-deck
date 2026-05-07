import { describe, expect, it } from "vitest";
import { alignProjectRoadmapToStatus, projectRoadmapSchema } from "./projectRoadmap";

describe("alignProjectRoadmapToStatus", () => {
  it("realigns milestone states from project-status pointers", () => {
    const roadmap = projectRoadmapSchema.parse({
      versionLabel: "Threadsmith v1",
      finalGoal: "Ship a working mission control product",
      milestones: [
        {
          id: "definition",
          label: "产品定义",
          title: "定义产品方向",
          summary: "明确边界。",
          state: "current"
        },
        {
          id: "workflow-driven-development",
          label: "实战工作流",
          title: "完成 self-host smoke",
          summary: "验证自举闭环。",
          state: "next"
        },
        {
          id: "real-roadmap-truth",
          label: "真实 roadmap",
          title: "让 roadmap 绑定项目真相",
          summary: "使用 milestone pointers。",
          state: "later"
        },
        {
          id: "command-bridge",
          label: "指令桥接",
          title: "继续收口 bridge 体验",
          summary: "减少 operator friction。",
          state: "later"
        }
      ],
      updatedAt: null
    });

    const aligned = alignProjectRoadmapToStatus(roadmap, {
      currentMilestoneId: "real-roadmap-truth",
      nextMilestoneId: "command-bridge",
      overallState: "in-progress",
      updatedAt: "2026-04-09T00:00:00.000Z"
    });

    expect(aligned.milestones.map((item) => item.state)).toEqual([
      "done",
      "done",
      "current",
      "next"
    ]);
    expect(aligned.updatedAt).toBe("2026-04-09T00:00:00.000Z");
  });

  it("marks the pointed milestone as blocked when project status is blocked", () => {
    const roadmap = projectRoadmapSchema.parse({
      versionLabel: "Threadsmith v1",
      finalGoal: "Ship a working mission control product",
      milestones: [
        {
          id: "workflow-driven-development",
          label: "实战工作流",
          title: "完成 self-host smoke",
          summary: "验证自举闭环。",
          state: "current"
        },
        {
          id: "real-roadmap-truth",
          label: "真实 roadmap",
          title: "让 roadmap 绑定项目真相",
          summary: "使用 milestone pointers。",
          state: "next"
        }
      ],
      updatedAt: null
    });

    const aligned = alignProjectRoadmapToStatus(roadmap, {
      currentMilestoneId: "workflow-driven-development",
      nextMilestoneId: "real-roadmap-truth",
      overallState: "blocked",
      updatedAt: null
    });

    expect(aligned.milestones[0]?.state).toBe("blocked");
    expect(aligned.milestones[1]?.state).toBe("next");
  });
});
