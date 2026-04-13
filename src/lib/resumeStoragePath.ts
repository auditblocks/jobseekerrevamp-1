/**
 * @file resumeStoragePath.ts
 * Extracts the storage object path from various forms of Supabase Storage URLs
 * for the `resumes` bucket, enabling consistent client-side downloads.
 */

/**
 * Extract the object key inside the `resumes` bucket from a Supabase Storage URL
 * (public, signed, or authenticated). Also handles bare relative paths.
 *
 * @param fileUrl - Full URL or relative path pointing to a resume file.
 * @returns The decoded object key (e.g. `"user-id/resume.pdf"`), or `null` if unparseable.
 */
export function storagePathFromResumeFileUrl(fileUrl: string): string | null {
  const trimmed = fileUrl.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const pathname = url.pathname;
    const markers = [
      "/storage/v1/object/public/resumes/",
      "/storage/v1/object/sign/resumes/",
      "/storage/v1/object/authenticated/resumes/",
    ];
    for (const m of markers) {
      const i = pathname.indexOf(m);
      if (i !== -1) {
        const path = pathname.slice(i + m.length);
        return path ? decodeURIComponent(path) : null;
      }
    }
  } catch {
    /* not a valid absolute URL */
  }

  // Treat as a bare relative path (e.g. "user-id/resume.pdf" or "/resumes/...")
  if (!/^https?:\/\//i.test(trimmed)) {
    const p = trimmed.replace(/^\/+/, "").replace(/^resumes\//, "");
    return p ? decodeURIComponent(p) : null;
  }

  // Fallback: strip query string and try known path markers
  const noQuery = trimmed.split("?")[0] ?? trimmed;
  for (const m of ["/object/public/resumes/", "/object/sign/resumes/", "/object/authenticated/resumes/"]) {
    const i = noQuery.indexOf(m);
    if (i !== -1) {
      const path = noQuery.slice(i + m.length);
      return path ? decodeURIComponent(path) : null;
    }
  }

  return null;
}
