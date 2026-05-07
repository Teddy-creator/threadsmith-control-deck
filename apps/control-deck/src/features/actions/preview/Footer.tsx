import { ChevronRightIcon } from "../../../components/icons/DeckIcons";

export function ActionPreviewFooter(props: {
  executionMode: "action" | "direct-run" | null;
  showDirectRunFallback: boolean;
  suggestedPrompt: string | null;
  primaryActionLabel: string;
  directRunLabel: string;
  onCancel: () => void;
  onDirectRun: () => void;
  onPrimaryAction: () => void;
}) {
  return (
    <div className="preview-footer">
      <button
        className="ghost-button"
        onClick={props.onCancel}
        disabled={props.executionMode !== null}
      >
        取消
      </button>
      {props.showDirectRunFallback ? (
        <button
          className="secondary-button"
          onClick={props.onDirectRun}
          disabled={props.executionMode !== null}
        >
          <span>{props.directRunLabel}</span>
        </button>
      ) : null}
      <button
        className="primary-button"
        disabled={props.executionMode !== null}
        onClick={props.onPrimaryAction}
      >
        {props.suggestedPrompt ? (
          <span>{props.primaryActionLabel}</span>
        ) : (
          <>
            <span>{props.primaryActionLabel}</span>
            <ChevronRightIcon className="button-icon" />
          </>
        )}
      </button>
    </div>
  );
}
