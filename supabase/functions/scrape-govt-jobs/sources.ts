/**
 * Government job ingest sources (central + state PSCs).
 * Add new rows and implement the matching adapter; keep disabled until ready.
 */

export type GovtSourceAdapterId = "upsc_v1" | "ssc_notices_v1" | "freejobalert_v1";

export interface GovtJobSourceConfig {
  key: string;
  displayName: string;
  listingUrl: string;
  baseUrl: string;
  organization: string;
  /** Human-readable location line */
  location: string;
  /** IN = national; MH, TN, etc. for state bodies */
  stateCode: string | null;
  tags: string[];
  /** Fallback for master_exams.category when name match fails */
  masterExamCategoryFallback: string;
  adapter: GovtSourceAdapterId;
  enabled: boolean;
  /** Delay between HTTP fetches to same domain (ms) */
  requestDelayMs: number;
}

export const GOVT_JOB_SOURCES: GovtJobSourceConfig[] = [
  {
    key: "upsc",
    displayName: "UPSC — Active Examinations",
    listingUrl: "https://upsc.gov.in/examinations/active-exams",
    baseUrl: "https://upsc.gov.in",
    organization: "UPSC",
    location: "All India",
    stateCode: "IN",
    tags: ["upsc", "government-job", "central"],
    masterExamCategoryFallback: "UPSC",
    adapter: "upsc_v1",
    enabled: true,
    requestDelayMs: 400,
  },
  {
    key: "freejobalert",
    displayName: "FreeJobAlert — Government Jobs (All India + State)",
    listingUrl: "https://www.freejobalert.com/government-jobs/",
    baseUrl: "https://www.freejobalert.com",
    organization: "Government Jobs",
    location: "India",
    stateCode: null,
    tags: ["government-job", "all-india", "state-wise"],
    masterExamCategoryFallback: "Government",
    adapter: "freejobalert_v1",
    enabled: true,
    requestDelayMs: 400,
  },
  {
    key: "ssc",
    displayName: "SSC — Notices (coming soon)",
    listingUrl: "https://ssc.nic.in/MenuPages/Notices.aspx",
    baseUrl: "https://ssc.nic.in",
    organization: "SSC",
    location: "All India",
    stateCode: "IN",
    tags: ["ssc", "government-job", "central"],
    masterExamCategoryFallback: "SSC",
    adapter: "ssc_notices_v1",
    enabled: false,
    requestDelayMs: 500,
  },
];

/** Look up a single source config by its unique key (e.g. "upsc", "ssc"). */
export function getSourceByKey(key: string): GovtJobSourceConfig | undefined {
  return GOVT_JOB_SOURCES.find((s) => s.key === key);
}

/** Return only sources whose adapter is implemented and marked `enabled: true`. */
export function listEnabledSources(): GovtJobSourceConfig[] {
  return GOVT_JOB_SOURCES.filter((s) => s.enabled);
}

/** Compact view of all registered sources (enabled or not) — used in admin API responses. */
export function listSourceKeysForAdmin(): { key: string; displayName: string; enabled: boolean }[] {
  return GOVT_JOB_SOURCES.map((s) => ({
    key: s.key,
    displayName: s.displayName,
    enabled: s.enabled,
  }));
}

/** Comma-separated list of all registered source keys — used in error messages. */
export function formatRegisteredSourceKeys(): string {
  return GOVT_JOB_SOURCES.map((s) => s.key).join(", ");
}
