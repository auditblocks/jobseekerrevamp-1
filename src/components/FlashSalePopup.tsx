import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Hourglass, Loader2, Check, ShieldCheck, Crown } from "lucide-react";
import { differenceInSeconds } from "date-fns";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FlashSaleConfig = Database['public']['Tables']['flash_sale_config']['Row'];

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function FlashSalePopup() {
  const [config, setConfig] = useState<FlashSaleConfig | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [timeLeftStr, setTimeLeftStr] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const { user, profile, isElite } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAllowedRoute = location.pathname === '/' || location.pathname === '/dashboard';

  useEffect(() => {
    const isDismissed = sessionStorage.getItem("flashSaleDismissed");
    if (isDismissed || isElite) return;
    fetchConfig();
  }, [isElite]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("flash_sale_config")
        .select("*")
        .single();
        
      if (error) {
        if (error.code !== 'PGRST116') console.error("Error fetching flash sale config:", error);
        return;
      }

      if (data && data.is_active) {
        if (isElite) return;
        if (profile?.subscription_tier && profile.subscription_tier !== "FREE" && profile.subscription_tier !== "free") return;

        const endsAt = new Date(data.end_time);
        if (endsAt > new Date()) {
          setConfig(data);
          setIsVisible(true);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!config || !isVisible) return;

    const updateTimer = () => {
      const endsAt = new Date(config.end_time);
      const now = new Date();
      if (endsAt <= now) {
        setIsVisible(false);
        return;
      }
      const diff = differenceInSeconds(endsAt, now);
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      
      const hStr = hours.toString().padStart(2, '0');
      const mStr = minutes.toString().padStart(2, '0');
      const sStr = seconds.toString().padStart(2, '0');
      setTimeLeftStr(`${hStr}:${mStr}:${sStr}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [config, isVisible]);

  const handleDismiss = () => {
    setIsVisible(false);
    setShowDetails(false);
    sessionStorage.setItem("flashSaleDismissed", "true");
  };

  const handleClaim = async () => {
    if (!user) {
      setIsVisible(false);
      setShowDetails(false);
      navigate("/auth?returnTo=/");
      return;
    }

    setProcessingPayment(true);
    try {
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        "create-razorpay-order",
        { body: { plan_id: "flash_sale" } }
      );

      if (orderError) throw new Error(orderError.message || "Failed to create payment order");
      if (!orderData?.order_id) throw new Error("Failed to create payment order");

      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load payment script"));
          document.body.appendChild(script);
        });
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "StartWorking.in",
        description: `Flash Sale — 5 Years PRO MAX`,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              "verify-razorpay-payment",
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
              }
            );

            if (verifyError) throw new Error(verifyError.message || "Payment verification failed");

            if (verifyData?.success) {
              toast.success("🎉 You're now PRO MAX for 5 years! Thank you!", { duration: 6000 });
              sessionStorage.setItem("flashSaleDismissed", "true");
              setIsVisible(false);
              setShowDetails(false);
            }
          } catch (err: any) {
            console.error("Verification error:", err);
            toast.error("Payment verification failed. Please contact support.");
          }
          setProcessingPayment(false);
        },
        prefill: {
          name: profile?.name || "",
          email: user.email || "",
        },
        theme: { color: "#C5A059" },
        modal: { ondismiss: () => setProcessingPayment(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error: any) {
      console.error("Flash sale payment error:", error);
      toast.error(error.message || "Failed to initiate payment");
      setProcessingPayment(false);
    }
  };

  if (!isVisible || !config || !isAllowedRoute) return null;

  return (
    <>
      {/* Mini Bubble Popup */}
      <AnimatePresence>
        {!showDetails && isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 z-[60] w-[340px] rounded-2xl overflow-hidden p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(20,25,35,0.95) 0%, rgba(10,15,25,0.98) 100%)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 0 1px 1px rgba(255,255,255,0.1), 0 20px 40px rgba(0,0,0,0.5), 0 0 40px rgba(197, 160, 89, 0.15)',
              border: '1px solid rgba(197, 160, 89, 0.3)'
            }}
          >
            <button 
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              disabled={processingPayment}
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center">
              <h3 className="text-[#C5A059] font-bold text-lg tracking-wider mb-2 uppercase flex items-center gap-2">
                <Crown size={18} /> {config.title}
              </h3>
              
              <p className="text-gray-300 text-[15px] font-medium mb-1">{config.subtitle}</p>
              
              <h2 className="text-white font-bold text-3xl mb-4 leading-tight">
                {config.offer_text}
              </h2>

              <div className="w-full mb-6">
                <div className="flex justify-between items-center text-gray-400 text-sm mb-2 px-1">
                  <span className="flex items-center gap-1.5"><Hourglass size={14} className="text-[#C5A059]" /> {timeLeftStr}</span>
                  <span className="text-[#C5A059] font-bold">{config.progress_percentage}% Sold</span>
                </div>
                
                <div className="relative h-1.5 w-full bg-gray-800/50 rounded-full overflow-hidden">
                  <motion.div 
                    className="absolute top-0 left-0 h-full rounded-full"
                    style={{ 
                      width: `${config.progress_percentage}%`,
                      background: 'linear-gradient(90deg, #8E6E37 0%, #C5A059 100%)',
                      boxShadow: '0 0 10px rgba(197,160,89,0.5)'
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${config.progress_percentage}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
              </div>

              <div className="flex flex-col w-full gap-2">
                <button
                  onClick={handleClaim}
                  disabled={processingPayment}
                  className="w-full py-3 rounded-xl font-bold text-black border-none cursor-pointer transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #C5A059 0%, #8E6E37 100%)' }}
                >
                  {processingPayment ? <Loader2 size={16} className="animate-spin" /> : "Secure Elite Access"}
                </button>
                <button
                  onClick={() => setShowDetails(true)}
                  className="text-gray-400 hover:text-[#C5A059] text-sm font-semibold transition-colors py-1"
                >
                  View Membership Details
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Elite Detailed Modal */}
      <AnimatePresence>
        {showDetails && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-6 origin-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetails(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative flex w-full max-w-2xl min-h-0 max-h-[calc(100dvh-1.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] flex-col overflow-hidden rounded-3xl border border-[#C5A059]/30 shadow-[0_0_50px_rgba(197,160,89,0.2)] sm:max-h-[calc(100dvh-3rem)]"
              style={{
                background: 'linear-gradient(165deg, #111111 0%, #1a1a1a 100%)'
              }}
            >
              {/* Carbon Fiber Background Pattern Overlay */}
              <div 
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, #ffffff 1px, transparent 0)`,
                  backgroundSize: '24px 24px'
                }}
              />

              <button 
                onClick={() => setShowDetails(false)}
                className="absolute top-3 right-3 z-20 rounded-lg p-1 text-gray-500 hover:bg-white/5 hover:text-white transition-colors sm:top-4 sm:right-4"
                disabled={processingPayment}
                aria-label="Close"
              >
                <X size={22} />
              </button>

              {/* Column: header (fixed) + scrollable features + CTA footer (always visible) */}
              <div className="relative flex min-h-0 flex-1 flex-col">
                <div className="shrink-0 px-4 pb-2 pt-11 text-center sm:px-6 sm:pb-3 sm:pt-12">
                  <motion.div
                    initial={{ y: -12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.05 }}
                    className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#C5A059]/30 bg-[#C5A059]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#C5A059] sm:mb-3 sm:px-4 sm:text-xs"
                  >
                    <ShieldCheck size={12} className="sm:h-3.5 sm:w-3.5" /> Elite Membership Offer
                  </motion.div>

                  <h2 className="mb-1.5 text-2xl font-black leading-tight tracking-tight text-white sm:mb-2 sm:text-3xl md:text-4xl">
                    Unleash Your{" "}
                    <span className="bg-gradient-to-r from-[#C5A059] via-[#F2D091] to-[#C5A059] bg-clip-text text-transparent">
                      Full Potential
                    </span>
                  </h2>
                  <p className="text-xs text-gray-400 sm:text-sm md:text-base">
                    Excellence Unlocked: The Ultimate 5-Year Experience
                  </p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 [-webkit-overflow-scrolling:touch]">
                  <div className="grid gap-2 pb-2 sm:gap-2.5">
                    {config.features?.map((feature, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ x: -12, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.08 + idx * 0.04 }}
                        className="group flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2.5 transition-colors hover:border-[#C5A059]/40 sm:gap-3 sm:rounded-2xl sm:p-3"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C5A059]/20 text-[#C5A059] transition-all group-hover:bg-[#C5A059] group-hover:text-black sm:h-8 sm:w-8">
                          <Check size={15} strokeWidth={3} className="sm:h-[18px] sm:w-[18px]" />
                        </div>
                        <span className="text-left text-sm font-medium leading-snug text-gray-200 sm:text-base">
                          {feature}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="shrink-0 border-t border-white/10 bg-gradient-to-t from-[#121212] via-[#141414]/95 to-transparent px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-4 sm:pt-4">
                  <div className="mx-auto flex max-w-md flex-col items-center gap-3 sm:gap-4">
                    <div className="text-center">
                      <div className="mb-0.5 flex flex-wrap items-baseline justify-center gap-2">
                        <span className="text-3xl font-black text-white sm:text-5xl md:text-6xl">₹{config.price}</span>
                        {(config.compare_at_price ?? 0) > 0 ? (
                          <span className="text-base text-gray-500 line-through decoration-2 sm:text-xl">
                            ₹{config.compare_at_price}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#C5A059] sm:text-xs">
                        Limited Time 5-Year Access • Non-Renewable
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleClaim}
                      disabled={processingPayment}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border-none py-3.5 text-base font-black text-black transition-all hover:scale-[1.01] hover:shadow-[0_0_24px_rgba(197,160,89,0.35)] active:scale-[0.99] disabled:opacity-70 sm:gap-3 sm:py-4 sm:text-lg"
                      style={{ background: 'linear-gradient(135deg, #F2D091 0%, #C5A059 50%, #8E6E37 100%)' }}
                    >
                      {processingPayment ? (
                        <Loader2 size={22} className="animate-spin sm:h-6 sm:w-6" />
                      ) : (
                        <>
                          SECURE MY 5-YEAR PLAN <Crown size={20} className="sm:h-6 sm:w-6" />
                        </>
                      )}
                    </button>

                    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-medium text-gray-500 sm:text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Hourglass size={12} className="shrink-0 sm:h-3.5 sm:w-3.5" /> Expires {timeLeftStr}
                      </span>
                      <span className="hidden h-1 w-1 rounded-full bg-gray-600 sm:inline" aria-hidden />
                      <span>Secure checkout</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
