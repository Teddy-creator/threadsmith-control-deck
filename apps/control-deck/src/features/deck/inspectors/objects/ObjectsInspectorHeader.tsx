interface ObjectsInspectorHeaderProps {
  phaseGoal: string;
}

export function ObjectsInspectorHeader({
  phaseGoal
}: ObjectsInspectorHeaderProps) {
  return (
    <div className="border-b border-zinc-800/60 pb-6">
      <h2 className="text-xl text-zinc-50">当前阶段</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{phaseGoal}</p>
    </div>
  );
}
