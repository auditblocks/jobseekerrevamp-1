/**
 * @file privateApplyPolicy.ts
 * Policy helpers for private (Naukri) job apply quotas.
 * Fetches daily apply slot limits from the `private_apply_slots_remaining` RPC
 * and provides a utility to retrieve the set of already-applied job IDs.
 */

import { supabase } from "@/integrations/supabase/client";

/** Daily apply quota returned by the `private_apply_slots_remaining` RPC. */
export interface PrivateApplySlots {
  tier: string;
  used_today: number;
  max: number;
  remaining: number;
}

/** Whether the user's tier grants unlimited daily applies (max === -1). */
export function isUnlimitedApply(slots: PrivateApplySlots): boolean {
  return slots.max === -1;
}

/**
 * Fetches the current user's remaining daily apply slots via RPC.
 * Falls back to a safe FREE-tier default on error.
 */
export async function fetchPrivateApplySlots(): Promise<PrivateApplySlots> {
  const { data, error } = await supabase.rpc("private_apply_slots_remaining" as any);
  if (error) {
    console.error("Failed to fetch private apply slots:", error);
    return { tier: "FREE", used_today: 0, max: 15, remaining: 15 };
  }
  return data as unknown as PrivateApplySlots;
}

/**
 * Returns a Set of Naukri job IDs the user has already applied to.
 * Used to disable the "Apply" button in the job listing UI.
 */
export async function fetchAppliedJobIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("private_job_applies" as any)
    .select("naukri_job_id")
    .eq("user_id", userId);
  if (error) {
    console.error("Failed to fetch applied job ids:", error);
    return new Set();
  }
  return new Set((data as any[]).map((r) => r.naukri_job_id));
}
