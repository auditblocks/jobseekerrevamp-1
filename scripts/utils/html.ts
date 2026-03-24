export function sanitizeAndWrapHtml(rawHtml?: string | null): string | null {
  if (!rawHtml) return null;

  const cleaned = rawHtml
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .trim();

  if (!cleaned) return null;
  return `<div class="govt-notification-content">${cleaned}</div>`;
}
