// src/lib/requireAuth.ts
import { router } from "expo-router";
import { isAuthed } from "./authState";

export async function requireAuth(next: string) {
  const ok = await isAuthed();
  if (ok) return true;

  const encoded = encodeURIComponent(next);
  router.push((`/sign-in?next=${encoded}`) as any);
  return false;
}
