// src/lib/requireAuth.ts
import { router } from "expo-router";
import { getTokens } from "./session";

/**
 * Silent auth gate:
 * - If we have an access token locally → allow immediately (no UI, no “checking…” state).
 * - If not → route to sign-in with `next`.
 *
 * Truth is still enforced by apiFetch (refresh + 401 handling).
 */
export async function requireAuth(next: string) {
  const tokens = await getTokens();

  if (tokens?.access_token) return true;

  const encoded = encodeURIComponent(next);
  router.push((`/sign-in?next=${encoded}`) as any);
  return false;
}
