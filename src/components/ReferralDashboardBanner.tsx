/**
 * Compact dashboard strip when a referral bonus is active or rewards are queued.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Gift } from "lucide-react";

type Status = {
  active_grant: { expires_at?: string } | null;
  queued_count?: number;
  qualified_referrals_count?: number;
  program_enabled?: boolean;
};

export function ReferralDashboardBanner() {
  const { user } = useAuth();
  const [st, setSt] = useState<Status | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("referral_my_status");
        if (error || cancelled) return;
        setSt(data as Status);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const active = !!st?.active_grant;
  const queued = (st?.queued_count ?? 0) > 0;
  const qualified = st?.qualified_referrals_count ?? 0;
  const programOn = st?.program_enabled !== false;
  if (!active && !queued && qualified === 0) return null;

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
      <div className="flex items-center gap-2 text-foreground">
        <Gift className="h-4 w-4 text-accent shrink-0" />
        <span>
          {active
            ? "Referral bonus active"
            : queued
              ? "Referral rewards queued"
              : `Successful paid referrals: ${qualified}`}
          {active && st?.active_grant?.expires_at && (
            <span className="text-muted-foreground">
              {" "}
              · ends{" "}
              {new Date(st.active_grant.expires_at).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              IST
            </span>
          )}
          {!active && queued && (
            <span className="text-muted-foreground"> · {st?.queued_count} in queue</span>
          )}
          {!active && !queued && qualified > 0 && !programOn && (
            <span className="text-muted-foreground"> · bonuses paused (admin)</span>
          )}
        </span>
      </div>
      <Link to="/referrals" className="text-accent font-medium hover:underline shrink-0">
        View referrals
      </Link>
    </div>
  );
}
