import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Hourglass } from "lucide-react";
import { differenceInSeconds } from "date-fns";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Database } from "@/integrations/supabase/types";

type FlashSaleConfig = Database['public']['Tables']['flash_sale_config']['Row'];

export function FlashSalePopup() {
  const [config, setConfig] = useState<FlashSaleConfig | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [timeLeftStr, setTimeLeftStr] = useState("");
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Only show on home and dashboard
  const isAllowedRoute = location.pathname === '/' || location.pathname === '/dashboard';

  useEffect(() => {
    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem("flashSaleDismissed");
    if (isDismissed) return;

    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("flash_sale_config")
        .select("*")
        .single();
        
      if (error) {
        if (error.code !== 'PGRST116') { // not found
          console.error("Error fetching flash sale config:", error);
        }
        return;
      }

      if (data && data.is_active) {
        // If they already have a PRO/Max sub, permanently disappear (if subscribed)
        if (profile?.subscription_tier && profile.subscription_tier !== "FREE" && profile.subscription_tier !== "free") {
          return;
        }

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
        setIsVisible(false); // Automatically hide when countdown reaches 0
        return;
      }
      
      const diff = differenceInSeconds(endsAt, now);
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      
      // formatting exactly like 02h 45m or 02h 45m 10s
      if (hours > 0) {
        setTimeLeftStr(`${hours.toString().padStart(2, '0')}h ${(minutes).toString().padStart(2, '0')}m`);
      } else {
        setTimeLeftStr(`${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [config, isVisible]);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem("flashSaleDismissed", "true");
  };

  const handleClaim = () => {
    // Hide popup so it doesn't linger after action
    setIsVisible(false);
    
    // Redirect logic
    if (!user) {
      // Need login first
      navigate("/auth?returnTo=/subscription");
    } else {
      navigate("/subscription");
    }
  };

  if (!isVisible || !config || !isAllowedRoute) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed bottom-6 right-6 z-50 w-[340px] rounded-2xl overflow-hidden p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(20,25,35,0.95) 0%, rgba(10,15,25,0.98) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 0 1px 1px rgba(255,255,255,0.1), 0 20px 40px rgba(0,0,0,0.5), 0 0 40px rgba(4, 240, 237, 0.15)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center">
          <h3 
            className="text-[#04F0ED] font-bold text-lg tracking-wider mb-2"
            style={{ textShadow: '0 0 10px rgba(4,240,237,0.5)' }}
          >
            {config.title}
          </h3>
          
          <p className="text-gray-200 text-[15px] font-medium mb-1">
            {config.subtitle}
          </p>
          
          <h2 
            className="text-[#04F0ED] font-bold text-3xl mb-6 leading-tight"
            style={{ textShadow: '0 0 15px rgba(4,240,237,0.4)' }}
          >
            {config.offer_text}
          </h2>

          <div className="w-full mb-6">
            <div className="flex justify-between items-center text-gray-300 text-sm mb-2 px-1">
              <span>Offer ends in: {timeLeftStr}</span>
              <Hourglass size={14} className="text-[#ceaa82]" />
            </div>
            
            <div className="relative h-2 w-full bg-gray-700/50 rounded-full overflow-hidden mb-1">
              <motion.div 
                className="absolute top-0 left-0 h-full rounded-full"
                style={{ 
                  width: `${config.progress_percentage}%`,
                  background: 'linear-gradient(90deg, #02b3b0 0%, #04F0ED 100%)',
                  boxShadow: '0 0 10px rgba(4,240,237,0.8)'
                }}
                initial={{ width: 0 }}
                animate={{ width: `${config.progress_percentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-end text-xs text-gray-400 pr-1">
              {config.progress_percentage}%
            </div>
          </div>

          <button
            onClick={handleClaim}
            className="w-full py-3.5 rounded-xl font-bold text-black border-none cursor-pointer transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              background: '#04F0ED',
              boxShadow: '0 0 20px rgba(4,240,237,0.4)',
            }}
          >
            {config.button_text}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
