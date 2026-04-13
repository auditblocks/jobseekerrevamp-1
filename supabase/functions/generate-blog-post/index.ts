/**
 * @module generate-blog-post
 * @description Supabase Edge Function (superadmin-only) that generates a blog post draft
 * using AI via OpenRouter. Accepts a topic, optional SEO focus keyword, tone, and target
 * audience, then produces structured HTML content with meta tags. Optionally fetches a
 * stock photo from Pexels/Unsplash and uploads it to Supabase Storage as the featured
 * image. The generated post is sanitized against XSS before being persisted to `blogs`.
 *
 * @route POST /generate-blog-post  (authenticated, superadmin role required)
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_MODEL = "google/gemini-2.0-flash-001";
const META_TITLE_MAX = 60;
const META_DESC_MAX = 160;
const ALLOWED_HTML_TAGS = new Set([
  "p",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "a",
  "strong",
  "em",
  "u",
  "s",
  "blockquote",
  "br",
]);

const AI_DISCLAIMER_HTML =
  '<p class="text-muted-foreground text-sm border-t border-border pt-4 mt-8"><em>AI-assisted draft — verify facts before publishing.</em></p>';

interface BlogAiJson {
  title: string;
  short_description: string;
  content_html: string;
  author: string;
  meta_title: string;
  meta_description: string;
  focus_keyword: string;
  suggested_slug?: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
}

function truncateSeo(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return t.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
}

/** Strip scripts, styles, event handlers, and non-Tiptap tags from AI-generated HTML. */
function sanitizeBlogHtml(html: string): string {
  let s = html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style\b[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<\/?(?:iframe|object|embed|form|input|button|meta|link|base)\b[^>]*>/gi, "");
  s = s.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  s = s.replace(/javascript:/gi, "");

  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
  return s.replace(tagRe, (full, tagName: string) => {
    const lower = tagName.toLowerCase();
    if (ALLOWED_HTML_TAGS.has(lower)) return full;
    return "";
  });
}

/** Incrementally suffix the slug until no collision exists in the blogs table. */
async function ensureUniqueSlug(supabase: SupabaseClient, baseSlug: string): Promise<string> {
  const sanitized = slugify(baseSlug) || "blog-post";
  let n = 0;
  while (true) {
    const candidate = n === 0 ? sanitized : `${sanitized}-${n + 1}`;
    const { data } = await supabase.from("blogs").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
    n += 1;
  }
}

/** Search Pexels for a relevant stock photo; returns null if the API key is missing or no results. */
async function fetchPexelsImageUrl(query: string): Promise<{ url: string; contentType: string } | null> {
  const key = Deno.env.get("PEXELS_API_KEY");
  if (!key?.trim()) return null;
  const q = encodeURIComponent(query.slice(0, 200));
  const res = await fetch(`https://api.pexels.com/v1/search?query=${q}&per_page=1`, {
    headers: { Authorization: key.trim() },
  });
  if (!res.ok) {
    console.warn("Pexels search failed:", res.status);
    return null;
  }
  const data = await res.json();
  const photo = data?.photos?.[0];
  const url = photo?.src?.large || photo?.src?.original;
  if (typeof url !== "string") return null;
  return { url, contentType: "image/jpeg" };
}

/** Fallback stock photo provider; used when Pexels yields no results. */
async function fetchUnsplashImageUrl(query: string): Promise<{ url: string; contentType: string } | null> {
  const key = Deno.env.get("UNSPLASH_ACCESS_KEY");
  if (!key?.trim()) return null;
  const q = encodeURIComponent(query.slice(0, 200));
  const res = await fetch(`https://api.unsplash.com/search/photos?query=${q}&per_page=1`, {
    headers: { Authorization: `Client-ID ${key.trim()}` },
  });
  if (!res.ok) {
    console.warn("Unsplash search failed:", res.status);
    return null;
  }
  const data = await res.json();
  const photo = data?.results?.[0];
  const url = photo?.urls?.regular || photo?.urls?.full;
  if (typeof url !== "string") return null;
  return { url, contentType: "image/jpeg" };
}

