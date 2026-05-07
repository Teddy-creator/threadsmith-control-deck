import type { PhaseOwner } from "@threadsmith/domain";
import type { Tone } from "../shared";

export type HomepageAcceptanceItemStatus = "pass" | "running" | "pending" | "failed";

export type AcceptanceRoutingOverviewItem = {
  label: string;
  value: string;
  detail: string;
  tone: Tone;
};

export type AcceptanceRoutingTarget = {
  gateLabel: string;
  gateStatus: HomepageAcceptanceItemStatus;
  role: PhaseOwner | null;
};
