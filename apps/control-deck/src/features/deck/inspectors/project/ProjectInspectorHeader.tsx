interface ProjectInspectorHeaderProps {
  projectSummary: string | null | undefined;
  headline: string;
}

export function ProjectInspectorHeader({
  projectSummary,
  headline
}: ProjectInspectorHeaderProps) {
  return (
    <div className="border-b border-zinc-800/60 pb-6">
      <h2 className="text-xl text-zinc-50">项目总况</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{projectSummary ?? headline}</p>
    </div>
  );
}
