// src/hooks/useFeed.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export type FeedItem = {
  id: string;
  category: "PERSONAL" | "RELATIONSHIP" | "CAREER";
  body: string;
  createdAt: string;
  author: { id: string; username: string; displayName: string | null };
  counts: { replies: number; likes: number };
  pinnedReplyId: string | null;
};

export function useFeed() {
  return useQuery({
    queryKey: ["feed"],
    queryFn: () => apiFetch<{ items: FeedItem[] }>(`/api/feed`),
  });
}