/** Download a remote image and upload it to Supabase Storage under the blog-images bucket. */
async function downloadAndUploadFeaturedImage(
  supabase: SupabaseClient,
  imageUrl: string,
  contentType: string,
  storagePath: string,
): Promise<string | null> {
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      console.warn("Stock image download failed:", imgRes.status);
      return null;
    }
    const buf = new Uint8Array(await imgRes.arrayBuffer());
    const ct = imgRes.headers.get("content-type")?.split(";")[0]?.trim() || contentType;
    const { error } = await supabase.storage.from("blog-images").upload(storagePath, buf, {
      contentType: ct || "image/jpeg",
      upsert: false,
    });
    if (error) {
      console.warn("blog-images upload failed:", error.message);
      return null;
    }
    const { data: pub } = supabase.storage.from("blog-images").getPublicUrl(storagePath);
    return pub?.publicUrl ?? null;
  } catch (e) {
    console.warn("Featured image pipeline error:", e);
    return null;
  }
}

/** Parse and validate the JSON response from the AI model, stripping markdown fences if present. */
function parseBlogAiResponse(raw: string): BlogAiJson {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```json\n?/, "").replace(/\n?```$/, "");
  cleaned = cleaned.replace(/^```\n?/, "").replace(/\n?```$/, "");
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  const title = String(parsed.title ?? "").trim();
  const short_description = String(parsed.short_description ?? "").trim();
  const content_html = String(parsed.content_html ?? "").trim();
  const author = String(parsed.author ?? "").trim();
  const meta_title = String(parsed.meta_title ?? title).trim();
  const meta_description = String(parsed.meta_description ?? short_description).trim();
  const focus_keyword = String(parsed.focus_keyword ?? "").trim();
  const suggested_slug =
    typeof parsed.suggested_slug === "string" ? parsed.suggested_slug.trim() : undefined;
  if (!title || !content_html) {
    throw new Error("Invalid AI response: missing title or content_html");
  }
  return {
    title,
    short_description,
    content_html,
    author,
    meta_title,
    meta_description,
    focus_keyword,
    suggested_slug,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ success: false, message: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ success: false, message: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return json({ success: false, message: "Server misconfiguration" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return json({ success: false, message: "Invalid or expired session" }, 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || profile?.role !== "superadmin") {
      return json({ success: false, message: "Forbidden: superadmin only" }, 403);
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ success: false, message: "Invalid JSON body" }, 400);
    }

    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    if (!topic) {
      return json({ success: false, message: "topic is required" }, 400);
    }

    const focusKeywordInput =
      typeof body.focus_keyword === "string" && body.focus_keyword.trim()
        ? body.focus_keyword.trim()
        : topic.split(/\s+/).slice(0, 5).join(" ");

    const tone = typeof body.tone === "string" ? body.tone.trim() : "";
    const target_audience = typeof body.target_audience === "string" ? body.target_audience.trim() : "";
    const language = typeof body.language === "string" ? body.language.trim() : "English";

    const publish_mode = body.publish_mode === "published" ? "published" : "draft";
    const image_mode = body.image_mode === "none" ? "none" : "stock";

    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openRouterKey?.trim()) {
      return json({ success: false, message: "Blog generation is not configured (missing AI key)" }, 500);
    }

    const defaultAuthor = Deno.env.get("BLOG_DEFAULT_AUTHOR")?.trim() || "";

    const systemPrompt = `You are an expert career and exam-prep content writer for an Indian job-seeker audience.
Respond with ONE JSON object only (no markdown fences). Keys exactly:
title (string), short_description (string, 1-2 sentences), content_html (string, valid HTML body only),
author (string, display name), meta_title (string), meta_description (string), focus_keyword (string),
suggested_slug (optional string, URL slug, lowercase hyphenated).

Rules for content_html:
- Use only these tags: p, h2, h3, ul, ol, li, a (href only to https URLs), strong, em, u, s, blockquote, br.
- No script, style, inline event handlers, or iframes.
- Structure: intro (p), 2-4 h2 sections with paragraphs and lists where useful, conclusion (p).
- Be factual and neutral; avoid guarantees about jobs or exam results.`;

    const userPrompt = `Write a blog post draft.

Topic: ${topic}
Focus keyword (SEO): ${focusKeywordInput}
Language: ${language}
${tone ? `Tone: ${tone}` : ""}
${target_audience ? `Target audience: ${target_audience}` : ""}

meta_title should include the focus keyword naturally. meta_description should be compelling and under 155 characters of readable prose (we will truncate if needed).
suggested_slug should be short and descriptive.`;

    const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openRouterKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!orRes.ok) {
      const errText = await orRes.text();
      console.error("OpenRouter error:", orRes.status, errText.slice(0, 500));
      return json({ success: false, message: "AI generation failed" }, 500);
    }

    const orData = await orRes.json();
    const rawContent = orData?.choices?.[0]?.message?.content;
    if (typeof rawContent !== "string") {
      return json({ success: false, message: "Empty AI response" }, 500);
    }

    let ai: BlogAiJson;
    try {
      ai = parseBlogAiResponse(rawContent);
    } catch (e) {
      console.error("Parse AI JSON failed:", e);
      return json({ success: false, message: "Could not parse AI output" }, 500);
    }

    const slugBase = ai.suggested_slug || ai.title;
    const slug = await ensureUniqueSlug(supabase, slugBase);

    const meta_title = truncateSeo(ai.meta_title || ai.title, META_TITLE_MAX);
    const meta_description = truncateSeo(
      ai.meta_description || ai.short_description,
      META_DESC_MAX,
    );
    const focus_keyword = (ai.focus_keyword || focusKeywordInput).slice(0, 200);
    const author = defaultAuthor || ai.author || "Editorial";

    let innerHtml = sanitizeBlogHtml(ai.content_html);
    const content = `${innerHtml}\n${AI_DISCLAIMER_HTML}`;

    let featured_image_url: string | null = null;
    if (image_mode === "stock") {
      const stockQuery = focus_keyword || ai.title;
      let stock = await fetchPexelsImageUrl(stockQuery);
      if (!stock) stock = await fetchUnsplashImageUrl(stockQuery);
      if (!stock) {
        console.warn("No stock image API key or no results; continuing without featured image");
      } else {
        const ts = Date.now();
        const path = `auto/${slug}-${ts}.jpg`;
        featured_image_url = await downloadAndUploadFeaturedImage(supabase, stock.url, stock.contentType, path);
      }
    }

    const status = publish_mode === "published" ? "published" : "draft";
    const published_at = status === "published" ? new Date().toISOString() : null;

    const { data: inserted, error: insertError } = await supabase
      .from("blogs")
      .insert({
        title: ai.title,
        slug,
        short_description: ai.short_description || null,
        content,
        featured_image_url,
        author,
        status,
        published_at,
        meta_title: meta_title || null,
        meta_description: meta_description || null,
        focus_keyword: focus_keyword || null,
      })
      .select("id, slug, featured_image_url")
      .single();

    if (insertError || !inserted) {
      console.error("blogs insert error:", insertError);
      return json({ success: false, message: "Failed to save blog post" }, 500);
    }

    return json({
      success: true,
      message: "Blog draft created",
      data: {
        id: inserted.id,
        slug: inserted.slug,
        featured_image_url: inserted.featured_image_url,
      },
    });
  } catch (e) {
    console.error("generate-blog-post error:", e);
    return json({ success: false, message: "Unexpected server error" }, 500);
  }
});
