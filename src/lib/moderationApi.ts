// src/lib/moderationApi.ts
import { apiFetch } from "./api";

export type BlockedUser = {
  id: string;
  username: string | null;
  displayName: string | null;
  blockedAt: string;
};

export async function pinReply(postId: string, replyId: string | null) {
  return apiFetch<{ ok: true; pinnedReplyId: string | null }>(`/api/posts/${postId}/pin`, {
    method: "POST",
    json: { replyId },
  });
}

export async function reportPost(postId: string, reason: string) {
  return apiFetch<{ ok: true }>(`/api/reports`, {
    method: "POST",
    json: { postId, reason },
  });
}

export async function reportReply(replyId: string, reason: string) {
  return apiFetch<{ ok: true }>(`/api/reports`, {
    method: "POST",
    json: { replyId, reason },
  });
}

export async function blockUser(userId: string) {
  return apiFetch<{ ok: true }>(`/api/blocks`, {
    method: "POST",
    json: { userId },
  });
}


export async function listBlockedUsers(limit = 50) {
  return apiFetch<{ items: BlockedUser[] }>(`/api/blocks?limit=${limit}`, { method: "GET" });
}

export async function unblockUser(userId: string) {
  return apiFetch<{ ok: true }>(`/api/blocks`, { method: "DELETE", json: { userId } });
}
