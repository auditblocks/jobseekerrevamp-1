import type { SupabaseClient } from "@supabase/supabase-js";

/** localStorage key for ?ref= / signup referral code (uppercased when stored). */
export const REFERRAL_PENDING_CODE_KEY = "referral_pending_code";

/**
 * Calls `referral_claim_code` for the pending localStorage code when the user is authenticated.
 * Clears storage on success (claimed / already attributed). Safe to call multiple times.
 */
export async function claimPendingReferralIfAny(client: SupabaseClient): Promise<void> {
  try {
    const code = localStorage.getItem(REFERRAL_PENDING_CODE_KEY);
    if (!code || code.trim().length < 4) return;
    const { data, error } = await client.rpc("referral_claim_code", { p_code: code.trim() });
    if (error) {
      console.warn("referral_claim_code:", error.message);
      return;
    }
    const row = data as { ok?: boolean; reason?: string } | null;
    if (row?.ok && row?.reason !== "invalid_code") {
      localStorage.removeItem(REFERRAL_PENDING_CODE_KEY);
    }
  } catch (e) {
    console.warn("claimPendingReferralIfAny:", e);
  }
}
