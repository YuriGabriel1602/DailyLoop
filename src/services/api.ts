const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");

async function requestJson<T>(path: string, options: RequestInit = {}, timeoutMs = 12000): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`DailyLoop API returned ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

export type BackendHealth = {
  service: string;
  status: string;
  ai_configured?: boolean;
};

export type ChatResponse = {
  response: string;
};

export function getBackendHealth() {
  return requestJson<BackendHealth>("/api/health", { method: "GET" }, 4000);
}

export function sendChatMessage(message: string) {
  return requestJson<ChatResponse>(
    "/api/chat",
    {
      method: "POST",
      body: JSON.stringify({ message }),
    },
    20000,
  );
}
