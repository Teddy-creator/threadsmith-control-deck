import type { ReactNode } from "react";
import { Activity, CheckCircle2, Circle, Layers3 } from "lucide-react";

function RailButton({
  active,
  label,
  icon,
  onClick
}: {
  active: boolean;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center rounded-md transition-all ${
        active
          ? "border border-amber-500/30 bg-amber-500/18 text-amber-400 shadow-[0_0_0_1px_rgba(245,158,11,0.08)]"
          : "text-zinc-500 opacity-45 hover:bg-zinc-900/80 hover:text-zinc-300 hover:opacity-100"
      }`}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

export function NavigationRail(props: {
  projectActive: boolean;
  objectsActive: boolean;
  eventsActive: boolean;
  acceptanceActive: boolean;
  onToggleProject: () => void;
  onToggleObjects: () => void;
  onToggleEvents: () => void;
  onToggleAcceptance: () => void;
}) {
  return (
    <aside className="flex w-12 flex-col items-center gap-6 border-r border-zinc-800/50 bg-[#0f0f11] py-6">
      <button
        type="button"
        aria-label="项目"
        className={`flex h-8 w-8 items-center justify-center rounded-md transition-all ${
          props.projectActive
            ? "border border-amber-500/30 bg-amber-500/18 text-amber-400 shadow-[0_0_0_1px_rgba(245,158,11,0.08)]"
            : "text-zinc-500 opacity-45 hover:bg-zinc-900/80 hover:text-zinc-300 hover:opacity-100"
        }`}
        onClick={props.onToggleProject}
      >
        <Circle
          className={`h-3 w-3 ${
            props.projectActive
              ? "fill-amber-500 text-amber-500"
              : "fill-zinc-700 text-zinc-600"
          }`}
        />
      </button>
      <RailButton
        active={props.objectsActive}
        label="阶段"
        icon={
          <Layers3
            className={`h-3.5 w-3.5 ${
              props.objectsActive ? "text-amber-500" : "text-zinc-500"
            }`}
          />
        }
        onClick={props.onToggleObjects}
      />
      <RailButton
        active={props.eventsActive}
        label="证据"
        icon={
          <Activity
            className={`h-3.5 w-3.5 ${
              props.eventsActive ? "text-amber-500" : "text-zinc-500"
            }`}
          />
        }
        onClick={props.onToggleEvents}
      />
      <RailButton
        active={props.acceptanceActive}
        label="验收"
        icon={
          <CheckCircle2
            className={`h-3.5 w-3.5 ${
              props.acceptanceActive ? "text-amber-500" : "text-zinc-500"
            }`}
          />
        }
        onClick={props.onToggleAcceptance}
      />
    </aside>
  );
}
