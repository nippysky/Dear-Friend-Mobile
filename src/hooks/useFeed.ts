// src/hooks/useFeed.ts
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export type FeedItem = {
  id: string;
  category: "PERSONAL" | "RELATIONSHIP" | "CAREER";
  body: string;
  createdAt: string;
  author: { id: string; username: string; displayName: string | null };
  counts: { replies: number; likes: number };
  pinnedReplyId: string | null;
  likedByMe?: boolean;
  isMine?: boolean; // ✅ added
};

export type FeedFilter = "ALL" | FeedItem["category"];

export type FeedPage = {
  items: FeedItem[];
  nextCursor: string | null;
};

function buildFeedUrl(filter: FeedFilter, cursor: string | null) {
  // ✅ RN-safe: avoid URLSearchParams() typing weirdness
  const parts: string[] = ["limit=30"];
  if (filter !== "ALL") parts.push(`category=${encodeURIComponent(filter)}`);
  if (cursor) parts.push(`cursor=${encodeURIComponent(cursor)}`);
  return `/api/feed?${parts.join("&")}`;
}

export function useFeed(filter: FeedFilter) {
  return useInfiniteQuery<
    FeedPage,
    Error,
    InfiniteData<FeedPage>,
    readonly ["feed", FeedFilter],
    string | null
  >({
    queryKey: ["feed", filter] as const,
    initialPageParam: null,
    queryFn: ({ pageParam }) => apiFetch<FeedPage>(buildFeedUrl(filter, pageParam)),
    getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
  });
}
