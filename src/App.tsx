import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import { ActivityTracker } from "@/components/ActivityTracker";
import { Loader2 } from "lucide-react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { LoadingScreen } from "@/components/ui/loading-screen";// Lazy load all page components for code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Compose = lazy(() => import("./pages/Compose"));
const EmailHistory = lazy(() => import("./pages/EmailHistory"));
const Conversations = lazy(() => import("./pages/Conversations"));
const Applications = lazy(() => import("./pages/Applications"));
const Templates = lazy(() => import("./pages/Templates"));
const Recruiters = lazy(() => import("./pages/Recruiters"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Settings = lazy(() => import("./pages/Settings"));
const Subscription = lazy(() => import("./pages/Subscription"));
const Notifications = lazy(() => import("./pages/Notifications"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const CancellationsAndRefunds = lazy(() => import("./pages/CancellationsAndRefunds"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQ = lazy(() => import("./pages/FAQ"));
const ResumeOptimizer = lazy(() => import("./pages/ResumeOptimizer"));
const OrderHistory = lazy(() => import("./pages/OrderHistory"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BlogListing = lazy(() => import("./pages/BlogListing"));
const BlogDetail = lazy(() => import("./pages/BlogDetail"));

// Govt Jobs pages
const GovtJobs = lazy(() => import("./pages/GovtJobs"));
const GovtJobDetail = lazy(() => import("./pages/GovtJobDetail"));
const GovtJobTracker = lazy(() => import("./pages/GovtJobTracker"));
const GovtJobExam = lazy(() => import("./pages/GovtJobExam"));
const GovtJobAnalytics = lazy(() => import("./pages/GovtJobAnalytics"));

// Admin pages - lazy loaded
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminRecruiters = lazy(() => import("./pages/admin/AdminRecruiters"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminDomains = lazy(() => import("./pages/admin/AdminDomains"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminRequests = lazy(() => import("./pages/admin/AdminRequests"));
const AdminDashboardConfig = lazy(() => import("./pages/admin/AdminDashboardConfig"));
const AdminUserActivity = lazy(() => import("./pages/admin/AdminUserActivity"));
const AdminEmailCampaigns = lazy(() => import("./pages/admin/AdminEmailCampaigns"));
const AdminWhatsappCampaigns = lazy(() => import("./pages/admin/AdminWhatsappCampaigns"));
const AdminBlogs = lazy(() => import("./pages/admin/AdminBlogs"));
const AdminBlogEditor = lazy(() => import("./pages/admin/AdminBlogEditor"));
const AdminScraperConfig = lazy(() => import("./pages/admin/AdminScraperConfig"));
const AdminOrderHistory = lazy(() => import("./pages/admin/AdminOrderHistory"));
const AdminEmailCooldowns = lazy(() => import("./pages/admin/AdminEmailCooldowns"));
const AdminGovtJobs = lazy(() => import("./pages/admin/AdminGovtJobs"));
const AdminGovtJobEditor = lazy(() => import("./pages/admin/AdminGovtJobEditor"));
const AdminExamQuestions = lazy(() => import("./pages/admin/AdminExamQuestions"));




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
            <ErrorBoundary>
              <Suspense fallback={<LoadingScreen />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/pricing" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/compose" element={<Compose />} />
                  <Route path="/email-history" element={<EmailHistory />} />
                  <Route path="/conversations" element={<Conversations />} />
                  <Route path="/applications" element={<Applications />} />
                  <Route path="/templates" element={<Templates />} />
                  <Route path="/recruiters" element={<Recruiters />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/resume-optimizer" element={<ResumeOptimizer />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/dashboard/subscription" element={<Subscription />} />
                  <Route path="/subscription" element={<Subscription />} />
                  <Route path="/order-history" element={<OrderHistory />} />
                  <Route path="/notifications" element={<Notifications />} />

                  {/* Government Jobs */}
                  <Route path="/government-jobs" element={<GovtJobs />} />
                  <Route path="/government-jobs/:slug" element={<GovtJobDetail />} />
                  <Route path="/govt-jobs/tracker" element={<GovtJobTracker />} />
                  <Route path="/govt-jobs/exam/:jobId" element={<GovtJobExam />} />
                  <Route path="/govt-jobs/analytics" element={<GovtJobAnalytics />} />

                  {/* Legal & Info Pages */}
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />
                  <Route path="/cancellations-and-refunds" element={<CancellationsAndRefunds />} />

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
                  <Route path="/admin/whatsapp-campaigns" element={<AdminWhatsappCampaigns />} />

                  {/* Content */}
                  <Route path="/admin/blogs" element={<AdminBlogs />} />
                  <Route path="/admin/blogs/new" element={<AdminBlogEditor />} />
                  <Route path="/admin/blogs/:id" element={<AdminBlogEditor />} />

                  <Route path="/admin/scraper" element={<AdminScraperConfig />} />
                  <Route path="/admin/order-history" element={<AdminOrderHistory />} />
                  <Route path="/admin/email-cooldowns" element={<AdminEmailCooldowns />} />

                  {/* Admin Govt Jobs */}
                  <Route path="/admin/govt-jobs" element={<AdminGovtJobs />} />
                  <Route path="/admin/govt-jobs/new" element={<AdminGovtJobEditor />} />
                  <Route path="/admin/govt-jobs/:id" element={<AdminGovtJobEditor />} />
                  <Route path="/admin/govt-jobs/:jobId/questions" element={<AdminExamQuestions />} />

                  {/* Public Blog Routes */}
                  <Route path="/blog" element={<BlogListing />} />
                  <Route path="/blog/:slug" element={<BlogDetail />} />

                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
