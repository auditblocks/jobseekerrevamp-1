import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";
import {
  extractMainContentHtmlFromRoot,
  sanitizeAndWrapHtml,
} from "../supabase/functions/_shared/govt-scrape/html-extract.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("govt-scrape html-extract", () => {
  it("extracts main block from UPSC-like fixture (.region-content)", () => {
    const html = readFileSync(join(__dirname, "fixtures/upsc-notification-sample.html"), "utf-8");
    const root = parse(html);
    const out = extractMainContentHtmlFromRoot(root);
    expect(out).toBeTruthy();
    expect(out).toContain("Civil Services Examination");
    expect(out).toContain("Eligibility");
  });

  it("sanitizeAndWrapHtml matches scripts/utils/html contract", () => {
    const wrapped = sanitizeAndWrapHtml("<p>Hello</p>");
    expect(wrapped).toContain("govt-notification-content");
    expect(wrapped).toContain("<p>Hello</p>");
  });

  it("returns null for empty fragment", () => {
    expect(sanitizeAndWrapHtml(null)).toBeNull();
    expect(sanitizeAndWrapHtml("   ")).toBeNull();
  });
});
