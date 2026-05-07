import { useEffect, useState } from "react";
import type { ProviderRouting } from "@threadsmith/domain";
import type { ProviderRoutingRole } from "./inspectors/project";

type ProviderRoutingSaveState = "idle" | "saving" | "failed";

function serializeProviderRouting(value: ProviderRouting) {
  return [
    value.conductorSurface,
    value.planner,
    value.executor,
    value.reviewer,
    value.verifier,
    value.closeout
  ].join("|");
}

export function useProviderRoutingDraft(args: {
  committedProviderRouting: ProviderRouting | null;
  onSaveProviderRouting?: (value: ProviderRouting) => Promise<ProviderRouting>;
}) {
  const [providerRoutingDraft, setProviderRoutingDraft] = useState<ProviderRouting | null>(null);
  const [providerRoutingBaseKey, setProviderRoutingBaseKey] = useState<string | null>(null);
  const [providerRoutingSaveState, setProviderRoutingSaveState] =
    useState<ProviderRoutingSaveState>("idle");
  const [providerRoutingError, setProviderRoutingError] = useState<string | null>(null);

  const committedProviderRoutingKey = args.committedProviderRouting
    ? serializeProviderRouting(args.committedProviderRouting)
    : null;
  const providerRoutingDraftKey = providerRoutingDraft
    ? serializeProviderRouting(providerRoutingDraft)
    : null;
  const providerRoutingDirty =
    providerRoutingDraftKey !== null &&
    providerRoutingBaseKey !== null &&
    providerRoutingDraftKey !== providerRoutingBaseKey;

  useEffect(() => {
    if (!args.committedProviderRouting || !committedProviderRoutingKey) {
      setProviderRoutingDraft(null);
      setProviderRoutingBaseKey(null);
      setProviderRoutingSaveState("idle");
      setProviderRoutingError(null);
      return;
    }

    const hasUnsavedChanges =
      providerRoutingDraftKey !== null &&
      providerRoutingBaseKey !== null &&
      providerRoutingDraftKey !== providerRoutingBaseKey;

    if (!hasUnsavedChanges) {
      setProviderRoutingDraft({ ...args.committedProviderRouting });
      setProviderRoutingBaseKey(committedProviderRoutingKey);
      setProviderRoutingSaveState("idle");
      setProviderRoutingError(null);
    }
  }, [
    args.committedProviderRouting,
    committedProviderRoutingKey,
    providerRoutingBaseKey,
    providerRoutingDraftKey
  ]);

  function updateProviderRoutingRole(
    role: ProviderRoutingRole,
    provider: ProviderRouting["planner"]
  ) {
    setProviderRoutingDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            [role]: provider
          }
        : currentDraft
    );
    setProviderRoutingSaveState("idle");
    setProviderRoutingError(null);
  }

  function updateConductorSurface(value: ProviderRouting["conductorSurface"]) {
    setProviderRoutingDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            conductorSurface: value
          }
        : currentDraft
    );
    setProviderRoutingSaveState("idle");
    setProviderRoutingError(null);
  }

  function resetProviderRoutingDraft() {
    if (!args.committedProviderRouting || !committedProviderRoutingKey) {
      return;
    }

    setProviderRoutingDraft({ ...args.committedProviderRouting });
    setProviderRoutingBaseKey(committedProviderRoutingKey);
    setProviderRoutingSaveState("idle");
    setProviderRoutingError(null);
  }

  async function saveProviderRouting() {
    if (!providerRoutingDraft || providerRoutingSaveState === "saving") {
      return;
    }

    if (!args.onSaveProviderRouting) {
      setProviderRoutingSaveState("failed");
      setProviderRoutingError("当前环境不支持保存路由。");
      return;
    }

    setProviderRoutingSaveState("saving");
    setProviderRoutingError(null);

    try {
      const savedRouting = await args.onSaveProviderRouting(providerRoutingDraft);
      const nextRouting = savedRouting ?? providerRoutingDraft;
      const nextRoutingKey = serializeProviderRouting(nextRouting);
      setProviderRoutingDraft({ ...nextRouting });
      setProviderRoutingBaseKey(nextRoutingKey);
      setProviderRoutingSaveState("idle");
    } catch (reason) {
      setProviderRoutingSaveState("failed");
      setProviderRoutingError(
        reason instanceof Error ? reason.message : "保存 provider routing 失败"
      );
    }
  }

  return {
    providerRoutingDraft,
    providerRoutingDirty,
    providerRoutingSaveState,
    providerRoutingError,
    updateProviderRoutingRole,
    updateConductorSurface,
    resetProviderRoutingDraft,
    saveProviderRouting
  };
}
