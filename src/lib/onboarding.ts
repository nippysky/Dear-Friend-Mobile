import * as SecureStore from "expo-secure-store";

const KEY = "df_onboarding_v2";

export async function hasSeenOnboarding() {
  const v = await SecureStore.getItemAsync(KEY);
  return v === "1";
}

export async function setSeenOnboarding() {
  await SecureStore.setItemAsync(KEY, "1");
}
