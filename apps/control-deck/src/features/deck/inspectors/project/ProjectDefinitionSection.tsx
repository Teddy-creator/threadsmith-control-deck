import { Target } from "lucide-react";
import type { ProjectState } from "@threadsmith/domain";
import { amberMetaTagClass, compactText, pill } from "../shared";
import type { DefinitionSection } from "./types";

interface ProjectDefinitionSectionProps {
  projectState: ProjectState;
  projectOverallStateTone: string;
  projectOverallStateLabel: string;
  priorityPreview: string[];
  definitionSections: DefinitionSection[];
}

export function ProjectDefinitionSection({
  projectState,
  projectOverallStateTone,
  projectOverallStateLabel,
  priorityPreview,
  definitionSections
}: ProjectDefinitionSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Target className="h-4.5 w-4.5 text-amber-400" />
        <h3 className="text-base text-zinc-100">项目定义</h3>
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {pill(projectOverallStateTone, projectOverallStateLabel)}
            {pill("amber", "项目简报")}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs text-zinc-500">项目目标</div>
              <div className="mt-1 text-sm leading-6 text-zinc-200">
                {projectState.projectBrief.projectGoal}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">当前版本范围</div>
              <div className="mt-1 text-sm leading-6 text-zinc-300">
                {projectState.projectBrief.currentVersionScope}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <div className="text-xs text-zinc-500">当前优先级</div>
          {priorityPreview.length > 0 ? (
            <>
              <div className="mt-3 flex flex-wrap gap-2">
                {priorityPreview.map((item) => (
                  <span key={item} className={amberMetaTagClass}>
                    {compactText(item, 36)}
                  </span>
                ))}
              </div>
              {projectState.projectBrief.priorityOrder.length > priorityPreview.length ? (
                <div className="mt-2 text-xs text-zinc-500">
                  另有 {projectState.projectBrief.priorityOrder.length - priorityPreview.length} 项优先级，见项目简报。
                </div>
              ) : null}
            </>
          ) : (
            <div className="mt-2 text-sm text-zinc-500">当前还没有记录优先级。</div>
          )}
        </div>

        <div className="space-y-3">
          {definitionSections.map((section) => (
            <div
              key={section.label}
              className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4"
            >
              <div className="text-xs text-zinc-500">{section.label}</div>
              {section.items.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {section.items.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/80" />
                      <div className="text-sm leading-6 text-zinc-300">{item}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-sm text-zinc-500">{section.empty}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
