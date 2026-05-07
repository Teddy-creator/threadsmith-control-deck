import { AlertTriangle, CheckCircle2, ChevronRight, Copy, Target } from "lucide-react";
import { pill } from "../inspectors/shared";

type PillTone = "green" | "amber" | "red" | "blue" | "purple" | "zinc";

export interface HomepageConductorEntryItem {
  label: string;
  value: string;
  className: string;
  labelClassName: string;
}

export interface HomepageEntryAction {
  id: string;
  label: string;
  detail: string;
  projectRoot?: string;
}

export interface HomepageFailureLoopView {
  label: string;
  detail: string;
  nextStep: string;
}

export interface HomepageCommandCardViewModel {
  currentSourceIsAppHome: boolean;
  commandState: { label: string; tone: PillTone };
  collaborationMode: { label: string; tone: PillTone };
  actionTitle: string;
  actionSummary: string;
  conductorEntry: HomepageConductorEntryItem[];
  actionReasons: [string, string];
  failureLoop: HomepageFailureLoopView | null;
  conversationPath: string[];
  stopCondition: string;
  primaryFrontDoorEntryAction: HomepageEntryAction | null;
  secondaryFrontDoorEntryActions: HomepageEntryAction[];
  primaryButtonLabel: string;
  transitionError: string | null;
  workflowTransitionCount: number;
}

export interface HomepageCommandCardProps extends HomepageCommandCardViewModel {
  onRunFrontDoorEntryAction: (action: HomepageEntryAction) => void;
  onCopyConductorPrompt: () => void;
  onOpenActionInspector: () => void;
}

export function HomepageCommandCard(props: HomepageCommandCardProps) {
  return (
    <article className="mb-12 overflow-hidden rounded-xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/90 to-zinc-900/40">
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1 rounded-full bg-amber-500" />
            <h2 className="text-xl text-zinc-50">当前总命令</h2>
          </div>
          <div className="flex items-center gap-2">
            {pill(props.commandState.tone, props.commandState.label)}
            {pill(props.collaborationMode.tone, props.collaborationMode.label)}
          </div>
        </div>

        <div className="mb-8">
          <div className="mb-5 flex items-start gap-4">
            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
              <Target className="h-5 w-5 text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="mb-2 text-lg text-zinc-100">{props.actionTitle}</h3>
              <p className="leading-relaxed text-zinc-400">{props.actionSummary}</p>
              <div className="mt-4 flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-zinc-500">指挥入口</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {props.conductorEntry.map((item) => (
                      <span
                        key={item.label}
                        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs ${item.className}`}
                      >
                        <span className={item.labelClassName}>{item.label}</span>
                        <span>{item.value}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 ml-14 flex items-center gap-3">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500">为什么现在</span>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
                <AlertTriangle className="h-3 w-3" />
                {props.actionReasons[0]}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/[0.08] px-2.5 py-1 text-xs text-amber-200/85">
                <CheckCircle2 className="h-3 w-3" />
                {props.actionReasons[1]}
              </span>
            </div>
          </div>

          {props.failureLoop ? (
            <div className="mb-6 ml-14 rounded-lg border border-red-500/20 bg-red-500/8 p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {pill("red", props.failureLoop.label)}
                <span className="text-xs text-red-200/75">当前异常</span>
              </div>
              <div className="text-sm leading-6 text-zinc-200">
                {props.failureLoop.detail}
              </div>
              <div className="mt-2 text-sm leading-6 text-zinc-400">
                下一步：{props.failureLoop.nextStep}
              </div>
            </div>
          ) : null}

          <div className="mb-8 ml-14 flex items-start gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <span className="mb-1 text-[11px] uppercase tracking-wider text-zinc-500">对话路径</span>
              {props.conversationPath.map((item, index) => (
                <div key={item} className="flex items-center gap-2 text-sm text-zinc-300">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-xs text-zinc-400">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ml-14 flex items-start gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <span className="text-[11px] uppercase tracking-wider text-zinc-500">完成标志</span>
              <p className="text-sm leading-relaxed text-zinc-300">{props.stopCondition}</p>
            </div>
          </div>
        </div>

        <div className="ml-14 flex flex-wrap items-center gap-3">
          {props.currentSourceIsAppHome ? (
            <>
              {props.primaryFrontDoorEntryAction ? (
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-zinc-950 transition-colors hover:bg-amber-600"
                  onClick={() => props.onRunFrontDoorEntryAction(props.primaryFrontDoorEntryAction!)}
                >
                  <span>{props.primaryFrontDoorEntryAction.label}</span>
                </button>
              ) : null}
              {props.secondaryFrontDoorEntryActions.map((action) => (
                <button
                  key={`${action.id}-${action.label}`}
                  type="button"
                  className="rounded-lg border border-zinc-700 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-200 transition-colors hover:border-zinc-600 hover:text-zinc-50"
                  onClick={() => props.onRunFrontDoorEntryAction(action)}
                >
                  {action.label}
                </button>
              ))}
            </>
          ) : (
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-zinc-950 transition-colors hover:bg-amber-600"
              onClick={props.onCopyConductorPrompt}
            >
              <Copy className="h-4 w-4" />
              <span>{props.primaryButtonLabel}</span>
            </button>
          )}
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-3 text-zinc-400 transition-colors hover:text-zinc-200"
            onClick={props.onOpenActionInspector}
          >
            <span>查看为什么</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="ml-14 mt-3 text-sm leading-6 text-zinc-500">
          {props.currentSourceIsAppHome
            ? props.primaryFrontDoorEntryAction?.id === "connect-project"
              ? "前门只负责连接入口。连上真实项目后，实时 phase、验收和证据才会从该项目 .threadsmith 读取。"
              : "前门给出今天最短的进入动作；进入真实项目后，再看实时状态和下一步。"
            : "默认回到指挥官聊天继续推进；需要手动执行或调试执行桥时，再进入详情页。"}
        </div>

        <div className="ml-14 mt-5 border-t border-zinc-800/70 pt-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500">
              补充说明
            </span>
            <span className="text-xs text-zinc-500">默认不在首页直接执行</span>
          </div>

          <div className="text-sm leading-6 text-zinc-500">
            {props.currentSourceIsAppHome
              ? "前门是入口页，不是项目实时页。真正的推进、验收和调试，仍默认回到指挥官聊天面，并在真实项目 .threadsmith 中沉淀。"
              : props.workflowTransitionCount > 0
                ? `当前有 ${props.workflowTransitionCount} 个可签发动作，已收纳到详情页和工作台。默认先让指挥官继续推进。`
                : props.failureLoop
                  ? "当前异常优先通过指挥官聊天处理；需要手动签发动作或调试执行桥时，请打开详情页。"
                  : "默认通过指挥官聊天推进。需要手动执行或查看原始动作时，请打开详情页。"}
          </div>

          {props.transitionError ? (
            <div
              className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm leading-6 text-red-300"
              role="alert"
            >
              {props.transitionError}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
