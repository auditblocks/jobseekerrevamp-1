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

const Subscription = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    subscriptionTier: "FREE",
  });

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
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

  const handleUpgradePlan = async (plan: SubscriptionPlan) => {
    if (!user?.id || plan.price === 0) return;

    setProcessingPayment(plan.id);
    try {
      // Create Razorpay order
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        "create-razorpay-order",
        {
          body: {
            plan_id: plan.id,
            amount: plan.price,
          },
        }
      );

      if (orderError) throw orderError;
      if (!orderData?.order_id) {
        throw new Error("Failed to create payment order");
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "JobSeeker",
        description: `Subscription: ${plan.display_name || plan.name}`,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            const { error: verifyError } = await supabase.functions.invoke(
              "verify-razorpay-payment",
              {
                body: {
                  order_id: response.razorpay_order_id,
                  payment_id: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                  plan_id: plan.id,
                },
              }
            );

            if (verifyError) throw verifyError;
            toast.success("Subscription upgraded successfully!");
            fetchProfile();
            navigate("/dashboard");
          } catch (error: any) {
            console.error("Payment verification error:", error);
            toast.error("Payment verification failed: " + error.message);
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
            setProcessingPayment(null);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
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
    return plans.map((plan, index) => {
      const monthlyPrice = plan.price;
      const yearlyPrice = (plan.price === 0 || plan.duration_days === 0) 
        ? 0 
        : (plan.duration_days === 30 ? monthlyPrice * 12 : monthlyPrice * 12);
      const isCurrent = profile.subscriptionTier === plan.id;
      
      return {
        id: plan.id,
        name: plan.display_name || plan.name,
        monthlyPrice: monthlyPrice,
        yearlyPrice: yearlyPrice > 0 ? Math.round(yearlyPrice * 0.8) : 0, // 20% discount for yearly
        features: plan.features || [],
        isPopular: plan.is_recommended || false,
        accent: getAccentColor(plan.name, index),
        isCurrent: isCurrent,
        buttonText: isCurrent 
          ? (plan.button_disabled_text || "Current Plan")
          : (plan.button_text || "Upgrade"),
        onButtonClick: () => {
          if (!isCurrent && plan.price > 0) {
            handleUpgradePlan(plan);
          }
        },
        disabled: isCurrent || processingPayment === plan.id || plan.price === 0,
        loading: processingPayment === plan.id,
      };
    });
  };

  return (
    <>
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

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
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
                Select the perfect subscription plan for your job search needs. Upgrade or downgrade anytime.
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
                />
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Subscription;

