// src/lib/api.ts
import { API_BASE_URL } from "./config";
import { clearTokens, getTokens, setTokens } from "./session";

type Json = Record<string, any>;

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function refreshAccessToken(refresh_token: string) {
  const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token }),
  });

  if (!res.ok) return null;

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    return null;
  }

  if (!data?.access_token || !data?.refresh_token) return null;
  return data as { access_token: string; refresh_token: string };
}

export async function apiFetch<T>(path: string, options: RequestInit & { json?: Json } = {}): Promise<T> {
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
      throw new ApiError("Session expired", 401);
    }

    await setTokens(refreshed);
    headers.Authorization = `Bearer ${refreshed.access_token}`;
    res = await doRequest();
  }

  const text = await res.text();
  let data: any = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!res.ok) {
    const message = data?.error ?? `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}
