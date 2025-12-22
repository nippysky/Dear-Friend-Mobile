import { getTokens } from "./session";

export async function isAuthed() {
  const t = await getTokens();
  return !!t?.access_token && !!t?.refresh_token;
}
