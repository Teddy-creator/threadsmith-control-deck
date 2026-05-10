import { providerRoutingSchema, skillRoutingConfigSchema } from "@threadsmith/domain";
import { ProjectLoadError, classifyProjectLoadFailure, explainProjectLoadFailure } from "./errors";
import { normalizeBridgeResponse } from "./normalize";
import { buildApiUrl, buildJsonPostRequest, readBridgeErrorMessage } from "./request";
import type { BridgeResponsePayload } from "./types";

export async function fetchProjectBridgeState(projectRoot: string) {
  const response = await fetch(buildApiUrl("/api/threadsmith/state", projectRoot));

  if (!response.ok) {
    const rawMessage = await readBridgeErrorMessage(
      response,
      `加载 Threadsmith 状态失败（${response.status}）`
    );
    const failureKind = classifyProjectLoadFailure(rawMessage);

    throw new ProjectLoadError(
      projectRoot,
      explainProjectLoadFailure(projectRoot, rawMessage),
      failureKind
    );
  }

  const body = (await response.json()) as BridgeResponsePayload;

  return normalizeBridgeResponse(projectRoot, body);
}

export async function initializeProjectBridgeState(projectRoot: string) {
  const response = await fetch(
    buildApiUrl("/api/threadsmith/init", projectRoot),
    buildJsonPostRequest()
  );

  if (!response.ok) {
    throw new Error(
      await readBridgeErrorMessage(
        response,
        `初始化 Threadsmith 状态失败（${response.status}）`
      )
    );
  }

  const body = (await response.json()) as BridgeResponsePayload;

  return normalizeBridgeResponse(projectRoot, body);
}

export async function fetchProviderRouting(projectRoot: string) {
  const response = await fetch(
    buildApiUrl("/api/threadsmith/provider-routing", projectRoot)
  );

  if (!response.ok) {
    throw new Error(
      await readBridgeErrorMessage(
        response,
        `加载 provider routing 失败（${response.status}）`
      )
    );
  }

  return providerRoutingSchema.parse(await response.json());
}

export async function fetchSkillRouting(projectRoot: string) {
  const response = await fetch(
    buildApiUrl("/api/threadsmith/skill-routing", projectRoot)
  );

  if (!response.ok) {
    throw new Error(
      await readBridgeErrorMessage(
        response,
        `加载 skill routing 失败（${response.status}）`
      )
    );
  }

  return skillRoutingConfigSchema.parse(await response.json());
}
