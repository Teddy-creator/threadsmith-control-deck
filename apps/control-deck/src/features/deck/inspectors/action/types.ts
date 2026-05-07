interface EntryOptionAction {
  label: string;
  onClick: () => void;
}

export interface EntryOptionCard {
  label: string;
  headline: string;
  detail: string;
  action: EntryOptionAction | null;
}

export interface ActionExecutionItem {
  roleLabel: string;
  taskSummary: string;
  statusTone: string;
  statusLabel: string;
  requiresUserDecision: boolean;
}

export interface SequenceItem {
  actionId: string;
  label: string;
  reason: string;
}

export interface BridgeBadge {
  tone: string;
  label: string;
}

export interface BridgeCard {
  title: string;
  headline: string;
  detail: string;
  badges?: BridgeBadge[];
  meta?: string[];
}

interface BaseProps {
  openProjectWorkbench: () => void;
}

export interface AppHomeActionInspectorProps extends BaseProps {
  mode: "app-home";
  homepageActionSummary: string;
  homepageStopCondition: string;
  homepageConversationPath: string[];
  entryOptions: EntryOptionCard[];
}

export interface ProjectActionInspectorProps extends BaseProps {
  mode: "project";
  actionLabel: string;
  actionBadgeLabel: string;
  expectedRoleLabels: string[];
  actionReason: string;
  actionStopCondition: string;
  activeExecutionItems: ActionExecutionItem[];
  sequence: SequenceItem[];
  manualBridgeTitle: string;
  executionMode: "action" | "direct-run" | null;
  primaryActionUsesAutomationBridge: boolean;
  recommendedRouteCard: BridgeCard;
  latestResultCard: BridgeCard;
  fallbackRouteCard: BridgeCard;
  openPrimaryActionPreview: () => void;
}

export type ActionInspectorProps =
  | AppHomeActionInspectorProps
  | ProjectActionInspectorProps;
