// src/hooks/usePost.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export type PostDetailResponse = {
  post: {
    id: string;
    category: "PERSONAL" | "RELATIONSHIP" | "CAREER";
    body: string;
    createdAt: string;
    author: { id: string; username: string; displayName: string | null };
    counts: { replies: number; likes: number };
    pinnedReplyId: string | null;
    likedByMe: boolean;
    isMine: boolean;
  };
  replies: {
    id: string;
    postId: string;
    body: string;
    createdAt: string;
    author: { id: string; username: string; displayName: string | null };
    counts: { likes: number };
    likedByMe: boolean;
    isPinned: boolean;
  }[];
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export function usePost(postId: string, opts?: { enabled?: boolean }) {
  const enabled =
    (opts?.enabled ?? true) &&
    typeof postId === "string" &&
    postId.length > 0 &&
    postId !== "undefined" &&
    isUuid(postId);

  return useQuery({
    queryKey: ["post", postId],
    queryFn: () => apiFetch<PostDetailResponse>(`/api/posts/${postId}`),
    enabled,
  });
}
