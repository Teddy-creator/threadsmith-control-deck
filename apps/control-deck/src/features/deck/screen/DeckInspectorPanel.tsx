import type { ReactNode } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";

export function DeckInspectorPanel(props: {
  visible: boolean;
  focused: boolean;
  title: string;
  description: string;
  objectLabel: string;
  roleLabel: string | null;
  threadLabel: string | null;
  providerLabel: string | null;
  icon: ReactNode;
  surfaceClassName: string;
  onToggleFocus: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!props.visible) {
    return null;
  }

  return (
    <aside
      className={`inspector-panel flex min-h-0 flex-col overflow-hidden bg-[#0f0f11] ${
        props.focused
          ? "flex-1"
          : "w-[680px] max-w-[52vw] shrink-0 border-l border-zinc-800/50 2xl:w-[720px] 2xl:max-w-[56vw]"
      }`}
    >
      <div className="border-b border-zinc-800/60 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${props.surfaceClassName}`}
              >
                {props.icon}
              </div>
              <div className="min-w-0">
                <div className="text-sm text-zinc-100">{props.title}</div>
                <div className="mt-1 text-xs leading-5 text-zinc-500">
                  {props.description}
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-zinc-500">当前焦点</span>
              <span className="text-sm text-zinc-200">{props.objectLabel}</span>
            </div>
            {props.roleLabel && props.threadLabel && props.providerLabel ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
                  <span className="text-amber-200/70">角色</span>
                  <span>{props.roleLabel}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
                  <span className="text-amber-200/70">线程</span>
                  <span>{props.threadLabel}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
                  <span className="text-amber-200/70">提供方</span>
                  <span>{props.providerLabel}</span>
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
              onClick={props.onToggleFocus}
              aria-label={props.focused ? "收起工作台" : "展开工作台"}
            >
              {props.focused ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
              onClick={props.onClose}
              aria-label="关闭工作台"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-none p-8">
        {props.children}
      </div>
    </aside>
  );
}
