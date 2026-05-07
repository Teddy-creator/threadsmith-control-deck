import {
  formatOnboardingStepState,
  onboardingStepBadgeClass,
  pill
} from "../shared";
import type { OnboardingGuide } from "./types";

interface ProjectsOnboardingGuideCardProps {
  onboardingGuide: OnboardingGuide | null;
  onboardingAction: (() => void) | null;
}

export function ProjectsOnboardingGuideCard({
  onboardingGuide,
  onboardingAction
}: ProjectsOnboardingGuideCardProps) {
  if (!onboardingGuide) {
    return null;
  }

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">首次上手引导</div>
        {pill(onboardingGuide.tone, onboardingGuide.badgeLabel)}
      </div>
      <div className="text-sm text-zinc-100">{onboardingGuide.title}</div>
      <div className="mt-2 text-sm leading-6 text-zinc-400">{onboardingGuide.detail}</div>
      <div className="mt-4 space-y-2">
        {onboardingGuide.steps.map((step) => (
          <div
            key={step.label}
            className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-3"
          >
            <div className="min-w-0 text-sm text-zinc-200">{step.label}</div>
            <span
              className={`inline-flex min-h-7 shrink-0 items-center justify-center whitespace-nowrap rounded-md px-2.5 py-1 text-xs leading-none ${onboardingStepBadgeClass(step.state)}`}
            >
              {formatOnboardingStepState(step.state)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs leading-6 text-zinc-500">{onboardingGuide.hint}</div>
      {onboardingGuide.actionLabel && onboardingAction ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 transition-colors hover:bg-zinc-700"
            onClick={onboardingAction}
          >
            {onboardingGuide.actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
