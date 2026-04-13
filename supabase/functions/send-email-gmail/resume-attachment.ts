/**
 * @file resume-attachment — Fetches a user's resume from Supabase Storage and
 * prepares it as a base64-encoded MIME attachment for the Gmail send flow.
 *
 * Handles multiple Supabase Storage URL formats (public, signed, authenticated,
 * and legacy path patterns) so the function works regardless of how the resume
 * was originally uploaded. Falls back to a direct HTTP fetch for signed/external URLs.
 *
 * Resume lookup order:
 *   1. `user_resumes` table (primary first, then most recent).
 *   2. Legacy `resumes` table (active resumes).
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { uint8ToBase64Mime } from "./email-format.ts";

export interface ResumeMimeAttachment {
  filename: string;
  mime: string;
  base64Body: string;
}

/** Map common resume file extensions to their MIME types; defaults to octet-stream. */
export function guessMimeFromResumeFileName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return "application/pdf";
  if (ext === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (ext === "doc") return "application/msword";
  if (ext === "txt") return "text/plain";
  return "application/octet-stream";
}

const guessMimeFromName = guessMimeFromResumeFileName;

/**
 * Resolve bucket + object path for Supabase Storage (same shapes as analyze-resume).
 * Also supports plain paths stored in DB (e.g. `userId/file.pdf`).
 * Prefer `URL.pathname` so host, query, and encoding are handled correctly.
 */
function parseStorageLocation(fileUrl: string): { bucket: string; path: string } | null {
  const trimmed = fileUrl.trim();
  if (!trimmed) return null;

  // Strip query params (tokens, cache-busters) before path analysis
  const noQuery = trimmed.split("?")[0] ?? trimmed;

  // Plain relative paths (e.g. "userId/file.pdf") default to the "resumes" bucket
  if (!/^https?:\/\//i.test(noQuery)) {
    const p = noQuery.replace(/^\/+/, "").replace(/^resumes\//, "");
    return p ? { bucket: "resumes", path: decodeURIComponent(p) } : null;
  }

  // Full URLs: parse with URL API first for correct encoding handling
  try {
    const pathname = new URL(trimmed).pathname;
    const storageMarker = "/storage/v1/object/";
    const si = pathname.indexOf(storageMarker);
    if (si !== -1) {
      const rest = pathname.slice(si + storageMarker.length);
      if (rest.startsWith("public/")) {
        const without = rest.slice("public/".length);
        const segments = without.split("/").filter(Boolean);
        if (segments.length >= 2) {
          const bucket = segments[0]!;
          const path = segments.slice(1).join("/");
          return { bucket, path: decodeURIComponent(path) };
        }
      }
      if (rest.startsWith("sign/")) {
        const without = rest.slice("sign/".length);
        const segments = without.split("/").filter(Boolean);
        if (segments.length >= 2) {
          const bucket = segments[0]!;
          const path = segments.slice(1).join("/");
          return { bucket, path: decodeURIComponent(path) };
        }
      }
      if (rest.startsWith("authenticated/")) {
        const without = rest.slice("authenticated/".length);
        const segments = without.split("/").filter(Boolean);
        if (segments.length >= 2) {
          const bucket = segments[0]!;
          const path = segments.slice(1).join("/");
          return { bucket, path: decodeURIComponent(path) };
        }
      }
      const segments = rest.split("/").filter(Boolean);
      if (segments.length >= 2) {
        const bucket = segments[0]!;
        const path = segments.slice(1).join("/");
        return { bucket, path: decodeURIComponent(path) };
      }
    }
  } catch {
    /* fall through — URL constructor may fail on malformed strings */
  }

  // Fallback: regex-based parsing when the URL object route above fails
  const storageMarker = "/storage/v1/object/";
  const si = noQuery.indexOf(storageMarker);
  if (si !== -1) {
    const rest = noQuery.slice(si + storageMarker.length);
    if (rest.startsWith("public/")) {
      const without = rest.slice("public/".length);
      const segments = without.split("/").filter(Boolean);
      if (segments.length >= 2) {
        const bucket = segments[0]!;
        const path = segments.slice(1).join("/");
        return { bucket, path: decodeURIComponent(path) };
      }
    }
    if (rest.startsWith("sign/")) {
      const without = rest.slice("sign/".length);
      const segments = without.split("/").filter(Boolean);
      if (segments.length >= 2) {
        const bucket = segments[0]!;
        const path = segments.slice(1).join("/");
        return { bucket, path: decodeURIComponent(path) };
      }
    }
    const segments = rest.split("/").filter(Boolean);
    if (segments.length >= 2) {
      const bucket = segments[0]!;
      const path = segments.slice(1).join("/");
      return { bucket, path: decodeURIComponent(path) };
    }
  }

  // Legacy URL patterns from older versions of the app's upload flow
  const legacyMarkers = [
    "/object/public/resumes/",
    "/object/sign/resumes/",
    "/object/authenticated/resumes/",
  ];
  for (const m of legacyMarkers) {
    const i = noQuery.indexOf(m);
    if (i !== -1) {
      const path = noQuery.slice(i + m.length);
      return path ? { bucket: "resumes", path: decodeURIComponent(path) } : null;
    }
  }

  return null;
}

/**
 * Download a resume binary from Supabase Storage (SDK route), falling back to a
 * direct HTTP fetch for signed/external URLs that can't be resolved to bucket+path.
 */
async function downloadResumeFromStorage(
  supabase: SupabaseClient,
  fileUrl: string,
): Promise<Uint8Array | null> {
  const trimmed = fileUrl.trim();
  const loc = parseStorageLocation(fileUrl);
  if (loc) {
    const { data, error } = await supabase.storage.from(loc.bucket).download(loc.path);
    if (data && !error) {
      return new Uint8Array(await data.arrayBuffer());
    }
    console.error(
      "[send-email-gmail] storage download failed",
      loc.bucket,
      loc.path,
      error?.message,
    );
  } else {
    console.error("[send-email-gmail] could not parse storage location from", fileUrl);
  }

  // Signed URLs with query token, or edge-case URLs: one-shot HTTP fetch
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const r = await fetch(trimmed);
      if (r.ok) {
        return new Uint8Array(await r.arrayBuffer());
      }
      console.error("[send-email-gmail] resume fetch failed", r.status, trimmed.slice(0, 120));
    } catch (e) {
      console.error("[send-email-gmail] resume fetch error", e);
    }
  }

  return null;
}

