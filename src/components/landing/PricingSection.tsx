import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Loader2, Zap, Crown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
}

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

  const formatPrice = (price: number) => {
    if (price === 0) return "₹0";
    return `₹${price.toLocaleString()}`;
  };

  const getPlanIcon = (index: number, isRecommended: boolean, planName: string) => {
    if (planName.toLowerCase().includes('pro max') || planName.toLowerCase().includes('pro_max')) {
      return <Crown className="h-5 w-5 text-warning" />;
    }
    return <Zap className={`h-5 w-5 ${isRecommended ? 'text-accent' : 'text-muted-foreground'}`} />;
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
    const planName = plan.display_name || plan.name;
    if (planName.toLowerCase().includes('free')) {
      return "Get Started";
    }
    if (planName.toLowerCase().includes('pro max')) {
      return "Upgrade to Pro Max";
    }
    if (planName.toLowerCase().includes('pro')) {
      return "Upgrade to Pro";
    }
    return plan.button_text || "Get Started";
  };

  return (
    <section className="relative py-24 bg-gradient-to-b from-background via-secondary/20 to-background overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Choose Your{" "}
            <span className="text-accent">Plan</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Start free and upgrade as you grow. No hidden fees, cancel anytime.
          </p>
        </motion.div>
        
        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => {
              const isRecommended = plan.is_recommended;
              const isCurrent = isCurrentPlan(plan.name);
              const buttonText = getButtonText(plan);
              
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="relative group"
                >
                  {/* Card */}
                  <div className={`relative rounded-xl p-6 h-full transition-all duration-300 bg-card border ${
                    isRecommended 
                      ? 'ring-2 ring-accent border-accent/50' 
                      : 'border-border/50'
                  } ${isCurrent ? 'bg-accent/5' : ''}`}>
                    {/* Recommended Badge */}
                    {isRecommended && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                        <div className="px-3 py-1 rounded-full bg-success text-success-foreground text-xs font-semibold">
                          Recommended
                        </div>
                      </div>
                    )}
                    
                    {/* Plan Info */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        {getPlanIcon(index, isRecommended, plan.name)}
                        <h3 className="text-xl font-bold text-foreground">
                          {plan.display_name || plan.name}
                        </h3>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-foreground">
                          {formatPrice(plan.price)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Features */}
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-success flex-shrink-0" />
                          <span className="text-foreground/90">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                    
                    {/* CTA */}
                    {isCurrent ? (
                      <Button 
                        variant="accent" 
                        size="lg" 
                        className="w-full"
                        disabled
                      >
                        {buttonText}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    ) : (
                      <Button 
                        variant="accent" 
                        size="lg" 
                        className="w-full"
                        onClick={() => {
                          if (user) {
                            navigate("/settings");
                          } else {
                            navigate("/auth?mode=signup");
                          }
                        }}
                      >
                        {buttonText}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default PricingSection;