interface AcceptanceInspectorHeaderProps {
  currentClaim: string;
}

export function AcceptanceInspectorHeader({
  currentClaim
}: AcceptanceInspectorHeaderProps) {
  return (
    <div className="border-b border-zinc-800/60 pb-6">
      <h2 className="text-xl text-zinc-50">验收状态</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{currentClaim}</p>
    </div>
  );
}
