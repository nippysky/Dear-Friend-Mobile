import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useCreateReply(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      apiFetch(`/api/replies`, { method: "POST", json: { postId, body } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["post", postId] });
      await qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}
