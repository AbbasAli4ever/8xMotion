import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Json = Record<string, unknown>;
type MagicProject = {
  id: string;
  status: "draft" | "queued" | "rendering" | "complete" | "error" | "canceled";
  credits_charged?: number;
  downloads?: Array<{ url: string }>;
  error?: { message?: string } | string | null;
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const messageOf = (value: unknown) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "message" in value) return String((value as { message?: unknown }).message ?? "Generation failed");
  return "Generation failed";
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const magicKey = Deno.env.get("MAGIC_HOUR_API_KEY");
    if (!magicKey) return json({ message: "Magic Hour is not configured" }, 500);

    const authHeader = request.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ message: "Authentication required" }, 401);

    const input = await request.json() as Json;
    const action = String(input.action ?? "");

    if (action === "start") {
      const generationRequest = input.request as Json;
      if (!generationRequest || !String(generationRequest.prompt ?? "").trim()) return json({ message: "Prompt is required" }, 400);

      const { data: reserved, error: reserveError } = await userClient.rpc("start_generation", { request: generationRequest });
      if (reserveError) return json({ message: reserveError.message }, reserveError.message.includes("credits") ? 402 : 400);

      const generationId = String((reserved as Json).id);
      const isVideo = String(generationRequest.mediaType) === "VIDEO";
      const endpoint = isVideo ? "text-to-video" : "ai-image-generator";
      const providerBody = isVideo ? {
        name: `8xMotion ${generationId}`,
        end_seconds: Number(generationRequest.duration ?? 4),
        aspect_ratio: String(generationRequest.aspectRatio ?? "16:9"),
        resolution: "480p",
        model: "ltx-2.5",
        audio: false,
        style: { prompt: String(generationRequest.prompt) },
      } : {
        name: `8xMotion ${generationId}`,
        image_count: Math.min(Math.max(Number(generationRequest.count ?? 1), 1), 4),
        model: "flux-schnell",
        aspect_ratio: String(generationRequest.aspectRatio ?? "1:1"),
        resolution: String(generationRequest.resolution ?? "1K").toLowerCase() === "1k" ? "1k" : "640px",
        style: { prompt: String(generationRequest.prompt), tool: "general" },
      };

      const providerResponse = await fetch(`https://api.magichour.ai/v1/${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${magicKey}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(providerBody),
      });
      const providerResult = await providerResponse.json() as Json;
      if (!providerResponse.ok || !providerResult.id) {
        await userClient.rpc("refund_failed_generation", { generation_uuid: generationId, failure_message: messageOf(providerResult) });
        return json({ message: messageOf(providerResult) }, providerResponse.status || 502);
      }

      await admin.from("generations").update({
        provider_project_id: String(providerResult.id),
        provider_credits: Number(providerResult.credits_charged ?? 0),
      }).eq("id", generationId).eq("user_id", user.id);
      return json({ id: generationId, status: "PROCESSING" });
    }

    if (action === "status") {
      const generationId = String(input.id ?? "");
      const { data: generation, error } = await admin.from("generations").select("*").eq("id", generationId).eq("user_id", user.id).single();
      if (error || !generation) return json({ message: "Generation not found" }, 404);
      if (generation.status !== "PROCESSING") {
        const { data: assets } = await admin.from("assets").select("id").eq("generation_id", generationId);
        return json({ status: generation.status, assets: assets ?? [], error: generation.error_message });
      }
      if (!generation.provider_project_id) return json({ status: "PROCESSING", assets: [] });

      const projectKind = generation.media_type === "VIDEO" ? "video" : "image";
      const providerResponse = await fetch(`https://api.magichour.ai/v1/${projectKind}-projects/${generation.provider_project_id}`, {
        headers: { Authorization: `Bearer ${magicKey}`, Accept: "application/json" },
      });
      const project = await providerResponse.json() as MagicProject;
      if (!providerResponse.ok) return json({ message: messageOf(project) }, providerResponse.status);
      if (["error", "canceled"].includes(project.status)) {
        const failure = messageOf(project.error ?? `Generation ${project.status}`);
        await userClient.rpc("refund_failed_generation", { generation_uuid: generationId, failure_message: failure });
        return json({ status: project.status === "canceled" ? "CANCELLED" : "FAILED", assets: [], error: failure });
      }
      if (project.status !== "complete") return json({ status: "PROCESSING", assets: [] });

      const existing = await admin.from("assets").select("id").eq("generation_id", generationId);
      if ((existing.data?.length ?? 0) > 0) return json({ status: "SUCCEEDED", assets: existing.data });

      const createdAssets: Array<{ id: string }> = [];
      for (const [index, download] of (project.downloads ?? []).entries()) {
        const mediaResponse = await fetch(download.url);
        if (!mediaResponse.ok) throw new Error("Could not save generated media");
        const contentType = mediaResponse.headers.get("content-type") ?? (projectKind === "video" ? "video/mp4" : "image/png");
        const extension = contentType.includes("video") ? "mp4" : contentType.includes("jpeg") ? "jpg" : "png";
        const objectPath = `${user.id}/${generationId}/${index}.${extension}`;
        const upload = await admin.storage.from("generated-assets").upload(objectPath, await mediaResponse.arrayBuffer(), { contentType, upsert: true });
        if (upload.error) throw upload.error;
        const asset = await admin.from("assets").insert({ user_id: user.id, generation_id: generationId, media_type: generation.media_type, preview_url: objectPath, content_type: contentType }).select("id").single();
        if (asset.error) throw asset.error;
        createdAssets.push(asset.data);
      }
      if (!createdAssets.length) throw new Error("Magic Hour completed without an output file");
      await admin.from("generations").update({ status: "SUCCEEDED", completed_at: new Date().toISOString(), provider_credits: project.credits_charged ?? generation.provider_credits }).eq("id", generationId);
      return json({ status: "SUCCEEDED", assets: createdAssets });
    }

    const signAsset = async (asset: Json) => {
      if (String(asset.preview_url).startsWith("/")) {
        return { id: asset.id, mediaType: asset.media_type, previewUrl: asset.preview_url, contentType: asset.content_type, createdAt: asset.created_at, generation: asset.generation };
      }
      const signed = await admin.storage.from("generated-assets").createSignedUrl(String(asset.preview_url), 3600);
      return { id: asset.id, mediaType: asset.media_type, previewUrl: signed.data?.signedUrl, contentType: asset.content_type, createdAt: asset.created_at, generation: asset.generation };
    };

    if (action === "asset") {
      const { data: asset } = await admin.from("assets").select("*").eq("id", String(input.id)).eq("user_id", user.id).single();
      if (!asset) return json({ message: "Asset not found" }, 404);
      return json(await signAsset(asset));
    }

    if (action === "assets") {
      let query = admin.from("assets").select("*,generation:generations(prompt)").eq("user_id", user.id).is("deleted_at", null).order("created_at", { ascending: false });
      if (input.mediaType) query = query.eq("media_type", String(input.mediaType));
      const { data, error } = await query;
      if (error) throw error;
      return json({ items: await Promise.all((data ?? []).map((asset) => signAsset(asset))) });
    }

    if (action === "download") {
      const { data: asset } = await admin.from("assets").select("preview_url").eq("id", String(input.id)).eq("user_id", user.id).single();
      if (!asset) return json({ message: "Asset not found" }, 404);
      const signed = await admin.storage.from("generated-assets").createSignedUrl(asset.preview_url, 900, { download: true });
      if (signed.error) throw signed.error;
      return json({ url: signed.data.signedUrl, expiresIn: 900 });
    }

    return json({ message: "Unsupported action" }, 400);
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : "Unexpected generation error" }, 500);
  }
});
