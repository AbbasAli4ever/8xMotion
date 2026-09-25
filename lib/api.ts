import { supabase } from "@/lib/supabase";

export type ApiErrorBody = { message?: string | string[]; fields?: Record<string, string> };
export class ApiError extends Error {
  constructor(public status: number, public body: ApiErrorBody) { super(Array.isArray(body.message) ? body.message.join(", ") : body.message ?? `Request failed (${status})`); }
}
const fail = (message: string, status = 400): never => { throw new ApiError(status, { message }); };
const bodyOf = (init: RequestInit) => init.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
const invokeGenerations = async <T>(payload: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("generations", { body: payload });
  if (error) {
    const context = (error as { context?: Response }).context;
    let message = error.message;
    const status = context?.status ?? 500;
    if (context) {
      try {
        const details = await context.clone().json() as { message?: string };
        message = details.message ?? message;
      } catch { /* retain the function client error */ }
    }
    throw new ApiError(status, { message });
  }
  return data as T;
};
const profile = (row: Record<string, unknown>): ApiUser => {
  const email = String(row.email);
  const firstName = String(row.first_name ?? "").trim() || email.split("@")[0];
  return { id: String(row.id), email, firstName, lastName: String(row.last_name ?? "").trim(), role: String(row.role ?? "USER") as ApiUser["role"] };
};

