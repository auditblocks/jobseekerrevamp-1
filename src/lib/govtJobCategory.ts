/**
 * Derives recruiting board, exam line, and display tags from govt job fields.
 * Fixes duplicate "UPSC" + "upsc" badges and mis-labelling when post titles imply SSC/RRB/etc.
 */

export interface GovtJobCategoryInput {
  post_name: string;
  organization: string;
  source_key?: string | null;
  tags?: string[] | null;
}

function norm(s: string): string {
  return s.trim().toUpperCase();
}

/** Recruiting body / commission shown as primary when no exam-specific line is used. */
export function inferRecruitmentBoard(
  postName: string,
  organization: string,
  sourceKey?: string | null,
): string {
  const combined = `${postName} ${organization}`;
  const t = norm(combined);
  const org = organization.trim();
  const orgU = norm(org);

  const rules: Array<[RegExp, string]> = [
    [/\bIBPS\b/, "IBPS"],
    [/\bSTATE BANK OF INDIA\b|\bSBI\b/, "SBI"],
    [/\bRRB\b|RAILWAY RECRUITMENT|INDIAN RAILWAY|RAILWAY RECRUITMENT BOARD/, "RRB"],
    [/\bSSC\b|STAFF SELECTION COMMISSION/, "SSC"],
    [/\bTNPSC\b|TAMIL NADU PUBLIC SERVICE/, "TNPSC"],
    [/\bAPPSC\b|ANDHRA PRADESH PUBLIC SERVICE/, "APPSC"],
    [/\bTSPSC\b|TELANGANA STATE PUBLIC SERVICE/, "TSPSC"],
    [/\bKPSC\b|KARNATAKA PUBLIC SERVICE/, "KPSC"],
    [/\bMPSC\b|MAHARASHTRA PUBLIC SERVICE/, "MPSC"],
    [/\bUPPSC\b|UTTAR PRADESH PUBLIC SERVICE/, "UPPSC"],
    [/\bBPSC\b|BIHAR PUBLIC SERVICE/, "BPSC"],
    [/\bWBPSC\b|WEST BENGAL PUBLIC SERVICE/, "WBPSC"],
    [/\bGPSC\b|GUJARAT PUBLIC SERVICE/, "GPSC"],
    [/\bMPPSC\b|MADHYA PRADESH PUBLIC SERVICE/, "MPPSC"],
    [/\bRPSC\b|RAJASTHAN PUBLIC SERVICE/, "RPSC"],
    [/\bOPSC\b|ODISHA PUBLIC SERVICE/, "OPSC"],
    [/\bNTA\b|NATIONAL TESTING AGENCY/, "NTA"],
    [/\bNABARD\b/, "NABARD"],
    [/\bRBI\b|RESERVE BANK OF INDIA/, "RBI"],
    [/\bESIC\b/, "ESIC"],
    [/\bEPFO\b|EMPLOYEES.? PROVIDENT FUND/, "EPFO"],
    [/\bUPSC\b|UNION PUBLIC SERVICE COMMISSION/, "UPSC"],
  ];

  for (const [re, label] of rules) {
    if (re.test(t)) return label;
  }

  if (org) {
    if (/STAFF SELECTION|SSC/i.test(org)) return "SSC";
    if (/UNION PUBLIC SERVICE|UPSC/i.test(org)) return "UPSC";
    if (/RAILWAY|RRB/i.test(org)) return "RRB";
  }

  const sk = (sourceKey || "").trim().toLowerCase();
  if (sk === "upsc") return "UPSC";
  if (sk === "ssc") return "SSC";

  return org || "Government";
}

/**
 * For UPSC-conducted exams, returns a human exam line (Civil Services, CAPF, …).
 * When board is not UPSC but the title clearly names a UPSC exam, still returns the line.
 */
