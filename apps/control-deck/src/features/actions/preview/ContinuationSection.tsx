import type {
  ContinuationBehavior,
  ContinuationBehaviorSource,
  PreferenceScope
} from "@threadsmith/domain";
import {
  formatContinuationBehavior,
  formatContinuationSource
} from "../../preferences/labels";

export function ActionPreviewContinuationSection(props: {
  continuationBehavior: ContinuationBehavior;
  saveMode: "just-this-time" | PreferenceScope;
  resolvedContinuationBehavior: ContinuationBehavior;
  resolvedContinuationSource: ContinuationBehaviorSource;
  onChangeContinuationBehavior: (value: ContinuationBehavior) => void;
  onChangeSaveMode: (value: "just-this-time" | PreferenceScope) => void;
}) {
  return (
    <div className="preview-section">
      <div>
        <span className="meta-label">Continuation 模式</span>
        <div className="option-grid">
          {(
            [
              "return-current-thread",
              "smart-continuation",
              "ask-every-time"
            ] as const
          ).map((option) => (
            <label
              key={option}
              className={
                props.continuationBehavior === option
                  ? "option-card option-card-selected"
                  : "option-card"
              }
            >
              <input
                type="radio"
                name="continuation-behavior"
                value={option}
                checked={props.continuationBehavior === option}
                onChange={() => props.onChangeContinuationBehavior(option)}
              />
              <span>{formatContinuationBehavior(option)}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <span className="meta-label">保存方式</span>
        <div className="option-grid">
          {[
            {
              value: "just-this-time" as const,
              label: "仅此次"
            },
            {
              value: "project" as const,
              label: "保存为项目默认"
            },
            {
              value: "global" as const,
              label: "保存为全局默认"
            }
          ].map((option) => (
            <label
              key={option.value}
              className={
                props.saveMode === option.value
                  ? "option-card option-card-selected"
                  : "option-card"
              }
            >
              <input
                type="radio"
                name="save-mode"
                value={option.value}
                checked={props.saveMode === option.value}
                onChange={() => props.onChangeSaveMode(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <p className="muted-text">
        当前默认：{formatContinuationBehavior(props.resolvedContinuationBehavior)}
        {" / "}
        {formatContinuationSource(props.resolvedContinuationSource)}
      </p>
    </div>
  );
}
