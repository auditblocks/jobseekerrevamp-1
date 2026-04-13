/**
 * @file html-extract — Parser-agnostic main-content extraction for govt job pages.
 *
 * Provides a prioritised list of CSS selectors to locate the "meaningful" content
 * region on government and job-portal pages. The selector order mirrors
 * `scripts/job-scraper.ts` so that the Edge Function and the local CLI scraper
 * produce consistent descriptions.
 *
 * Also provides `sanitizeAndWrapHtml` to strip scripts/event handlers before
 * persisting HTML fragments to the database.
 */

export const MAIN_CONTENT_SELECTORS = [
  ".region-content",
  ".view-content",
  ".notification-content",
  ".entry-content",
  ".post-content",
  ".single-post-content",
  ".article-content",
  ".field-item",
  "main",
  "article",
  ".guide-text",
] as const;

const MAX_DESCRIPTION_LENGTH = 500_000;

export interface HtmlParserRoot {
  querySelector(selector: string): HtmlParserElement | null;
}

export interface HtmlParserElement {
  innerHTML: string;
}

export function truncateHtmlFragment(html: string, maxLen: number): string {
  if (html.length <= maxLen) return html;
  return `${html.slice(0, maxLen)}\n<!-- truncated -->`;
}

/**
 * Returns inner HTML of the first matching region with meaningful content.
 */
export function extractMainContentHtmlFromRoot(root: HtmlParserRoot): string | null {
  // Walk selectors in priority order; require >40 chars to skip empty wrapper divs
  for (const sel of MAIN_CONTENT_SELECTORS) {
    const el = root.querySelector(sel);
    if (!el) continue;
    const inner = el.innerHTML?.trim();
    if (inner && inner.length > 40) {
      return truncateHtmlFragment(inner, MAX_DESCRIPTION_LENGTH);
    }
  }

  // Last resort: use <body> if it has substantial content
  const body = root.querySelector("body");
  if (body) {
    const inner = body.innerHTML?.trim();
    if (inner && inner.length > 100) {
      return truncateHtmlFragment(inner, MAX_DESCRIPTION_LENGTH);
    }
  }

  return null;
}

/** Same rules as scripts/utils/html.ts */
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