export function inferExamFamilyLabel(postName: string, board: string): string | null {
  const p = postName;
  const boardIsUpsc = board === "UPSC";

  const tryMatch = (): string | null => {
    if (/Indian Forest Service|\bIFS\b/i.test(p)) return "Indian Forest Service";
    if (/Central Armed Police|\bCAPF\b/i.test(p)) return "CAPF";
    if (/Civil Services|\(Preliminary\).*Examination|CS\(P\)/i.test(p)) return "Civil Services";
    if (/Engineering Services|\bESE\b|\bIES\b/i.test(p)) return "Engineering Services";
    if (/Combined Geo-Scientist/i.test(p)) return "Combined Geo-Scientist";
    if (/Combined Medical Services|\bCMS\b/i.test(p)) return "Combined Medical Services";
    if (/\bNDA\b|National Defence Academy/i.test(p)) return "NDA";
    if (/\bCDS\b|Combined Defence Services/i.test(p)) return "CDS";
    if (/SO\/Steno|Section Officers/i.test(p)) return "SO / Steno";
    if (/Indian Economic Service|\bIES\b.*Economic/i.test(p)) return "Indian Economic Service";
    if (/Indian Statistical Service/i.test(p)) return "Indian Statistical Service";
    return null;
  };

  const line = tryMatch();
  if (!line) return null;
  if (boardIsUpsc) return line;
  if (/\bUPSC\b/i.test(p)) return line;
  return null;
}

/**
 * Label for job tracker rows (replaces generic "UPSC" for every central exam):
 * prefers exam line (e.g. CAPF, Civil Services) when detectable, else recruiting board.
 */
export function trackerOrganizationLabel(input: GovtJobCategoryInput): string {
  const board = inferRecruitmentBoard(input.post_name, input.organization, input.source_key);
  const line = inferExamFamilyLabel(input.post_name, board);
  return line || board;
}

function sourceKeyRedundantWithBoard(sourceKey: string | null | undefined, board: string): boolean {
  const k = (sourceKey || "").trim().toLowerCase().replace(/_/g, "-");
  if (!k) return true;
  const b = board.trim().toLowerCase().replace(/\s+/g, "");
  const boardSlug = board.trim().toLowerCase().replace(/\s+/g, "-");
  if (k === boardSlug || k === b) return true;
  if (board === "UPSC" && k === "upsc") return true;
  if (board === "SSC" && k === "ssc") return true;
  return false;
}

function formatSourceKeyBadge(sourceKey: string | null | undefined): string | null {
  const k = (sourceKey || "").trim().toLowerCase();
  if (!k) return null;
  const map: Record<string, string> = {
    freejobalert: "FreeJobAlert",
    upsc: "UPSC",
    ssc: "SSC",
  };
  return map[k] || k.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** Primary = exam line or board; secondary = board or data source when useful. */
export function getGovtJobCategoryBadges(input: GovtJobCategoryInput): {
  primary: string;
  secondary: string | null;
} {
  const board = inferRecruitmentBoard(input.post_name, input.organization, input.source_key);
  const examLine = inferExamFamilyLabel(input.post_name, board);

  if (examLine) {
    return { primary: examLine, secondary: board };
  }

  const src = formatSourceKeyBadge(input.source_key);
  if (src && !sourceKeyRedundantWithBoard(input.source_key, board)) {
    return { primary: board, secondary: src };
  }

  return { primary: board, secondary: null };
}

const GENERIC_TAGS = new Set([
  "government-job",
  "govt-job",
  "all-india",
  "state-wise",
  "central",
  "india",
]);

function examLineToTag(line: string): string {
  return line
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Tags for chips: exam-specific and board first; generic last; deduped. */
export function buildSmartTagsForDisplay(input: GovtJobCategoryInput): string[] {
  const board = inferRecruitmentBoard(input.post_name, input.organization, input.source_key);
  const examLine = inferExamFamilyLabel(input.post_name, board);

  const preferred: string[] = [];
  if (examLine) preferred.push(examLineToTag(examLine));
  preferred.push(board.toLowerCase().replace(/\s+/g, "-"));

  const fromDb = (input.tags || []).map((x) => x.trim().toLowerCase()).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (tag: string) => {
    const x = tag.toLowerCase();
    if (!x || seen.has(x)) return;
    seen.add(x);
    out.push(x);
  };

  for (const t of preferred) {
    if (!GENERIC_TAGS.has(t)) push(t);
  }
  for (const t of preferred) {
    if (GENERIC_TAGS.has(t)) push(t);
  }
  for (const t of fromDb) {
    if (t === "upsc" && examLine) continue;
    push(t);
  }

  return out.slice(0, 8);
}