/**
 * Locate the user's primary resume and return it as a base64-encoded MIME attachment.
 * Checks `user_resumes` first (newer schema) then falls back to the legacy `resumes` table.
 */
export async function fetchPrimaryResumeForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<ResumeMimeAttachment | null> {
  // Prefer the newest primary resume from the user_resumes table
  const { data: urList } = await supabase
    .from("user_resumes")
    .select("file_url, file_name, file_type")
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  const ur = urList?.[0];
  if (ur?.file_url) {
    const buf = await downloadResumeFromStorage(supabase, ur.file_url);
    if (!buf || buf.length === 0) return null;
    const name = ur.file_name?.trim() || "resume.pdf";
    const mime = ur.file_type?.includes("pdf")
      ? "application/pdf"
      : ur.file_type?.includes("word")
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : guessMimeFromName(name);
    return { filename: name, mime, base64Body: uint8ToBase64Mime(buf) };
  }

  // Fallback: legacy resumes table (older user accounts may only have rows here)
  const { data: rlist } = await supabase
    .from("resumes")
    .select("file_url, name, file_type")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1);

  const opt = rlist?.[0];
  if (opt?.file_url) {
    const buf = await downloadResumeFromStorage(supabase, opt.file_url);
    if (!buf || buf.length === 0) return null;
    const name = `${(opt.name || "resume").replace(/[^\w.-]+/g, "_")}.${opt.file_type || "pdf"}`;
    const mime = guessMimeFromName(name);
    return { filename: name, mime, base64Body: uint8ToBase64Mime(buf) };
  }

  return null;
}
