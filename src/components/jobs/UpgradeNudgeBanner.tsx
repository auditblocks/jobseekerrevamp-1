/**
 * @file UpgradeNudgeBanner.tsx
 * Proactive upgrade prompt shown when a user is close to (but has not yet hit)
 * their daily apply cap. Complements the existing "Daily apply limit reached"
 * badge in ApplyLatestJobs.tsx, which only appears once the cap is fully used —
 * this fires earlier, at the moment of friction, to convert before the wall.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, Sparkles, X } from "lucide-react";
import { isUnlimitedApply, type PrivateApplySlots } from "@/lib/privateApplyPolicy";

/** Fraction of the daily quota remaining at which the nudge starts showing. */
const NUDGE_THRESHOLD = 0.2;

interface UpgradeNudgeBannerProps {
  slots: PrivateApplySlots | null;
  /** Route to send the user to on "Upgrade now". */
  upgradeTo?: string;
}

/**
 * Renders nothing unless the user is on a capped tier, has remaining applies
 * (the exhausted case has its own existing UI), and has used >= 80% of today's quota.
 * Dismissal is per-session only — it reappears next visit/day, matching how the
 * existing "limit reached" badge behaves (no dismiss-forever state either).
 */
export function UpgradeNudgeBanner({ slots, upgradeTo = "/dashboard/subscription" }: UpgradeNudgeBannerProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (!slots || dismissed || isUnlimitedApply(slots) || slots.remaining <= 0) return null;
  if (slots.max <= 0) return null;

  const usedFraction = slots.used_today / slots.max;
  if (usedFraction < 1 - NUDGE_THRESHOLD) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
      <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
      <p className="flex-1 min-w-[200px] text-amber-900 dark:text-amber-200">
        You've used {slots.used_today} of {slots.max} applies today on the {slots.tier} plan. Upgrade for
        more daily applies.
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1 rounded-lg border-amber-500/40 text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-950/40"
          onClick={() => navigate(upgradeTo)}
        >
          <ArrowUpCircle className="h-3.5 w-3.5" />
          Upgrade now
        </Button>
        <button
          type="button"
          aria-label="Dismiss"
          className="text-amber-700/70 hover:text-amber-900 dark:text-amber-300/70 dark:hover:text-amber-100"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
