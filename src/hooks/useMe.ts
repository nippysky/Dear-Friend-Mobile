import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export type Me = {
  user: {
    id: string;
    username: string;
    email: string;
    displayName?: string | null;
  };
};

export function useMe(enabled = true) {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      return apiFetch<Me>("/api/me", { method: "GET" });
    },
    enabled,
    staleTime: 60_000,
  });
}
