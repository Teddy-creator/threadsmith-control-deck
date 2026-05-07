export const APP_HOME_PROJECT_ROOT = "threadsmith://app-home";

export function isAppHomeProjectRoot(projectRoot: string | null | undefined) {
  return projectRoot === APP_HOME_PROJECT_ROOT;
}
