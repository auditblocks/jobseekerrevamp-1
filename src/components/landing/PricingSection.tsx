import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  return (
    <section className="py-24 bg-secondary/30">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Simple Pricing</span>
          </div>
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
          /* Pricing Cards */
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`relative rounded-2xl p-8 ${
                  plan.is_recommended 
                    ? 'bg-gradient-hero border-2 border-accent/30 shadow-xl shadow-accent/10' 
                    : 'bg-card border border-border'
                }`}
              >
                {/* Popular Badge */}
                {plan.is_recommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="px-4 py-1 rounded-full bg-accent text-accent-foreground text-sm font-semibold">
                      Most Popular
                    </div>
                  </div>
                )}
                
                {/* Plan Info */}
                <div className="mb-8">
                  <h3 className={`text-xl font-bold mb-2 ${plan.is_recommended ? 'text-primary-foreground' : 'text-foreground'}`}>
                    {plan.display_name || plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    {plan.old_price && plan.old_price > plan.price && (
                      <span className={`text-lg line-through ${plan.is_recommended ? 'text-primary-foreground/40' : 'text-muted-foreground'}`}>
                        ₹{plan.old_price}
                      </span>
                    )}
                    <span className={`text-4xl font-bold ${plan.is_recommended ? 'text-accent' : 'text-foreground'}`}>
                      {formatPrice(plan.price)}
                    </span>
                    <span className={plan.is_recommended ? 'text-primary-foreground/60' : 'text-muted-foreground'}>
                      {plan.billing_cycle_display || (plan.price === 0 ? '/forever' : `/${plan.duration_days} days`)}
                    </span>
                  </div>
                  {plan.description && (
                    <p className={`mt-2 ${plan.is_recommended ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {plan.description}
                    </p>
                  )}
                </div>
                
                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        plan.is_recommended ? 'bg-accent/20' : 'bg-accent/10'
                      }`}>
                        <Check className="w-3 h-3 text-accent" />
                      </div>
                      <span className={plan.is_recommended ? 'text-primary-foreground/90' : 'text-foreground'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                
                {/* CTA */}
                <Link to="/auth?mode=signup">
                  <Button 
                    variant={plan.is_recommended ? "hero" : "outline"} 
                    size="lg" 
                    className={`w-full ${!plan.is_recommended ? 'hover:bg-accent hover:text-accent-foreground' : ''}`}
                  >
                    {plan.button_text || "Get Started"}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PricingSection;