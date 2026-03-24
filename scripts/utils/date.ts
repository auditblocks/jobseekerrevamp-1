const MONTHS: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

export function parseGovDateToIso(input?: string | null): string | null {
  if (!input) return null;
  const normalized = input.replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  const ddmmyyyy = normalized.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  const yyyymmdd = normalized.match(/\b(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})\b/);
  if (yyyymmdd) {
    const [, y, m, d] = yyyymmdd;
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  const textual = normalized.match(/\b(\d{1,2})\s+([A-Za-z]+)\s*,?\s*(\d{4})\b/);
  if (textual) {
    const [, d, monthText, y] = textual;
    const month = MONTHS[monthText.toLowerCase()];
    if (!month) return null;
    return `${y}-${month}-${pad2(d)}`;
  }

  return null;
}

export function extractDateNearKeyword(text: string, keywordRegex: RegExp): string | null {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (!keywordRegex.test(line.toLowerCase())) continue;
    const parsed = parseGovDateToIso(line);
    if (parsed) return parsed;
  }

  return null;
}

function pad2(value: string): string {
  return value.padStart(2, "0");
}
