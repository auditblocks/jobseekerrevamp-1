/**
 * Extract the object key inside the `resumes` bucket from a Supabase Storage URL
 * (public or signed). Used for authenticated client downloads.
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

  if (!/^https?:\/\//i.test(trimmed)) {
    const p = trimmed.replace(/^\/+/, "").replace(/^resumes\//, "");
    return p ? decodeURIComponent(p) : null;
  }

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
