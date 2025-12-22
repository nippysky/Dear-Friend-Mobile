// src/lib/authApi.ts
import { apiFetch } from "./api";
import { setTokens } from "./session";

export async function signUp(input: {
  email: string;
  password: string;
  username: string;
  displayName?: string;
}) {
  return apiFetch<{ ok: true }>(`/api/auth/sign-up`, {
    method: "POST",
    json: input,
  });
}

export async function signIn(input: { email: string; password: string }) {
  const res = await apiFetch<{
    access_token: string;
    refresh_token: string;
    user: { id: string; email: string };
  }>(`/api/auth/sign-in`, {
    method: "POST",
    json: input,
  });

  await setTokens({ access_token: res.access_token, refresh_token: res.refresh_token });
  return res.user;
}
