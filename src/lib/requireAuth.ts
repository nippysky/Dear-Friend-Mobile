// src/lib/requireAuth.ts
import { router } from "expo-router";
import { isAuthed } from "./authState";

export async function requireAuth(nextPath: string) {
  const ok = await isAuthed();
  if (ok) return true;

  router.push({
    pathname: "/sign-in" as unknown as any,
    params: { next: nextPath },
  });

  return false;
}
