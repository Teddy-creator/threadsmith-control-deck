import type { ActionPreviewViewModel, PreviewCardModel, PreviewDetailRow } from "./model";

function PreviewDetailList({ rows }: { rows: PreviewDetailRow[] }) {
  return (
    <div className="preview-detail-list">
      {rows.map((row) => (
        <div key={`${row.label}-${row.value}`} className="preview-detail-row">
          <span>{row.label}</span>
          <span>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function PreviewSummaryCard({
  card,
  className
}: {
  card: PreviewCardModel;
  className?: string;
}) {
  return (
    <div className={className ?? "preview-summary-card"}>
      <span className="micro-label">{card.kicker}</span>
      <p>{card.title}</p>
      <PreviewDetailList rows={card.rows} />
      <p className="preview-support-text">{card.detail}</p>
      {card.path ? <p className="preview-path-text">{card.path}</p> : null}
    </div>
  );
}

export function ActionPreviewBridgeSection({
  viewModel
}: {
  viewModel: ActionPreviewViewModel;
}) {
  return (
    <div className="preview-section">
      <div className="preview-summary-grid">
        <PreviewSummaryCard card={viewModel.routeCard} />
        <PreviewSummaryCard card={viewModel.latestRouteCard} />
      </div>

      {viewModel.suggestedPrompt ? (
        <div className="preview-summary-card preview-prompt-card">
          <span className="micro-label">交接提示词</span>
          <p className="preview-support-text">{viewModel.promptCardDescription}</p>
          <pre className="preview-prompt-text">{viewModel.suggestedPrompt}</pre>
        </div>
      ) : null}

      <div className="preview-summary-grid">
        <PreviewSummaryCard card={viewModel.latestResultCard} />
        <PreviewSummaryCard card={viewModel.fallbackCard} />
      </div>
    </div>
  );
}
