import { supabase } from "@/integrations/supabase/client";

export interface PrivateApplySlots {
  tier: string;
  used_today: number;
  max: number;
  remaining: number;
}

export function isUnlimitedApply(slots: PrivateApplySlots): boolean {
  return slots.max === -1;
}

export async function fetchPrivateApplySlots(): Promise<PrivateApplySlots> {
  const { data, error } = await supabase.rpc("private_apply_slots_remaining" as any);
  if (error) {
    console.error("Failed to fetch private apply slots:", error);
    return { tier: "FREE", used_today: 0, max: 15, remaining: 15 };
  }
  return data as unknown as PrivateApplySlots;
}

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
