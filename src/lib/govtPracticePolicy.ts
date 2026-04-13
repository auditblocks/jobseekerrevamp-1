/**
 * @file govtPracticePolicy.ts
 * Policy helpers for government exam practice features.
 * Exposes tier-gated slot limits and fetches remaining practice/tracker quotas
 * from the `govt_practice_slots_remaining` Supabase RPC.
 */

import { supabase } from "@/integrations/supabase/client";

/** Slot quota returned by the `govt_practice_slots_remaining` RPC. */
export interface PracticeSlots {
  tier: string;
  used: number;
  max: number;
  remaining: number;
}

/** Sentinel value the RPC uses to indicate unlimited slots. */
const UNLIMITED = -1;

/** Whether the user has unlimited practice attempts (PRO_MAX tier). */
export function isUnlimited(slots: PracticeSlots): boolean {
  return slots.max === UNLIMITED;
}

/** Check if the subscription tier is PRO_MAX. */
export function isProMax(tier: string | undefined | null): boolean {
  return tier === "PRO_MAX";
}

/** Check if the user is on any paid tier (PRO or PRO_MAX). */
export function isPaidUser(tier: string | undefined | null): boolean {
  return tier === "PRO" || tier === "PRO_MAX";
}

/** Only paid users may delete rows from their govt job tracker. */
export function canDeleteTrackerRow(tier: string | undefined | null): boolean {
  return tier === "PRO" || tier === "PRO_MAX";
}

/**
 * Fetches the current user's remaining practice slots via RPC.
 * Falls back to a safe FREE-tier default on error.
 */
export async function fetchPracticeSlots(): Promise<PracticeSlots> {
  const { data, error } = await supabase.rpc("govt_practice_slots_remaining" as any);
  if (error) {
    console.error("Failed to fetch practice slots:", error);
    return { tier: "FREE", used: 0, max: 2, remaining: 2 };
  }
  return data as unknown as PracticeSlots;
}

/**
 * Returns a Set of govt job IDs the user has added to their tracker.
 * Used to toggle "tracked" UI state without re-querying per card.
 */
export async function fetchTrackedJobIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("job_tracker" as any)
    .select("job_id")
    .eq("user_id", userId)
    .not("job_id", "is", null);
  if (error) {
    console.error("Failed to fetch tracked job ids:", error);
    return new Set();
  }
  return new Set((data as any[]).map((r) => r.job_id));
}
