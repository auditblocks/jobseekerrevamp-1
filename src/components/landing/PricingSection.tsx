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
                className={`relative group ${
                  plan.is_recommended 
                    ? 'md:-mt-4 md:mb-4' 
                    : ''
                }`}
              >
                {/* Glass Card */}
                <div className={`relative rounded-3xl p-8 h-full transition-all duration-300 ${
                  plan.is_recommended 
                    ? 'border-2 border-accent/40 shadow-xl shadow-accent/20 bg-gradient-to-br from-card to-card backdrop-blur-xl' 
                    : 'border border-border/50 shadow-card hover:shadow-lg hover:border-accent/30 bg-card backdrop-blur-xl'
                }`}>
                  {/* Popular Badge */}
                  {plan.is_recommended && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                      <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-accent to-accent/80 text-accent-foreground text-sm font-semibold shadow-lg shadow-accent/30">
                        Most Popular
                      </div>
                    </div>
                  )}
                  
                  {/* Plan Info */}
                  <div className="mb-8">
                    <h3 className={`text-2xl font-bold mb-3 ${
                      plan.is_recommended 
                        ? 'text-foreground' 
                        : 'text-foreground'
                    }`}>
                      {plan.display_name || plan.name}
                    </h3>
                    <div className="flex items-baseline gap-2 mb-2">
                      {plan.old_price && plan.old_price > plan.price && (
                        <span className="text-lg line-through text-muted-foreground/60">
                          {formatPrice(plan.old_price)}
                        </span>
                      )}
                      <span className={`text-5xl font-extrabold ${
                        plan.is_recommended 
                          ? 'text-accent' 
                          : 'text-foreground'
                      }`}>
                        {formatPrice(plan.price)}
                      </span>
                      <span className="text-muted-foreground text-lg">
                        {plan.billing_cycle_display || (plan.price === 0 ? '/forever' : '/month')}
                      </span>
                    </div>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {plan.description}
                      </p>
                    )}
                  </div>
                  
                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          plan.is_recommended 
                            ? 'bg-accent/20 border border-accent/30' 
                            : 'bg-accent/10 border border-accent/20'
                        }`}>
                          <Check className="w-3 h-3 text-accent" />
                        </div>
                        <span className="text-foreground/90 text-sm leading-relaxed">
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
                      className={`w-full group-hover:scale-[1.02] transition-transform ${
                        !plan.is_recommended 
                          ? 'hover:bg-accent hover:text-accent-foreground hover:border-accent' 
                          : ''
                      }`}
                    >
                      {plan.button_text || "Get Started"}
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>

                {/* Glow Effect for Recommended */}
                {plan.is_recommended && (
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-accent/20 via-accent/10 to-accent/20 blur-xl -z-10 opacity-50 animate-pulse-slow" />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PricingSection;