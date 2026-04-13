/**
 * @fileoverview Landing-page pricing section that dynamically fetches active subscription
 * plans from Supabase and renders them via the reusable `PricingContainer`.
 * Detects the user's current tier to disable downgrades and mark the active plan.
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PricingContainer, PricingPlan } from "@/components/ui/pricing-container";
import { Loader2 } from "lucide-react";

interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string | null;
  description: string | null;
  price: number;
  old_price: number | null;
  duration_days: number;
  billing_cycle_display: string | null;
  features: string[];
  is_active: boolean;
  is_recommended: boolean;
  button_text: string | null;
  sort_order: number;
  discount_percentage: number | null;
  yearly_price: number | null;
}

/**
 * Fetches subscription plans, maps them to the `PricingContainer` format,
 * and handles tier-aware button states (current plan, downgrade disabled).
 */
const PricingSection = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error("Failed to fetch plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPlanTier = () => {
    if (!profile) return null;
    return profile.subscription_tier?.toUpperCase() || null;
  };

  const isCurrentPlan = (planName: string) => {
    const currentTier = getCurrentPlanTier();
    if (!currentTier) return false;
    const planTier = planName.toUpperCase().replace(/\s+/g, '_');
    return currentTier === planTier ||
      (currentTier === 'FREE' && planName.toUpperCase().includes('FREE')) ||
      (currentTier === 'PRO' && planName.toUpperCase().includes('PRO') && !planName.toUpperCase().includes('MAX')) ||
      (currentTier === 'PRO_MAX' && planName.toUpperCase().includes('PRO MAX'));
  };

  const getButtonText = (plan: SubscriptionPlan) => {
    if (isCurrentPlan(plan.name)) {
      return "Current Plan";
    }
    return plan.button_text || "Get Started";
  };

  const getAccentColor = (planName: string, index: number) => {
    const name = planName.toLowerCase();
    if (name.includes('free')) return 'bg-gray-500';
    if (name.includes('pro max') || name.includes('pro_max')) return 'bg-purple-500';
    if (name.includes('pro')) return 'bg-blue-500';
    // Default colors based on index
    const colors = ['bg-rose-500', 'bg-blue-500', 'bg-purple-500'];
    return colors[index % colors.length];
  };

  /** Assigns a numeric weight to each tier so we can compare for upgrade/downgrade logic. */
  const getPlanWeight = (planName: string) => {
    const name = planName.toUpperCase();
    if (name.includes('PRO MAX')) return 3;
    if (name.includes('PRO')) return 2;
    return 1; // FREE
  };

  /** Disables the CTA for the current plan and any lower-tier plan (no downgrades). */
  const isDisabled = (planName: string) => {
    if (isCurrentPlan(planName)) return true;

    const currentTierName = profile?.subscription_tier || 'FREE';
    // If current is FREE, weights 1. If PRO, 2. If PRO MAX, 3.
    // However, the database might store 'PRO_MAX' or 'PRO MAX'. 
    // Let's rely on the same helper for consistency.
    const currentWeight = getPlanWeight(currentTierName);
    const targetWeight = getPlanWeight(planName);

    // Disable if target is lower tier than current
    return targetWeight < currentWeight;
  };

  // Convert subscription plans to pricing plans format
  const convertToPricingPlans = (): PricingPlan[] => {
    return plans.map((plan, index) => {
      const monthlyPrice = plan.price;
      const yearlyPrice = (plan.price === 0 || plan.duration_days === 0)
        ? 0
        : (plan.yearly_price ?? Math.round(monthlyPrice * 12 * 0.8));

      const disabled = isDisabled(plan.name);

      return {
        id: plan.id,
        name: plan.display_name || plan.name,
        monthlyPrice: monthlyPrice,
        yearlyPrice: yearlyPrice,
        discountPercentage: plan.discount_percentage ?? undefined,
        features: plan.features || [],
        isPopular: plan.is_recommended || false,
        accent: getAccentColor(plan.name, index),
        isCurrent: isCurrentPlan(plan.name),
        buttonText: disabled ? (isCurrentPlan(plan.name) ? "Current Plan" : "Downgrade Unavailable") : (plan.button_text || "Get Started"),
        onButtonClick: () => {
          if (user) {
            navigate("/settings");
          } else {
            navigate("/auth?mode=signup");
          }
        },
        disabled: disabled,
      };
    });
  };

  if (loading) {
    return (
      <section id="pricing" className="py-24 bg-secondary/30">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </section>
    );
  }

  return (
    <section id="pricing" className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6">
        <p className="text-center text-muted-foreground text-sm max-w-2xl mx-auto mb-8 leading-relaxed">
          All plans provide access to tools for job outreach and application management. This is a subscription-based service;
          no job placement or interview is guaranteed. For billing cycles and refunds, see{" "}
          <Link to="/cancellations-and-refunds" className="text-primary underline-offset-4 hover:underline">
            Cancellations &amp; Refunds
          </Link>
          .
        </p>
        <PricingContainer
          title="Choose Your Plan"
          plans={convertToPricingPlans()}
          className="bg-transparent"
          showYearlyToggle={true}
        />
      </div>
    </section>
  );
};

export default PricingSection;