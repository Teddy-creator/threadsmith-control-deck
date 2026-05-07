import type { RefObject } from "react";
import type { ProjectLoadFailureKind } from "../../projectConnection";

interface ProjectsCustomConnectSectionProps {
  customProjectDraft: string;
  customProjectError: string | null;
  customProjectErrorKind: ProjectLoadFailureKind | null;
  customProjectInputRef: RefObject<HTMLInputElement | null>;
  error: string | null;
  isConnectingCustomProject: boolean;
  isInitializingCustomProject: boolean;
  normalizedCustomProjectDraft: string;
  onConnectCustomProject: (projectRoot: string) => void;
  onCustomProjectDraftChange: (value: string) => void;
  onInitializeCustomProject: (projectRoot: string) => void;
}

export function ProjectsCustomConnectSection({
  customProjectDraft,
  customProjectError,
  customProjectErrorKind,
  customProjectInputRef,
  error,
  isConnectingCustomProject,
  isInitializingCustomProject,
  normalizedCustomProjectDraft,
  onConnectCustomProject,
  onCustomProjectDraftChange,
  onInitializeCustomProject
}: ProjectsCustomConnectSectionProps) {
  const canInitialize = customProjectErrorKind === "missing-state";

  return (
    <div className="space-y-4">
      <h3 className="text-xs uppercase tracking-[0.18em] text-zinc-500">连接自定义项目</h3>
      <div className="space-y-3">
        <label className="block">
          <span className="mb-2 block text-xs text-zinc-500">项目根目录</span>
          <input
            ref={customProjectInputRef}
            aria-label="项目根目录"
            type="text"
            value={customProjectDraft}
            onChange={(event) => onCustomProjectDraftChange(event.target.value)}
            placeholder="/path/to/your-project"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-700"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="rounded-lg bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isConnectingCustomProject || customProjectDraft.trim().length === 0}
            onClick={() => onConnectCustomProject(customProjectDraft)}
          >
            {isConnectingCustomProject ? "连接中..." : "连接项目"}
          </button>
          <button
            type="button"
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canInitialize || isInitializingCustomProject || customProjectDraft.trim().length === 0}
            onClick={() => onInitializeCustomProject(customProjectDraft)}
          >
            {isInitializingCustomProject ? "初始化中..." : "初始化 Threadsmith"}
          </button>
        </div>
        {customProjectError || error ? (
          <div
            className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-6 text-red-300"
            role="alert"
          >
            <div className="mb-1 text-sm text-red-100">无法连接这个项目</div>
            <div>{customProjectError ?? error}</div>
            {customProjectErrorKind === "missing-state" ? (
              <div className="mt-2 text-xs leading-6 text-red-200/90">
                推荐下一步：先点击“初始化 Threadsmith”，创建最小状态后，再从这个目录继续。
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
