interface BridgeErrorPayload {
  message?: string;
}

export function buildApiUrl(path: string, projectRoot: string) {
  return `${path}?projectRoot=${encodeURIComponent(projectRoot)}`;
}

export function buildJsonPostRequest(body?: unknown): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  };
}

export async function readBridgeErrorMessage(
  response: Response,
  fallbackMessage: string
) {
  try {
    const body = (await response.json()) as BridgeErrorPayload;

    if (typeof body.message === "string" && body.message.trim()) {
      return body.message.trim();
    }
  } catch {
    return fallbackMessage;
  }

  return fallbackMessage;
}
