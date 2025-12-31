import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import { ActivityTracker } from "@/components/ActivityTracker";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Compose from "./pages/Compose";
import EmailHistory from "./pages/EmailHistory";
import Conversations from "./pages/Conversations";
import Applications from "./pages/Applications";
import Templates from "./pages/Templates";
import Recruiters from "./pages/Recruiters";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminRecruiters from "./pages/admin/AdminRecruiters";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminDomains from "./pages/admin/AdminDomains";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminRequests from "./pages/admin/AdminRequests";
import AdminDashboardConfig from "./pages/admin/AdminDashboardConfig";
import AdminUserActivity from "./pages/admin/AdminUserActivity";
import AdminEmailCampaigns from "./pages/admin/AdminEmailCampaigns";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          {/* Sonner renders in a portal to body, ensuring it's above all content */}
          <Sonner />
          <BrowserRouter>
            <ActivityTracker />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/compose" element={<Compose />} />
              <Route path="/email-history" element={<EmailHistory />} />
              <Route path="/conversations" element={<Conversations />} />
              <Route path="/applications" element={<Applications />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/recruiters" element={<Recruiters />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/notifications" element={<Notifications />} />
              
              {/* Legal & Info Pages */}
              <Route path="/about" element={<About />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/recruiters" element={<AdminRecruiters />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/admin/domains" element={<AdminDomains />} />
              <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
              <Route path="/admin/notifications" element={<AdminNotifications />} />
              <Route path="/admin/requests" element={<AdminRequests />} />
              <Route path="/admin/dashboard-config" element={<AdminDashboardConfig />} />
              <Route path="/admin/user-activity" element={<AdminUserActivity />} />
              <Route path="/admin/email-campaigns" element={<AdminEmailCampaigns />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
