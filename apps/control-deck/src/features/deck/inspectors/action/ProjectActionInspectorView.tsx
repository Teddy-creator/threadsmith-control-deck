import { Zap } from "lucide-react";
import { compactText, pill } from "../shared";
import type { ProjectActionInspectorProps } from "./types";

export function ProjectActionInspectorView(props: ProjectActionInspectorProps) {
  return (
    <div className="space-y-8">
      <div className="border-b border-zinc-800/60 pb-6">
        <h2 className="text-xl text-zinc-50">推进参考</h2>
        <p className="mt-2 text-sm text-zinc-500">{props.actionLabel}</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs uppercase tracking-[0.18em] text-zinc-500">当前建议</h3>
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {pill("amber", props.actionBadgeLabel)}
            {props.expectedRoleLabels.map((role) => (
              <span
                key={role}
                className="rounded-md bg-zinc-800/80 px-2.5 py-1 text-xs text-zinc-300"
              >
                {role}
              </span>
            ))}
          </div>
          <div className="text-sm leading-6 text-zinc-300">
            {compactText(props.actionReason, 104)}
          </div>
          <div className="mt-3 text-sm leading-6 text-zinc-500">
            完成标志：{compactText(props.actionStopCondition, 84)}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs uppercase tracking-[0.18em] text-zinc-500">当前现场</h3>
        <div className="space-y-3">
          {props.activeExecutionItems.map((item, index) => (
            <div
              key={`${item.roleLabel}-${index}`}
              className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-sm text-zinc-200">{compactText(item.taskSummary, 72)}</div>
                {pill(item.statusTone, item.statusLabel)}
              </div>
              <div className="text-xs text-zinc-500">
                {item.roleLabel}
                {item.requiresUserDecision ? " · 需要用户决策" : ""}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs uppercase tracking-[0.18em] text-zinc-500">后续路线</h3>
        <div className="space-y-3">
          {props.sequence.slice(0, 3).map((step, index) => (
            <div
              key={`${step.actionId}-${index}`}
              className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4"
            >
              <div className="mb-2 flex items-center gap-3">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-xs text-zinc-400">
                  {index + 1}
                </span>
                <div className="text-sm text-zinc-200">{step.label}</div>
              </div>
              <div className="text-sm leading-6 text-zinc-400">{compactText(step.reason, 88)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 border-t border-zinc-800/60 pt-6">
        <div className="flex items-center gap-3">
          <Zap className="h-4.5 w-4.5 text-amber-400" />
          <h3 className="text-base text-zinc-100">手动桥接（备用）</h3>
        </div>
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <div className="text-sm leading-6 text-zinc-300">
            默认应回到指挥官聊天推进这一步；只有你想手动签发或检查桥接参数时，才在这里继续。
          </div>
          <div className="mt-2 text-sm leading-6 text-zinc-500">
            {props.primaryActionUsesAutomationBridge
              ? "这会先打开 command bridge 确认层；你可以按推荐路由签发，也可以查看 direct run fallback。"
              : "这会打开手动确认层，决定是否把这一步交给执行桥。"}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[props.recommendedRouteCard, props.latestResultCard, props.fallbackRouteCard].map(
            (card, index) => (
              <div
                key={`${card.title}-${index}`}
                className={`rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 ${
                  index === 2 ? "sm:col-span-2" : ""
                }`}
              >
                <div className="text-xs text-zinc-500">{card.title}</div>
                <div className="mt-2 text-sm leading-6 text-zinc-100">{card.headline}</div>
                <div className="mt-2 text-sm leading-6 text-zinc-400">{card.detail}</div>
                {card.badges && card.badges.length > 0 ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {card.badges.map((badge) => (
                      <span key={`${card.title}-${badge.label}`}>{pill(badge.tone, badge.label)}</span>
                    ))}
                  </div>
                ) : null}
                {card.meta && card.meta.length > 0 ? (
                  <div className="mt-3 space-y-1">
                    {card.meta.map((line) => (
                      <div key={line} className="text-xs leading-5 text-zinc-500">
                        {line}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          )}
        </div>
        <button
          type="button"
          className={`mb-3 w-full rounded-lg px-4 py-2.5 text-sm text-zinc-950 transition-colors ${
            props.executionMode ? "cursor-wait bg-amber-300" : "bg-amber-500 hover:bg-amber-400"
          }`}
          onClick={props.openPrimaryActionPreview}
          disabled={props.executionMode !== null}
        >
          {props.executionMode === "action" && props.primaryActionUsesAutomationBridge
            ? "正在启动自动执行..."
            : props.executionMode === "direct-run"
              ? "正在直接启动 executor run..."
              : props.manualBridgeTitle}
        </button>
        <button
          type="button"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
          onClick={props.openProjectWorkbench}
        >
          回到项目工作台
        </button>
      </div>
    </div>
  );
}
