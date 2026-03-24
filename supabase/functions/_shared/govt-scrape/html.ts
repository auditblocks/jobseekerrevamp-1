import { parse } from "https://esm.sh/node-html-parser@6.1.13";
import {
  extractMainContentHtmlFromRoot,
  sanitizeAndWrapHtml,
  type HtmlParserRoot,
} from "./html-extract.ts";

export { extractMainContentHtmlFromRoot, sanitizeAndWrapHtml, MAIN_CONTENT_SELECTORS } from "./html-extract.ts";

export function extractMainContentHtml(html: string): string | null {
  const root = parse(html);
  return extractMainContentHtmlFromRoot(root as unknown as HtmlParserRoot);
}

export function extractDescriptionForGovtJob(html: string): string | null {
  const raw = extractMainContentHtml(html);
  return sanitizeAndWrapHtml(raw);
}
