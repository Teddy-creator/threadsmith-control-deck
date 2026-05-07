export type Tone = "green" | "amber" | "red" | "blue" | "zinc";

function trimSecondaryDetail(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+(?:Packet|packet|Evidence|evidence|Artifact|artifact)\s*[：:].*$/u, "")
    .trim();
}

export function compactText(text: string | null | undefined, maxLength = 96) {
  if (!text) {
    return "";
  }

  const normalized = trimSecondaryDetail(text);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(maxLength - 1, 1)).trimEnd()}…`;
}

export function formatProviderLabel(provider: string | null | undefined) {
  switch (provider) {
    case "codex":
      return "Codex";
    case "claude":
      return "Claude";
    default:
      return "未指定";
  }
}

export function formatCollaborationThreadLabel(role: string) {
  switch (role) {
    case "planner":
      return "Conductor";
    case "executor":
      return "Builder";
    case "reviewer":
      return "Critic";
    case "verifier":
      return "Verifier";
    case "closeout":
      return "Closeout";
    default:
      return "Hygiene";
  }
}
