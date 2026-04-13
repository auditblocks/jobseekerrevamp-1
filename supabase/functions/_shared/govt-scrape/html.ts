/**
 * @file html — Convenience wrappers that combine `node-html-parser` parsing
 * with the parser-agnostic extractors in `html-extract.ts`.
 *
 * Edge Functions import from this file to get a one-call "HTML string → clean
 * description" pipeline without managing the parser instance directly.
 * `html-extract.ts` is kept parser-agnostic so unit tests can inject a mock root.
 */
import { parse } from "https://esm.sh/node-html-parser@6.1.13";
import {
  extractMainContentHtmlFromRoot,
  sanitizeAndWrapHtml,
  type HtmlParserRoot,
} from "./html-extract.ts";

export { extractMainContentHtmlFromRoot, sanitizeAndWrapHtml, MAIN_CONTENT_SELECTORS } from "./html-extract.ts";

/** Parse raw HTML and extract the main content region. */
export function extractMainContentHtml(html: string): string | null {
  const root = parse(html);
  return extractMainContentHtmlFromRoot(root as unknown as HtmlParserRoot);
}

/** End-to-end: parse HTML → extract main content → sanitize and wrap for DB storage. */
export function extractDescriptionForGovtJob(html: string): string | null {
  const raw = extractMainContentHtml(html);
  return sanitizeAndWrapHtml(raw);
}
