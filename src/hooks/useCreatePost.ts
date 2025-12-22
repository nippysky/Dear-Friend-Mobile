// src/hooks/useCreatePost.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useCreatePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      category: "PERSONAL" | "RELATIONSHIP" | "CAREER";
      body: string;
    }) =>
      apiFetch<{ post: any }>(`/api/posts`, {
        method: "POST",
        json: input,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}
