import { supabase } from './lib/supabase';

// =========================================================================
// SESSION ID — dùng để nối câu hỏi/đánh giá đúng người dùng, đúng phiên chat.
// =========================================================================
const SESSION_STORAGE_KEY = "tanmy_chat_session_id";

function generateUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getSessionId(): string {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return generateUuid();
  }
  let sessionId = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = generateUuid();
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

// =========================================================================
// GHI NHẬT KÝ CHAT
// =========================================================================
export async function logChatMessage(params: {
  cauHoi: string;
  aiTraLoi: string;
  nguonDuLieu?: string;
}): Promise<void> {
  try {
    const res = await fetch("/api/log-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: getSessionId(),
        cauHoi: params.cauHoi,
        aiTraLoi: params.aiTraLoi,
        nguonDuLieu: params.nguonDuLieu || "",
      }),
    });
    if (!res.ok) {
      console.error("Lỗi khi ghi nhật ký chat (API response):", await res.text());
    }
  } catch (error) {
    console.error("Lỗi khi gọi API log-chat:", error);
  }
}

// =========================================================================
// ĐÁNH GIÁ LIKE/DISLIKE
// =========================================================================
export type Danhgia = "Like" | "Dislike";

export async function submitRating(params: {
  cauHoi: string;
  danhGia: Danhgia;
}): Promise<boolean> {
  try {
    const res = await fetch("/api/rate-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: getSessionId(),
        cauHoi: params.cauHoi,
        danhGia: params.danhGia,
      }),
    });

    if (!res.ok) {
      console.error("Lỗi khi đánh giá (API response):", await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("Error submitting rating:", e);
    return false;
  }
}