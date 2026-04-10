import { supabase } from "@/integrations/supabase/client";

export interface PracticeSlots {
  tier: string;
  used: number;
  max: number;
  remaining: number;
}

const UNLIMITED = -1;

export function isUnlimited(slots: PracticeSlots): boolean {
  return slots.max === UNLIMITED;
}

export function isProMax(tier: string | undefined | null): boolean {
  return tier === "PRO_MAX";
}

export function isPaidUser(tier: string | undefined | null): boolean {
  return tier === "PRO" || tier === "PRO_MAX";
}

export function canDeleteTrackerRow(tier: string | undefined | null): boolean {
  return tier === "PRO" || tier === "PRO_MAX";
}

export async function fetchPracticeSlots(): Promise<PracticeSlots> {
  const { data, error } = await supabase.rpc("govt_practice_slots_remaining" as any);
  if (error) {
    console.error("Failed to fetch practice slots:", error);
    return { tier: "FREE", used: 0, max: 2, remaining: 2 };
  }
  return data as unknown as PracticeSlots;
}

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
