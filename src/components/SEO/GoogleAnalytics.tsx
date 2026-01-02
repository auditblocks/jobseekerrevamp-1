import { useEffect } from "react";

interface GoogleAnalyticsProps {
  measurementId?: string;
}

/**
 * Google Analytics 4 Component
 * 
 * To use this component:
 * 1. Create a GA4 property in Google Analytics
 * 2. Get your Measurement ID (format: G-XXXXXXXXXX)
 * 3. Add it to your environment variables as VITE_GA_MEASUREMENT_ID
 * 4. Add <GoogleAnalytics /> to your App.tsx
 * 
 * @param measurementId - Optional GA4 Measurement ID. If not provided, reads from VITE_GA_MEASUREMENT_ID env variable
 */
const GoogleAnalytics = ({ measurementId }: GoogleAnalyticsProps) => {
  const gaId = measurementId || import.meta.env.VITE_GA_MEASUREMENT_ID;

  useEffect(() => {
    if (!gaId) {
      console.warn("Google Analytics: No Measurement ID provided. Set VITE_GA_MEASUREMENT_ID in your .env file.");
      return;
    }

    // Load gtag script
    const script1 = document.createElement("script");
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script1);

    // Initialize gtag
    const script2 = document.createElement("script");
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}', {
        page_path: window.location.pathname,
      });
    `;
    document.head.appendChild(script2);

    // Track page views on route changes
    const handleRouteChange = () => {
      if (window.gtag) {
        window.gtag("config", gaId, {
          page_path: window.location.pathname,
        });
      }
    };

    // Listen for popstate events (back/forward navigation)
    window.addEventListener("popstate", handleRouteChange);

    return () => {
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, [gaId]);

  return null;
};

// Extend Window interface for gtag
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

export default GoogleAnalytics;

