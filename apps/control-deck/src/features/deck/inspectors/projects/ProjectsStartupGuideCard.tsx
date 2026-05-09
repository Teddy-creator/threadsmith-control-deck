import { pill } from "../shared";
import type { StartupGuide } from "./types";

interface ProjectsStartupGuideCardProps {
  startupGuide: StartupGuide;
}

export function ProjectsStartupGuideCard({
  startupGuide
}: ProjectsStartupGuideCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">推荐进入路径</div>
        {pill(startupGuide.tone, startupGuide.badgeLabel)}
      </div>
      <div className="text-sm text-zinc-100">{startupGuide.title}</div>
      <div className="mt-2 text-sm leading-6 text-zinc-400">{startupGuide.detail}</div>
      <div className="mt-3 rounded-xl border border-zinc-800/70 bg-zinc-950/50 px-4 py-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">推荐启动</div>
        <code className="mt-2 block break-all text-xs leading-6 text-zinc-300">
          {startupGuide.command}
        </code>
      </div>
      <div className="mt-3 rounded-xl border border-zinc-800/70 bg-zinc-950/50 px-4 py-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">当前信息来源</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {startupGuide.sourceFiles.map((sourceFile) => (
            <span
              key={sourceFile}
              className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400"
            >
              {sourceFile}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 text-sm leading-6 text-zinc-400">{startupGuide.nextStep}</div>
      <div className="mt-2 text-xs leading-6 text-zinc-500">{startupGuide.boundaryText}</div>
      {startupGuide.action ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 transition-colors hover:bg-zinc-700"
            onClick={startupGuide.action.onClick}
          >
            {startupGuide.action.label}
          </button>
        </div>
      ) : null}
    </div>
  );
}
