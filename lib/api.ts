export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export type ApiErrorBody = { message?: string | string[]; fields?: Record<string, string> };

export class ApiError extends Error {
  constructor(public status: number, public body: ApiErrorBody) { super(Array.isArray(body.message) ? body.message.join(", ") : body.message ?? `Request failed (${status})`); }
}

export function getAccessToken() { return typeof window === "undefined" ? null : window.localStorage.getItem("8xmotion_access_token"); }
export function setAccessToken(token: string | null) { if (typeof window === "undefined") return; if (token) window.localStorage.setItem("8xmotion_access_token", token); else window.localStorage.removeItem("8xmotion_access_token"); }

async function raw<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...init, credentials: "include", headers: { ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...init.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  const body = response.status === 204 ? undefined : await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, body);
  return body as T;
}

export async function refreshSession() {
  const session = await raw<{ accessToken: string; user: ApiUser }>("/auth/refresh", { method: "POST" });
  setAccessToken(session.accessToken); return session;
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  try { return await raw<T>(path, init, getAccessToken()); }
  catch (error) {
    if (retry && error instanceof ApiError && error.status === 401 && path !== "/auth/refresh") { await refreshSession(); return api<T>(path, init, false); }
    throw error;
  }
}

export type ApiUser = { id: string; email: string; firstName: string; lastName: string; role: "USER" | "ADMIN" };
export type GenerationAsset = { id: string; mediaType: "IMAGE" | "VIDEO"; previewUrl?: string; contentType: string; createdAt: string; generation?: { prompt: string } };
export type CapabilityModel = { slug: string; displayName: string; mediaType: "IMAGE" | "VIDEO"; capabilities: { aspectRatios: string[]; resolutions: string[]; durations?: number[]; qualities?: string[]; maxCount: number; references?: boolean }; prices: Array<{ duration: number | null; resolution: string | null; unitCost: string }> };
