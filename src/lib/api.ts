// src/lib/api.ts
import { API_BASE_URL } from "./config";
import { clearTokens, getTokens, setTokens } from "./session";

type Json = Record<string, any>;

async function refreshAccessToken(refresh_token: string) {
  const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { access_token: string; refresh_token: string };
  if (!data?.access_token || !data?.refresh_token) return null;
  return data;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { json?: Json } = {}
): Promise<T> {
  const tokens = await getTokens();

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (options.json) headers["Content-Type"] = "application/json";
 // If caller explicitly provided Authorization, don't override it.
if (!headers.Authorization && tokens?.access_token) {
  headers.Authorization = `Bearer ${tokens.access_token}`;
}


  const doRequest = async () =>
    fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      body: options.json ? JSON.stringify(options.json) : options.body,
    });

  let res = await doRequest();

  // If token expired, refresh once and retry
  if (res.status === 401 && tokens?.refresh_token) {
    const refreshed = await refreshAccessToken(tokens.refresh_token);
    if (!refreshed) {
      await clearTokens();
      throw new Error("Session expired");
    }

    await setTokens(refreshed);
    headers.Authorization = `Bearer ${refreshed.access_token}`;
    res = await doRequest();
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.error ?? `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}
