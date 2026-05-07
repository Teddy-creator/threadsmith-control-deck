import { useEffect, useState } from "react";
import type {
  ContinuationBehavior,
  ContinuationBehaviorSource,
  PreferenceScope
} from "@threadsmith/domain";
import type { ActionRecommendation, CommandBridgeSummary } from "@threadsmith/runtime";
import { CloseIcon, SparkIcon, TargetIcon } from "../../components/icons/DeckIcons";
import { formatRole } from "../display/labels";
import { ActionPreviewBridgeSection } from "./preview/BridgeSection";
import { ActionPreviewContinuationSection } from "./preview/ContinuationSection";
import { ActionPreviewFooter } from "./preview/Footer";
import { buildActionPreviewViewModel } from "./preview/model";

export interface ActionExecutionOptions {
  continuationBehavior?: ContinuationBehavior;
  persistenceScope?: PreferenceScope;
}

interface ActionPreviewPanelProps {
  action: ActionRecommendation | null;
  projectRoot: string;
  commandBridge: CommandBridgeSummary;
  open: boolean;
  executionMode: "action" | "direct-run" | null;
  resolvedContinuationBehavior: ContinuationBehavior;
  resolvedContinuationSource: ContinuationBehaviorSource;
  onCancel: () => void;
  onDirectRun: () => void | Promise<void>;
  onConfirm: (
    action: ActionRecommendation,
    options?: ActionExecutionOptions
  ) => void | Promise<void>;
}

export function ActionPreviewPanel({
  action,
  projectRoot,
  commandBridge,
  open,
  executionMode,
  resolvedContinuationBehavior,
  resolvedContinuationSource,
  onCancel,
  onDirectRun,
  onConfirm
}: ActionPreviewPanelProps) {
  const [continuationBehavior, setContinuationBehavior] =
    useState<ContinuationBehavior>(resolvedContinuationBehavior);
  const [saveMode, setSaveMode] = useState<"just-this-time" | PreferenceScope>(
    "just-this-time"
  );
  const [promptCopyState, setPromptCopyState] = useState<"idle" | "copied" | "failed">(
    "idle"
  );

  useEffect(() => {
    if (!open || !action) {
      return;
    }

    setContinuationBehavior(resolvedContinuationBehavior);
    setSaveMode("just-this-time");
    setPromptCopyState("idle");
  }, [action, open, resolvedContinuationBehavior]);

  if (!open || !action) {
    return null;
  }

  const viewModel = buildActionPreviewViewModel({
    action,
    projectRoot,
    commandBridge,
    executionMode,
    promptCopyState
  });

  async function handleCopySuggestedPrompt() {
    if (!viewModel.suggestedPrompt) {
      return;
    }

    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.clipboard ||
        typeof navigator.clipboard.writeText !== "function"
      ) {
        throw new Error("clipboard unavailable");
      }

      await navigator.clipboard.writeText(viewModel.suggestedPrompt);
      setPromptCopyState("copied");
    } catch {
      setPromptCopyState("failed");
    } finally {
      window.setTimeout(() => {
        setPromptCopyState("idle");
      }, 1800);
    }
  }

  function handlePrimaryAction() {
    if (viewModel.suggestedPrompt) {
      void handleCopySuggestedPrompt();
      return;
    }

    void onConfirm(
      action,
      viewModel.showContinuationControls
        ? {
            continuationBehavior,
            persistenceScope:
              saveMode === "just-this-time" ? undefined : saveMode
          }
        : undefined
    );
  }

  return (
    <div className="preview-overlay">
      <section className="preview-panel">
        <div className="preview-header">
          <div className="preview-title-stack">
            <p className="section-kicker">{viewModel.headerKicker}</p>
            <h3>{action.label}</h3>
            <p className="preview-subtitle">{action.reason}</p>
          </div>
          <button
            type="button"
            className="drawer-close-button"
            aria-label="关闭"
            onClick={onCancel}
          >
            <CloseIcon className="button-icon" />
          </button>
        </div>

        <div className="preview-hero">
          <div className="preview-hero-icon">
            {viewModel.heroIcon === "spark" ? (
              <SparkIcon className="hero-primary-icon-svg" />
            ) : (
              <TargetIcon className="hero-primary-icon-svg" />
            )}
          </div>
          <div>
            <span className="micro-label">涉及角色</span>
            <ul className="preview-role-list">
              {action.expectedRoles.map((role, index) => (
                <li key={`${role}-${index}`} className="preview-role-item">
                  <span className="sequence-index">{index + 1}</span>
                  <span>{formatRole(role)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="preview-summary-grid">
          <div className="preview-summary-card">
            <span className="micro-label">停止条件</span>
            <p>{action.stopCondition}</p>
          </div>
          <div className="preview-summary-card">
            <span className="micro-label">当前方式</span>
            <p>{viewModel.modeSummary}</p>
          </div>
        </div>

        <ActionPreviewBridgeSection viewModel={viewModel} />

        {viewModel.showContinuationControls ? (
          <ActionPreviewContinuationSection
            continuationBehavior={continuationBehavior}
            saveMode={saveMode}
            resolvedContinuationBehavior={resolvedContinuationBehavior}
            resolvedContinuationSource={resolvedContinuationSource}
            onChangeContinuationBehavior={setContinuationBehavior}
            onChangeSaveMode={setSaveMode}
          />
        ) : null}
        <ActionPreviewFooter
          executionMode={executionMode}
          showDirectRunFallback={viewModel.showDirectRunFallback}
          suggestedPrompt={viewModel.suggestedPrompt}
          primaryActionLabel={viewModel.primaryActionLabel}
          directRunLabel={viewModel.directRunLabel}
          onCancel={onCancel}
          onDirectRun={() => {
            void onDirectRun();
          }}
          onPrimaryAction={handlePrimaryAction}
        />
      </section>
    </div>
  );
}
