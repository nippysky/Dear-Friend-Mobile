// src/lib/session.ts
import * as SecureStore from "expo-secure-store";

const ACCESS_KEY = "df_access_token";
const REFRESH_KEY = "df_refresh_token";

export type SessionTokens = {
  access_token: string;
  refresh_token: string;
};

export async function getTokens(): Promise<SessionTokens | null> {
  const [access_token, refresh_token] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
  ]);

  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token };
}

export async function setTokens(tokens: SessionTokens) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, tokens.access_token),
    SecureStore.setItemAsync(REFRESH_KEY, tokens.refresh_token),
  ]);
}

export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ]);
}
