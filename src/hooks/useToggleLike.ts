// src/hooks/useToggleLike.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

type ToggleLikeOpts = {
  postId?: string;
  replyId?: string;
  invalidateKey?: any[];
};

type ToggleLikeResponse = { ok: true };

export function useToggleLike(opts: ToggleLikeOpts) {
  const qc = useQueryClient();
  const key = opts.invalidateKey ?? [];

  return useMutation<ToggleLikeResponse, Error, boolean>({
    mutationFn: async (liked: boolean) => {
      const json = opts.postId ? { postId: opts.postId } : { replyId: opts.replyId };

      if (liked) {
        // unlike
        return apiFetch<ToggleLikeResponse>(`/api/likes`, { method: "DELETE", json });
      }

      // like
      return apiFetch<ToggleLikeResponse>(`/api/likes`, { method: "POST", json });
    },
    onSuccess: async () => {
      if (key.length) await qc.invalidateQueries({ queryKey: key });
      await qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}