export async function refreshSession() {
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session) fail(error?.message ?? "Session expired", 401);
  const session = data.session;
  if (!session) throw new ApiError(401, { message: "Session expired" });
  const user = session.user;
  return { accessToken: session.access_token, user: { id: user.id, email: user.email ?? "", firstName: String(user.user_metadata.first_name ?? ""), lastName: String(user.user_metadata.last_name ?? ""), role: "USER" as const } };
}
export async function setAccessToken(token: string | null) { if (!token) await supabase.auth.signOut(); }

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method ?? "GET";
  const body = bodyOf(init);
  const url = new URL(path, "https://supabase.local");
  let result: unknown;
  let error: { message: string; code?: string } | null = null;

  if (path === "/users/me" && method === "GET") {
    const response = await supabase.from("profiles").select("*").single(); error = response.error; result = response.data && profile(response.data);
  } else if (path === "/users/me" && method === "PATCH") {
    const user = (await supabase.auth.getUser()).data.user; if (!user) throw new ApiError(401, { message: "Authentication required" });
    const response = await supabase.from("profiles").update({ first_name: body.firstName, last_name: body.lastName }).eq("id", user.id).select().single(); error = response.error; result = response.data && profile(response.data);
  } else if (path === "/credits/balance") {
    const response = await supabase.rpc("get_credit_balance"); error = response.error; result = { balance: String(response.data ?? 0) };
  } else if (path === "/generation-capabilities") {
    const response = await supabase.from("model_definitions").select("id,slug,display_name,media_type,capabilities,generation_prices(duration,resolution,unit_cost)").eq("active", true); error = response.error;
    result = { models: (response.data ?? []).map((item) => ({ id: item.id, slug: item.slug, displayName: item.display_name, mediaType: item.media_type, capabilities: item.capabilities, prices: item.generation_prices.map((price) => ({ duration: price.duration, resolution: price.resolution, unitCost: String(price.unit_cost) })) })) };
  } else if (path === "/plans") {
    const response = await supabase.from("plans").select("*").eq("active", true); error = response.error;
    result = (response.data ?? []).map((item) => ({ id: item.id, slug: item.slug, name: item.name, monthlyPriceCents: item.monthly_price_cents, yearlyPriceCents: item.yearly_price_cents, monthlyCredits: String(item.monthly_credits) }));
  } else if (path === "/credit-packs") {
    const response = await supabase.from("credit_packs").select("*").eq("active", true); error = response.error;
    result = (response.data ?? []).map((item) => ({ id: item.id, slug: item.slug, name: item.name, priceCents: item.price_cents, credits: String(item.credits) }));
  } else if (path === "/subscriptions/me") {
    const response = await supabase.from("subscriptions").select("*,plan:plans(*)").maybeSingle(); error = response.error;
    const item = response.data; result = item ? { id: item.id, planId: item.plan_id, interval: item.interval, status: item.status, currentPeriodEnd: item.current_period_end, cancelAtPeriodEnd: item.cancel_at_period_end, plan: item.plan && { id: item.plan.id, slug: item.plan.slug, name: item.plan.name, monthlyPriceCents: item.plan.monthly_price_cents, yearlyPriceCents: item.plan.yearly_price_cents, monthlyCredits: String(item.plan.monthly_credits) } } : null;
  } else if (path === "/mock-checkout/subscriptions" && method === "POST") {
    const response = await supabase.rpc("mock_subscribe", { plan_slug: body.planSlug, billing_interval: body.interval }); error = response.error; result = response.data;
  } else if (path === "/mock-checkout/top-ups" && method === "POST") {
    const response = await supabase.rpc("mock_top_up", { pack_slug: body.packSlug }); error = response.error; result = response.data;
  } else if (path === "/subscriptions/cancel" && method === "POST") {
    const response = await supabase.rpc("cancel_subscription"); error = response.error; result = response.data;
  } else if (path === "/uploads/presign" && method === "POST") {
    const user = (await supabase.auth.getUser()).data.user; if (!user) throw new ApiError(401, { message: "Authentication required" });
    const objectPath = `${user.id}/${crypto.randomUUID()}-${String(body.filename).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const upload = await supabase.from("uploads").insert({ user_id: user.id, object_path: objectPath, filename: body.filename, content_type: body.contentType, size: body.size }).select().single(); if (upload.error) fail(upload.error.message);
    const signed = await supabase.storage.from("references").createSignedUploadUrl(objectPath); if (signed.error || !signed.data) throw new ApiError(400, { message: signed.error?.message ?? "Could not create upload URL" });
    result = { uploadId: upload.data.id, uploadUrl: signed.data.signedUrl, headers: { "Content-Type": String(body.contentType), "x-upsert": "false" } };
  } else if (path === "/uploads/complete" && method === "POST") {
    const response = await supabase.from("uploads").update({ status: "READY" }).eq("id", body.uploadId).select().single(); error = response.error; result = response.data;
  } else if (/^\/generations\/(images|videos)$/.test(path) && method === "POST") {
    result = await invokeGenerations({ action: "start", request: body });
  } else if (/^\/generations\/[0-9a-f-]+$/.test(url.pathname) && method === "GET") {
    result = await invokeGenerations({ action: "status", id: url.pathname.split("/").pop() });
  } else if (url.pathname === "/assets" && method === "GET") {
    result = await invokeGenerations({ action: "assets", mediaType: url.searchParams.get("mediaType") ?? undefined });
  } else if (/^\/assets\/[0-9a-f-]+(\/download)?$/.test(url.pathname)) {
    const parts = url.pathname.split("/");
    result = await invokeGenerations({ action: parts[3] === "download" ? "download" : "asset", id: parts[2] });
  } else if (path === "/auth/logout") {
    const response = await supabase.auth.signOut(); error = response.error; result = { message: "Logged out" };
  } else fail(`Unsupported Supabase API operation: ${method} ${path}`, 404);

  if (error) fail(error.message, error.code === "PGRST301" ? 401 : 400);
  return result as T;
}

export type ApiUser = { id: string; email: string; firstName: string; lastName: string; role: "USER" | "ADMIN" };
export type GenerationAsset = { id: string; mediaType: "IMAGE" | "VIDEO"; previewUrl?: string; contentType: string; createdAt: string; generation?: { prompt: string } };
export type CapabilityModel = { slug: string; displayName: string; mediaType: "IMAGE" | "VIDEO"; capabilities: { aspectRatios: string[]; resolutions: string[]; durations?: number[]; qualities?: string[]; maxCount: number; references?: boolean }; prices: Array<{ duration: number | null; resolution: string | null; unitCost: string }> };
