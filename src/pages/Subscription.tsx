import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PricingContainer, PricingPlan } from "@/components/ui/pricing-container";
import SEOHead from "@/components/SEO/SEOHead";
import StructuredData from "@/components/SEO/StructuredData";
import DashboardLayout from "@/components/DashboardLayout";

declare global {
  interface Window {
    Razorpay: any;
  }
}

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
  button_disabled_text: string | null;
  sort_order: number;
  daily_limit: number;
}

// Plan hierarchy for upgrade/downgrade logic (higher index = higher tier)
const PLAN_HIERARCHY: Record<string, number> = {
  "FREE": 0,
  "free": 0,
  "PRO": 1,
  "pro": 1,
  "PRO_MAX": 2,
  "pro_max": 2,
  "PROMAX": 2,
  "promax": 2,
};

const getPlanLevel = (planName: string): number => {
  // Normalize the plan name and find its level
  const normalized = planName.toUpperCase().replace(/[\s_-]/g, '_');
  if (normalized.includes('PRO_MAX') || normalized.includes('PROMAX')) return 2;
  if (normalized.includes('PRO')) return 1;
  if (normalized.includes('FREE')) return 0;
  return PLAN_HIERARCHY[planName] ?? -1;
};

const Subscription = () => {
  const navigate = useNavigate();
  const { user, refreshProfile: refreshGlobalProfile } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [isYearly, setIsYearly] = useState(false);
  const [profile, setProfile] = useState({
    subscriptionTier: "FREE",
  });

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onerror = () => {
      console.error("Failed to load Razorpay SDK");
      toast.error("Payment system not available. Please refresh and try again.");
    };
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    fetchPlans();
    if (user?.id) {
      fetchProfile();
    }
  }, [user?.id]);

  // Refresh profile when page becomes visible (in case admin changed tier)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user?.id) {
        fetchProfile();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user?.id]);

  const fetchPlans = async () => {
    try {
      setLoadingPlans(true);
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      setPlans(data || []);
    } catch (error: any) {
      console.error("Failed to fetch plans:", error);
      toast.error("Failed to load subscription plans");
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchProfile = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("subscription_tier, subscription_expires_at")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfile({ subscriptionTier: data.subscription_tier || "FREE" });
      }
    } catch (error: any) {
      console.error("Failed to fetch profile:", error);
    }
  };

  const handleUpgradePlan = async (plan: SubscriptionPlan, priceToCharge: number) => {
    if (!user?.id || priceToCharge === 0) return;

    setProcessingPayment(plan.id);
    try {
      // Create Razorpay order with the correct price (monthly or yearly)
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        "create-razorpay-order",
        {
          body: {
            plan_id: plan.id,
            amount: priceToCharge,
          },
        }
      );

      if (orderError) throw orderError;
      if (!orderData?.order_id) {
        throw new Error("Failed to create payment order");
      }

      const billingPeriod = isYearly ? "Yearly" : "Monthly";
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "JobSeeker",
        description: `${plan.display_name || plan.name} - ${billingPeriod} Subscription`,
        order_id: orderData.order_id,
        image: "/icon-192.png", // Add logo to payment modal
        handler: async (response: any) => {
          try {
            console.log("Payment successful, verifying...", response);

            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              "verify-razorpay-payment",
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  plan_id: plan.id,
                },
              }
            );

            console.log("Verification response:", { data: verifyData, error: verifyError });

            if (verifyError) {
              console.error("Verification error:", verifyError);
              throw verifyError;
            }

            // Payment verified successfully
            toast.success("Subscription upgraded successfully!");

            // Refresh both local and global profile to get updated subscription tier
            await fetchProfile();
            await refreshGlobalProfile();

            // Navigate to dashboard
            setTimeout(() => {
              navigate("/dashboard");
            }, 500);
          } catch (error: any) {
            console.error("Payment verification error:", error);
            const errorMessage = error?.message || "Payment verification failed. Please contact support.";
            toast.error(`Payment verification failed: ${errorMessage}`);

            // Stay on subscription page and refresh profile
            // User can try again or contact support
            await fetchProfile();
          } finally {
            setProcessingPayment(null);
          }
        },
        prefill: {
          email: user.email || "",
        },
        theme: {
          color: "#0ea5e9",
        },
        modal: {
          ondismiss: () => {
            console.log("Payment modal dismissed by user");
            toast.info("Payment cancelled");
            setProcessingPayment(null);
          },
          escape: true,
          confirm_close: true,
          animation: true,
        },
        retry: {
          enabled: true,
          max_count: 3,
        },
        timeout: 300, // 5 minutes
      };

      const razorpay = new window.Razorpay(options);

      // Add error handler for Razorpay
      razorpay.on('payment.failed', function (response: any) {
        console.error("Payment failed:", response.error);
        toast.error(`Payment failed: ${response.error.description || 'Unknown error'}`);
        setProcessingPayment(null);
      });

      razorpay.open();
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error("Failed to initiate payment: " + error.message);
      setProcessingPayment(null);
    }
  };

  const getAccentColor = (planName: string, index: number): string => {
    const name = planName.toLowerCase();
    if (name.includes("free")) return "bg-gray-500";
    if (name.includes("pro")) return "bg-blue-500";
    if (name.includes("max") || name.includes("enterprise")) return "bg-purple-500";
    const colors = ["bg-rose-500", "bg-blue-500", "bg-purple-500"];
    return colors[index % colors.length];
  };

  const convertToPricingPlans = (): PricingPlan[] => {
    const currentTierLevel = getPlanLevel(profile.subscriptionTier);

    return plans.map((plan, index) => {
      const monthlyPrice = plan.price;
      const yearlyPrice = (plan.price === 0 || plan.duration_days === 0)
        ? 0
        : Math.round(monthlyPrice * 12 * 0.8); // 20% discount for yearly

      // Get this plan's tier level
      const planLevel = getPlanLevel(plan.name);

      // Check if this is the current plan by comparing tier levels and names
      const isCurrent = planLevel === currentTierLevel && currentTierLevel >= 0;

      // Check if this is a downgrade (lower tier than current)
      const isDowngrade = planLevel < currentTierLevel && planLevel >= 0;

      // Check if this is an upgrade (higher tier than current)
      const isUpgrade = planLevel > currentTierLevel;

      // Determine button text
      let buttonText = plan.button_text || "Upgrade";
      if (isCurrent) {
        buttonText = plan.button_disabled_text || "Current Plan";
      } else if (isDowngrade) {
        buttonText = "Not Available";
      } else if (plan.price === 0) {
        buttonText = "Free Plan";
      }

      // Determine if button should be disabled
      // Disabled if: current plan, downgrade, free plan, or processing payment
      const isDisabled = isCurrent || isDowngrade || processingPayment === plan.id || plan.price === 0;

      // Calculate the price to charge based on yearly toggle
      const priceToCharge = isYearly ? yearlyPrice : monthlyPrice;

      return {
        id: plan.id,
        name: plan.display_name || plan.name,
        monthlyPrice: monthlyPrice,
        yearlyPrice: yearlyPrice,
        features: plan.features || [],
        isPopular: plan.is_recommended || false,
        accent: getAccentColor(plan.name, index),
        isCurrent: isCurrent,
        buttonText: buttonText,
        onButtonClick: () => {
          if (!isDisabled && isUpgrade && priceToCharge > 0) {
            handleUpgradePlan(plan, priceToCharge);
          } else if (isDowngrade) {
            toast.info("You cannot downgrade your subscription until it expires.");
          }
        },
        disabled: isDisabled,
        loading: processingPayment === plan.id,
      };
    });
  };

  return (
    <DashboardLayout>
      <SEOHead
        title="Subscription Plans & Pricing | JobSeeker - Choose Your Plan"
        description="Choose your subscription plan and upgrade your JobSeeker account. Free, Pro, and Pro Max plans available. Start automating your job search today."
        keywords="jobseeker pricing, subscription plans, job search tool pricing, recruiter outreach pricing, job application automation cost"
        canonicalUrl="/subscription"
        ogImage="/icon-512.png"
        ogImageAlt="Subscription Plans - JobSeeker"
      />
      <StructuredData
        type="page"
        pageTitle="Subscription Plans"
        pageDescription="Choose your subscription plan and upgrade your JobSeeker account"
        pageUrl="/subscription"
      />

      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-4">
              <CreditCard className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">Subscription Management</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Choose Your Plan
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Select the perfect subscription plan for your job search needs. Upgrade anytime to unlock more features.
            </p>
          </motion.div>
        </div>

        {/* Pricing Plans */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {loadingPlans ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : (
            <div className="bg-background rounded-lg p-4 sm:p-6">
              <PricingContainer
                title="Subscription Plans"
                plans={convertToPricingPlans()}
                className="bg-transparent min-h-0"
                showYearlyToggle={true}
                isYearly={isYearly}
                onYearlyChange={setIsYearly}
              />
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Subscription;
