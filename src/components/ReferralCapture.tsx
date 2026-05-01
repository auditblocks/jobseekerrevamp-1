/**
 * Persists `?ref=CODE` from the URL into localStorage so OAuth/email signup can
 * attribute the referee to a referrer via `referral_claim_code`.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { REFERRAL_PENDING_CODE_KEY } from "@/lib/referralStorage";

export function ReferralCapture() {
  const location = useLocation();

  useEffect(() => {
    const ref = new URLSearchParams(location.search).get("ref")?.trim();
    if (!ref || ref.length < 4) return;
    try {
      localStorage.setItem(REFERRAL_PENDING_CODE_KEY, ref.toUpperCase());
    } catch {
      /* ignore quota / private mode */
    }
  }, [location.search]);

  return null;
}
