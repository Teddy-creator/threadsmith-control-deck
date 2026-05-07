const bootstrapGoalPattern = /^让\s+(.+?)\s+接入 Threadsmith 工作流$/;

export function isBootstrapProjectGoal(projectGoal: string) {
  return bootstrapGoalPattern.test(projectGoal.trim());
}

export function formatHeadlineProject(
  projectGoal: string,
  projectName?: string
) {
  if (projectName && isBootstrapProjectGoal(projectGoal)) {
    return projectName;
  }

  return projectGoal;
}

export function formatHeadlineSupport(
  projectGoal: string,
  projectName?: string
) {
  if (projectName && isBootstrapProjectGoal(projectGoal)) {
    return "当前目标：接入 Threadsmith 工作流";
  }

  return null;
}

export function formatDoneWhenSummary(completedCount: number, totalCount: number) {
  return `${completedCount}/${totalCount}`;
}
