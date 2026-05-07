import { pill } from "../shared";
import type { AppHomeActionInspectorProps } from "./types";

export function AppHomeActionInspectorView(props: AppHomeActionInspectorProps) {
  return (
    <div className="space-y-8">
      <div className="border-b border-zinc-800/60 pb-6">
        <h2 className="text-xl text-zinc-50">推进参考</h2>
        <p className="mt-2 text-sm text-zinc-500">
          前门只负责帮你选对今天的项目入口；进入真实项目后才展示实时 truth。
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs uppercase tracking-[0.18em] text-zinc-500">当前建议</h3>
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {pill("blue", "产品前门")}
            <span className="rounded-md bg-blue-500/10 px-2.5 py-1 text-xs text-blue-300">
              入口快照
            </span>
          </div>
          <div className="text-sm leading-6 text-zinc-300">{props.homepageActionSummary}</div>
          <div className="mt-3 text-sm leading-6 text-zinc-500">
            完成标志：{props.homepageStopCondition}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs uppercase tracking-[0.18em] text-zinc-500">进入路径</h3>
        <div className="space-y-3">
          {props.homepageConversationPath.map((item, index) => (
            <div
              key={`${item}-${index}`}
              className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4"
            >
              <div className="mb-2 flex items-center gap-3">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-xs text-zinc-400">
                  {index + 1}
                </span>
                <div className="text-sm text-zinc-200">{item}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs uppercase tracking-[0.18em] text-zinc-500">可用入口</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {props.entryOptions.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4"
            >
              <div className="text-xs text-zinc-500">{item.label}</div>
              <div className="mt-2 text-sm text-zinc-100">{item.headline}</div>
              <div className="mt-2 text-sm leading-6 text-zinc-400">{item.detail}</div>
              {item.action ? (
                <button
                  type="button"
                  className="mt-4 rounded-lg border border-zinc-700 bg-zinc-950/40 px-3.5 py-2 text-sm text-zinc-200 transition-colors hover:border-zinc-600 hover:text-zinc-50"
                  onClick={item.action.onClick}
                >
                  {item.action.label}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 border-t border-zinc-800/60 pt-6">
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <div className="text-sm leading-6 text-zinc-300">
            前门不直接启动真实项目执行，也不在这里手动签发 bridge 动作。确定项目入口后，默认回到指挥官聊天继续推进。
          </div>
          <div className="mt-2 text-sm leading-6 text-zinc-500">
            如果你要看真实 phase、验收、证据和最近 run，请先进入对应真实项目。
          </div>
        </div>
        <button
          type="button"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
          onClick={props.openProjectWorkbench}
        >
          打开项目工作台
        </button>
      </div>
    </div>
  );
}
