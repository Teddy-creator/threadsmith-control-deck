import type { PhaseOwner } from "@threadsmith/domain";
import type { Tone } from "../shared";

export type RoutingOverviewItem = {
  label: string;
  value: string;
  detail: string;
  tone: Tone;
};

export type RoutingRole = "planner" | "executor" | "reviewer" | "verifier" | "closeout";

export type RoleRoutingCardModel = {
  role: RoutingRole;
  roleLabel: string;
  threadLabel: string;
  providerLabel: string;
  modeLabel: string;
  modeTone: Tone;
  summary: string;
  surfaceLabel: string;
};

export type SkillRouteVisibilityItem = {
  label: string;
  value: string;
  detail: string;
};

export type SkillRoutingVisibilityModel = {
  discoveredLabel: string;
  routePreferenceLabel: string;
  disabledLabel: string;
  fallbackLabel: string;
  fallbackTone: Tone;
  boundary: string;
  selectedRoutes: SkillRouteVisibilityItem[];
  notes: string[];
};

export type PhaseRoutingOverviewItem = {
  label: string;
  value: string;
  detail: string;
  tone: Tone;
};

export type { PhaseOwner };
