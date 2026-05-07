import { pill } from "../shared";
import type { InstallSurfaceState } from "./types";

interface ProjectsInstallSurfaceCardProps {
  installSurface?: InstallSurfaceState;
  onTriggerInstall?: () => Promise<void>;
}

export function ProjectsInstallSurfaceCard({
  installSurface,
  onTriggerInstall
}: ProjectsInstallSurfaceCardProps) {
  if (!installSurface) {
    return null;
  }

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">安装与固定</div>
        {pill(installSurface.tone, installSurface.badgeLabel)}
      </div>
      <div className="text-sm text-zinc-100">{installSurface.title}</div>
      <div className="mt-2 text-sm leading-6 text-zinc-400">{installSurface.detail}</div>
      <div className="mt-3 text-xs leading-6 text-zinc-500">{installSurface.hint}</div>
      {installSurface.actionLabel && onTriggerInstall ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 transition-colors hover:bg-zinc-700"
            onClick={() => {
              void onTriggerInstall();
            }}
          >
            {installSurface.actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
