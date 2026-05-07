import type { AcceptanceItem, Tone } from "./types";

export function pill(kind: Tone, text: string) {
  const className =
    kind === "green"
      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
      : kind === "amber"
        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
        : kind === "red"
          ? "bg-red-500/10 text-red-400 border border-red-500/20"
          : kind === "blue"
            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
            : "bg-zinc-800/80 text-zinc-400 border border-zinc-700/80";

  return (
    <span
      className={`inline-flex min-h-7 shrink-0 items-center justify-center whitespace-nowrap rounded-md px-2.5 py-1 text-xs leading-none ${className}`}
    >
      {text}
    </span>
  );
}

export const purpleMetaTagClass =
  "inline-flex min-h-7 shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-purple-500/10 px-2.5 py-1 text-xs leading-none text-purple-300";

export function formatAcceptanceStatus(status: AcceptanceItem["status"]) {
  switch (status) {
    case "pass":
      return "已验收";
    case "running":
      return "进行中";
    case "failed":
      return "未通过";
    default:
      return "待开始";
  }
}
