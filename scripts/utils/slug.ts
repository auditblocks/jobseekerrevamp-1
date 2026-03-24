import slugify from "slugify";

interface SlugInput {
  postName: string;
  organization: string;
  yearHint?: string | number | null;
  examName?: string | null;
}

export function generateJobSlug(input: SlugInput): string {
  const yearToken =
    typeof input.yearHint === "number"
      ? String(input.yearHint)
      : input.yearHint?.toString().trim() || deriveYearFromText(input.examName || "");

  const base = [input.postName, input.organization, yearToken].filter(Boolean).join(" ");

  return slugify(base, {
    lower: true,
    strict: true,
    trim: true,
  });
}

function deriveYearFromText(text: string): string | null {
  const yearMatch = text.match(/\b(20\d{2})\b/);
  return yearMatch ? yearMatch[1] : null;
}
