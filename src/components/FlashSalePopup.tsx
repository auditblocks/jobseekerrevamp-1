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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 origin-center">
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
              className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-[#C5A059]/30 shadow-[0_0_50px_rgba(197,160,89,0.2)]"
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
                className="absolute top-6 right-6 z-10 text-gray-500 hover:text-white transition-colors"
                disabled={processingPayment}
              >
                <X size={24} />
              </button>

              <div className="relative p-8 sm:p-12 overflow-y-auto max-h-[90vh]">
                <div className="text-center mb-10">
                  <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059] text-xs font-bold tracking-widest uppercase mb-6"
                  >
                    <ShieldCheck size={14} /> Elite Membership Offer
                  </motion.div>
                  
                  <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">
                    Unleash Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C5A059] via-[#F2D091] to-[#C5A059]">Full Potential</span>
                  </h2>
                  <p className="text-gray-400 text-lg">Excellence Unlocked: The Ultimate 5-Year Experience</p>
                </div>

                <div className="grid gap-4 mb-10">
                  {config.features?.map((feature, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.2 + (idx * 0.1) }}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#C5A059]/40 transition-colors group"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#C5A059]/20 flex items-center justify-center text-[#C5A059] group-hover:bg-[#C5A059] group-hover:text-black transition-all">
                        <Check size={18} strokeWidth={3} />
                      </div>
                      <span className="text-lg text-gray-200 font-medium">{feature}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="flex flex-col items-center gap-6 pt-6 border-t border-white/10">
                  <div className="text-center">
                    <div className="flex items-baseline justify-center gap-2 mb-1">
                      <span className="text-4xl sm:text-6xl font-black text-white">₹{config.price}</span>
                      <span className="text-gray-500 text-xl line-through">₹4999</span>
                    </div>
                    <p className="text-[#C5A059] font-bold text-sm tracking-wide uppercase">Limited Time 5-Year Access • Non-Renewable</p>
                  </div>

                  <button
                    onClick={handleClaim}
                    disabled={processingPayment}
                    className="w-full max-w-md py-5 rounded-2xl font-black text-xl text-black border-none cursor-pointer transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(197,160,89,0.4)] active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-3"
                    style={{ background: 'linear-gradient(135deg, #F2D091 0%, #C5A059 50%, #8E6E37 100%)' }}
                  >
                    {processingPayment ? (
                      <Loader2 size={24} className="animate-spin" />
                    ) : (
                      <>SECURE MY 5-YEAR PLAN <Crown size={24} /></>
                    )}
                  </button>
                  
                  <div className="flex items-center gap-6 text-gray-500 text-sm font-medium">
                    <span className="flex items-center gap-1.5"><Hourglass size={14} /> Offer expires in {timeLeftStr}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-700" />
                    <span>Safe & Secure checkout</span>
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
