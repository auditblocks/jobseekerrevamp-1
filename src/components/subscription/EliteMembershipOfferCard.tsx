/**
 * @fileoverview Inline Elite Membership offer card rendered on the subscription page.
 * Displays the current flash-sale config (price, features, countdown) and handles
 * the full Razorpay checkout + verification flow for Elite upgrades.
 * Supports two layout variants: "hero" (full-width) and "compact" (sidebar-friendly).
 */

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { differenceInSeconds } from "date-fns";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { Check, Crown, Hourglass, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { parseSupabaseFunctionInvokeError } from "@/lib/razorpay-verify";

type FlashSaleConfig = Database["public"]["Tables"]["flash_sale_config"]["Row"];

/** Converts a duration in days to a human-friendly "X-Year Y-Month" label. */
function formatDurationLabel(days: number): string {
  const years = Math.floor(days / 365);
  const months = Math.round((days % 365) / 30);
  if (years > 0 && months > 0) return `${years}-Year ${months}-Month`;
  if (years > 0) return `${years}-Year`;
  return `${months}-Month`;
}

/** Checks if the sale is both admin-enabled and before the end time. */
function isOfferWindowOpen(config: FlashSaleConfig): boolean {
  if (!config.is_active) return false;
  return new Date(config.end_time) > new Date();
}

type Variant = "hero" | "compact";

/** @interface EliteMembershipOfferCardProps */
interface EliteMembershipOfferCardProps {
  /** "hero" for full-width subscription page; "compact" for sidebar widgets */
  variant?: Variant;
  className?: string;
}

/**
 * Renders an Elite membership offer card with live countdown, purchase progress bar,
 * feature list, and Razorpay checkout CTA.
 * Hidden for Elite members and unauthenticated visitors.
 */
export function EliteMembershipOfferCard({
  variant = "hero",
  className,
}: EliteMembershipOfferCardProps) {
  const { user, profile, isElite, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [config, setConfig] = useState<FlashSaleConfig | null>(null);
  const [purchasedCount, setPurchasedCount] = useState(0);
  const [maxPurchases, setMaxPurchases] = useState(100);
  const [loading, setLoading] = useState(true);
  const [timeLeftStr, setTimeLeftStr] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const { data, error } = await supabase
          .from("flash_sale_config")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          console.error("flash_sale_config:", error);
        }

        const { data: statsData, error: statsError } = await supabase.rpc("get_flash_sale_purchase_stats");
        if (!statsError) {
          const stats = Array.isArray(statsData) ? statsData[0] : statsData;
          setPurchasedCount(Number(stats?.purchased_count ?? 0));
          setMaxPurchases(Number(stats?.max_purchases ?? data?.max_purchases ?? 100));
        }
        setConfig(data ?? null);
      } catch (e) {
        console.error(e);
        setConfig(null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    if (!config || !isOfferWindowOpen(config)) {
      setTimeLeftStr("");
      return;
    }

    const tick = () => {
      const endsAt = new Date(config.end_time);
      const now = new Date();
      if (endsAt <= now) {
        setTimeLeftStr("00:00:00");
        return;
      }
      const diff = differenceInSeconds(endsAt, now);
      const h = Math.floor(diff / 3600)
        .toString()
        .padStart(2, "0");
      const m = Math.floor((diff % 3600) / 60)
        .toString()
        .padStart(2, "0");
      const s = (diff % 60).toString().padStart(2, "0");
      setTimeLeftStr(`${h}:${m}:${s}`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [config]);

  /** Creates a Razorpay order via edge function, opens the checkout modal, and verifies the payment. */
  const handleCheckout = useCallback(async () => {
    if (purchasedCount >= maxPurchases) {
      toast.error("This flash sale is sold out");
      return;
    }

    if (!user) {
      navigate("/auth?redirect=" + encodeURIComponent("/dashboard/subscription"));
      return;
    }

    setProcessingPayment(true);
    try {
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        "create-razorpay-order",
        { body: { plan_id: "flash_sale" } },
      );

      if (orderError) throw new Error(orderError.message || "Failed to create payment order");
      if (!orderData || typeof orderData !== "object" || !("order_id" in orderData)) {
        throw new Error("Failed to create payment order");
      }

      const od = orderData as { order_id: string; key_id: string; amount: number; currency: string };

      const win = window as unknown as { Razorpay?: new (opts: Record<string, unknown>) => { open: () => void } };
      if (!win.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load payment script"));
          document.body.appendChild(script);
        });
      }

      const Rzp = win.Razorpay!;

      const options = {
        key: od.key_id,
        amount: od.amount,
        currency: od.currency,
        name: "StartWorking.in",
        description: `Elite — ${config?.offer_text ?? `${formatDurationLabel(config?.duration_days ?? 730)} PRO MAX`}`,
        order_id: od.order_id,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              "verify-razorpay-payment",
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
              },
            );

            if (verifyError) {
              throw new Error(parseSupabaseFunctionInvokeError(verifyError as never));
            }
            const vd = verifyData as { success?: boolean } | null;
            if (vd?.success) {
              toast.success(`You're now Elite — ${formatDurationLabel(config?.duration_days ?? 730)} of PRO MAX. Thank you!`, { duration: 6000 });
              await refreshProfile();
              navigate("/dashboard");
            }
          } catch (err: unknown) {
            console.error(err);
            const detail = err instanceof Error ? err.message : "Please contact support.";
            toast.error(`Payment verification failed: ${detail}`);
          } finally {
            setProcessingPayment(false);
          }
        },
        prefill: {
          name: profile?.name || "",
          email: user.email || "",
        },
        theme: { color: "#C5A059" },
        modal: { ondismiss: () => setProcessingPayment(false) },
      };

      const rzp = new Rzp(options);
      rzp.open();
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to start checkout");
      setProcessingPayment(false);
    }
  }, [user, profile?.name, config?.offer_text, navigate, refreshProfile, purchasedCount, maxPurchases]);

  // All signed-in users except Elite (FREE, PRO, PRO_MAX, etc.) see the same admin-configured offer.
  if (loading || !user || isElite) return null;
  if (!config) return null;

  /** Checkout only when admin enabled the offer and end time is in the future (matches flash popup rules). */
  const offerLive = isOfferWindowOpen(config);
  const soldOut = purchasedCount >= maxPurchases;
  const claimedProgress = maxPurchases > 0
    ? Math.min(100, Math.max(0, (purchasedCount / maxPurchases) * 100))
    : 0;
  const endTimePassed = new Date(config.end_time) <= new Date();
  /** Short copy for subscribers only — no internal / admin instructions. */
  const offerStatusLabel = soldOut
    ? "Offer sold out"
    : offerLive
    ? null
    : endTimePassed
      ? "Offer expired"
      : "This offer is not available right now";

  const features = config.features?.filter(Boolean) ?? [];
  const displayFeatures = variant === "compact" ? features.slice(0, 4) : features;
  const ctaLabel = config.button_text?.trim() || "Secure Elite access";

  const shellClass =
    variant === "hero"
      ? "relative overflow-hidden rounded-3xl border border-[#C5A059]/35 p-6 sm:p-10 shadow-[0_0_60px_rgba(197,160,89,0.18)]"
      : "relative overflow-hidden rounded-2xl border border-[#C5A059]/35 p-4 sm:p-5 shadow-[0_0_40px_rgba(197,160,89,0.12)]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className={cn(shellClass, className)}
      style={{
        background: "linear-gradient(155deg, #0f1218 0%, #161a22 45%, #12151c 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative z-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C5A059]/35 bg-[#C5A059]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#C5A059] sm:text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            {config.title}
          </div>
          {offerLive && !soldOut ? (
            <div className="flex items-center gap-2 text-xs font-mono text-gray-400 sm:text-sm">
              <Hourglass className="h-3.5 w-3.5 text-[#C5A059]" />
              <span>{timeLeftStr || "—"}</span>
              <span className="text-[#C5A059]">·</span>
              <span className="text-[#C5A059]">{purchasedCount}/{maxPurchases} claimed</span>
            </div>
          ) : (
            <span className="text-xs font-semibold text-muted-foreground sm:text-sm">{offerStatusLabel}</span>
          )}
        </div>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 inline-flex items-center gap-1.5 text-[#C5A059]/90">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Elite membership</span>
            </div>
            <h3
              className={cn(
                "font-black tracking-tight text-white",
                variant === "hero" ? "text-2xl sm:text-4xl" : "text-xl sm:text-2xl",
              )}
            >
              {config.subtitle}
            </h3>
            <p
              className={cn(
                "mt-2 max-w-xl text-gray-400",
                variant === "hero" ? "text-base sm:text-lg" : "text-sm",
              )}
            >
              {config.offer_text}
            </p>
          </div>

          <div className="flex flex-wrap items-baseline gap-2 sm:flex-col sm:items-end sm:gap-1">
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "font-black text-white",
                  variant === "hero" ? "text-4xl sm:text-5xl" : "text-3xl",
                )}
              >
                ₹{config.price}
              </span>
              {(config.compare_at_price ?? 0) > 0 ? (
                <span className="text-lg text-gray-500 line-through decoration-2 sm:text-xl">
                  ₹{config.compare_at_price}
                </span>
              ) : null}
            </div>
            {offerLive ? (
              <p className="text-center text-[10px] font-bold uppercase tracking-wide text-[#C5A059] sm:text-right sm:text-xs">
                Limited time · Flash sale pricing
              </p>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "mb-6 h-1.5 w-full overflow-hidden rounded-full bg-gray-800/60",
            variant === "compact" && "mb-4",
          )}
        >
          <div
            className="h-full rounded-full transition-[width] duration-700"
            style={{
              width: `${claimedProgress}%`,
              background: "linear-gradient(90deg, #8E6E37 0%, #C5A059 100%)",
            }}
          />
        </div>

        {displayFeatures.length > 0 ? (
          <div className="mb-6">
            <p
              id={variant === "hero" ? "elite-features-heading" : undefined}
              className="mb-2 text-xs font-bold uppercase tracking-wide text-[#C5A059] sm:text-sm"
            >
              {config.features_section_label?.trim() || `${formatDurationLabel(config.duration_days ?? 730)} Benefits / Features`}
            </p>
            <ul
              className={cn(
                "grid gap-2 sm:grid-cols-2",
                variant === "compact" ? "sm:grid-cols-1" : "",
              )}
              aria-labelledby={variant === "hero" ? "elite-features-heading" : undefined}
            >
              {displayFeatures.map((line, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-gray-200"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#C5A059]/20 text-[#C5A059]">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <span className="leading-snug">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            size="lg"
            disabled={processingPayment || !offerLive || soldOut}
            onClick={handleCheckout}
            title={!offerLive || soldOut ? "This offer cannot be purchased right now" : undefined}
            className="h-12 w-full border-0 font-black text-black shadow-[0_0_24px_rgba(197,160,89,0.35)] sm:h-14 sm:max-w-md sm:text-lg"
            style={{
              background: "linear-gradient(135deg, #F2D091 0%, #C5A059 45%, #8E6E37 100%)",
            }}
          >
            {processingPayment ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                {soldOut ? "Sold Out" : ctaLabel}
                <Crown className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
          <p className="text-center text-xs text-gray-500 sm:text-left">
            Non-renewable {formatDurationLabel(config.duration_days ?? 730).toLowerCase()} access · Secure checkout
          </p>
        </div>
      </div>
    </motion.div>
  );
}
