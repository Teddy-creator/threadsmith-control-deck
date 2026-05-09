import { PROJECT_SOURCE_OPTIONS } from "./types";

interface ProjectsSourceSwitcherSectionProps {
  currentProjectSourceId: string;
  onSelectProjectSource: (
    sourceId: "app-home" | "fresh-demo" | "stale-packet-demo" | "custom-project"
  ) => void;
  openInspectorPanel: (view: "projects") => void;
}

export function ProjectsSourceSwitcherSection({
  currentProjectSourceId,
  onSelectProjectSource,
  openInspectorPanel
}: ProjectsSourceSwitcherSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs uppercase tracking-[0.18em] text-zinc-500">来源</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Demo mode 用来学习页面含义；正式工作请选择自定义项目，让 Threadsmith 读取真实项目的 `.threadsmith`。
        </p>
      </div>
      <div className="grid gap-3">
        {PROJECT_SOURCE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`rounded-xl border p-4 text-left transition-colors ${
              currentProjectSourceId === option.id
                ? "border-amber-500/30 bg-amber-500/8"
                : "border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700"
            }`}
            onClick={() => {
              openInspectorPanel("projects");
              onSelectProjectSource(option.id);
            }}
          >
            <div className="mb-1 text-sm text-zinc-200">{option.label}</div>
            <div className="text-sm leading-6 text-zinc-500">{option.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
