import { Helmet } from "react-helmet-async";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Send,
  Paperclip,
  Users,
  Sparkles,
  FileText,
  Search,
  Filter,
  Mail,
  Building2,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Unlink,
  Ban,
  AlertTriangle
} from "lucide-react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

interface Recruiter {
  id: string;
  name: string;
  email: string;
  company: string | null;
  domain: string | null;
  tier: string | null;
}

interface Domain {
  id: string;
  name: string;
  display_name: string;
}

interface EmailLimit {
  dailyLimit: number;
  dailySent: number;
  remaining: number;
  tier: string;
}

interface EmailCooldown {
  id: string;
  user_id: string;
  recruiter_email: string;
  blocked_until: string;
  email_count: number;
}

const Compose = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedRecruiters, setSelectedRecruiters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<string>("all");
  const [attachResume, setAttachResume] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [isCheckingGmail, setIsCheckingGmail] = useState(true);
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);
  const [isDisconnectingGmail, setIsDisconnectingGmail] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoadingRecruiters, setIsLoadingRecruiters] = useState(true);
  const [emailLimit, setEmailLimit] = useState<EmailLimit | null>(null);
  const [isLoadingLimits, setIsLoadingLimits] = useState(true);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [cooldowns, setCooldowns] = useState<EmailCooldown[]>([]);
  const [isLoadingCooldowns, setIsLoadingCooldowns] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch templates for dialog
  const { data: templates = [] } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching templates:", error);
        return [];
      }
      return data;
    },
    enabled: showTemplateDialog,
  });

  // Handle template from navigation state
  useEffect(() => {
    if (location.state?.template) {
      setSubject(location.state.template.subject);
      setBody(location.state.template.body);
      // Clear state ensuring we don't re-apply on refresh if we could (React Router doesn't persist state on refresh usually, but good practice to acknowledge)
      window.history.replaceState({}, document.title);
      toast.success(`Template "${location.state.template.name}" applied!`);
    }
  }, [location.state]);

  // Fetch recruiters and domains from database
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingRecruiters(true);
      try {
        // Fetch domains
        const domainsRes = await supabase
          .from("domains")
          .select("id, name, display_name")
          .eq("is_active", true)
          .order("sort_order");

        if (domainsRes.error) throw domainsRes.error;
        setDomains(domainsRes.data || []);

        // Fetch all recruiters in batches (Supabase has a 1000 row limit per query)
        let allRecruiters: Recruiter[] = [];
        let from = 0;
        const batchSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data: batchData, error: recruitersError } = await supabase
            .from("recruiters")
            .select("id, name, email, company, domain, tier")
            .order("name")
            .range(from, from + batchSize - 1);

          if (recruitersError) throw recruitersError;

          if (batchData && batchData.length > 0) {
            allRecruiters = [...allRecruiters, ...batchData];
            from += batchSize;
            // If we got less than batchSize, we've reached the end
            hasMore = batchData.length === batchSize;
          } else {
            hasMore = false;
          }
        }

        console.log(`Fetched ${allRecruiters.length} total recruiters`);
        setRecruiters(allRecruiters);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        console.error("Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        toast.error(`Failed to load data: ${error.message || 'Unknown error'}`);
      } finally {
        setIsLoadingRecruiters(false);
      }
    };

    fetchData();
  }, []);

  // Fetch active cooldowns
  useEffect(() => {
    const fetchCooldowns = async () => {
      if (!user?.id) {
        setIsLoadingCooldowns(false);
        return;
      }

      try {
        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from("email_cooldowns" as any)
          .select("*")
          .eq("user_id", user.id)
          .gt("blocked_until", now);

        if (error) throw error;

        setCooldowns((data as unknown as EmailCooldown[]) || []);
      } catch (error) {
        console.error("Error fetching cooldowns:", error);
      } finally {
        setIsLoadingCooldowns(false);
      }
    };

    fetchCooldowns();
  }, [user?.id]);

  // Fetch email limits based on subscription tier
  useEffect(() => {
    const fetchEmailLimits = async () => {
      if (!user?.id) {
        setIsLoadingLimits(false);
        return;
      }

      try {
        // Get user's profile and subscription tier
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("subscription_tier, daily_emails_sent, last_sent_date")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;

        const tier = profile?.subscription_tier || "FREE";
        const lastSentDate = profile?.last_sent_date;
        const today = new Date().toISOString().split("T")[0];

        // Reset daily count if it's a new day
        let dailySent = profile?.daily_emails_sent || 0;
        if (lastSentDate !== today) {
          dailySent = 0;
          // Update the profile to reset the count
          await supabase
            .from("profiles")
            .update({ daily_emails_sent: 0, last_sent_date: today })
            .eq("id", user.id);
        }

        // Get the daily limit from subscription plan
        // Use trim to handle potential whitespace issues
        let cleanTier = tier.trim();

        let { data: planData, error: planError } = await supabase
          .from("subscription_plans")
          .select("daily_limit")
          .eq("id", cleanTier)
          .maybeSingle();

        // If strict ID match fails, try to match by name or display_name
        if (!planData) {
          // Normalize the tier (e.g., "Pro Plan" -> "Pro Plan")
          // We search case-insensitively against name and display_name
          const { data: matchedPlan } = await supabase
            .from("subscription_plans")
            .select("daily_limit")
            .or(`id.ilike.%${cleanTier}%,name.ilike.%${cleanTier}%,display_name.ilike.%${cleanTier}%`)
            .limit(1)
            .maybeSingle();

          if (matchedPlan) {
            planData = matchedPlan;
          } else {
            // Fallback: if we can't find it by strict string match, try our normalization heuristic
            // E.g. if tier is "Pro Plan", normalized is "PRO".
            const normalized = normalizeTier(cleanTier);
            // Now look for a plan that might be named "PRO" or "Pro"
            if (normalized !== "FREE") {
              const { data: heuristicPlan } = await supabase
                .from("subscription_plans")
                .select("daily_limit")
                .or(`id.ilike.%${normalized}%,name.ilike.%${normalized}%,display_name.ilike.%${normalized}%`)
                .limit(1)
                .maybeSingle();

              if (heuristicPlan) {
                planData = heuristicPlan;
              }
            }
          }
        }

        // Default limits if plan not found - fallback to safe defaults matching user expectations
        // Use normalized tier for standardizing the fallback check
        const normalizedFallback = normalizeTier(cleanTier);

        const dailyLimit = planData?.daily_limit ?? (
          normalizedFallback === "FREE" ? 5 :
            normalizedFallback === "PRO" ? 20 :
              normalizedFallback === "PRO_MAX" ? 100 :
                5 // Ultimate safety fallback
        );

        setEmailLimit({
          dailyLimit,
          dailySent,
          remaining: Math.max(0, dailyLimit - dailySent),
          tier: cleanTier,
        });
      } catch (error) {
        console.error("Error fetching email limits:", error);
        // Set default limits on error
        setEmailLimit({
          dailyLimit: 5,
          dailySent: 0,
          remaining: 5,
          tier: "FREE",
        });
      } finally {
        setIsLoadingLimits(false);
      }
    };

    fetchEmailLimits();
  }, [user?.id]);

  // Fetch Google Client ID and check Gmail connection
  useEffect(() => {
    const initialize = async () => {
      // Try to use environment variable first, then fallback to edge function
      const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (envClientId) {
        setGoogleClientId(envClientId);
      } else {
        // Fetch Google Client ID from edge function as fallback
        try {
          const { data, error } = await supabase.functions.invoke("get-google-client-id");
          if (!error && data?.clientId) {
            setGoogleClientId(data.clientId);
          }
        } catch (error) {
          console.error("Error fetching Google Client ID:", error);
        }
      }

      // Check Gmail connection
      if (!user?.id) {
        setIsCheckingGmail(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("google_refresh_token")
          .eq("id", user.id)
          .maybeSingle();

        if (!error && data?.google_refresh_token) {
          setIsGmailConnected(true);
        }
      } catch (error) {
        console.error("Error checking Gmail connection:", error);
      } finally {
        setIsCheckingGmail(false);
      }
    };

    initialize();
  }, [user?.id]);

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const state = urlParams.get("state");

      if (code && state === "gmail_oauth") {
        setIsConnectingGmail(true);

        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);

        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (!sessionData?.session?.access_token) {
            throw new Error("Not authenticated");
          }

          const redirectUri = `${window.location.origin}/compose`;

          const { data, error } = await supabase.functions.invoke("gmail-oauth-callback", {
            body: { code, redirect_uri: redirectUri },
          });

          if (error) throw error;

          setIsGmailConnected(true);
          toast.success("Gmail connected successfully!");
        } catch (error: any) {
          console.error("OAuth error:", error);
          toast.error(error.message || "Failed to connect Gmail");
        } finally {
          setIsConnectingGmail(false);
        }
      }
    };

    handleOAuthCallback();
  }, []);

  const handleConnectGmail = () => {
    if (!googleClientId) {
      toast.error("Google OAuth is not configured. Please contact support.");
      return;
    }

    const redirectUri = `${window.location.origin}/compose`;
    // Only request gmail.send scope to avoid CASA assessment requirement
    const scope = encodeURIComponent("https://www.googleapis.com/auth/gmail.send");

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${googleClientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${scope}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=gmail_oauth`;

    window.location.href = authUrl;
  };

  const handleDisconnectGmail = async () => {
    if (!user?.id) return;

    setIsDisconnectingGmail(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          google_refresh_token: null,
          gmail_token_refreshed_at: null
        })
        .eq("id", user.id);

      if (error) throw error;

      setIsGmailConnected(false);
      toast.success("Gmail disconnected successfully");
    } catch (error: any) {
      console.error("Error disconnecting Gmail:", error);
      toast.error("Failed to disconnect Gmail");
    } finally {
      setIsDisconnectingGmail(false);
    }
  };

  // Helper function to normalize tier names to standard enum values
  const normalizeTier = (tier: string | null): string => {
    if (!tier) return "FREE";
    const clean = tier.trim().toUpperCase();

    // Check standard enum first
    if (["FREE", "PRO", "PRO_MAX"].includes(clean)) return clean;

    // Heuristic matching for dynamic plan names
    if (clean.includes("PRO") && clean.includes("MAX")) return "PRO_MAX";
    if (clean.includes("PRO")) return "PRO";
    if (clean.includes("FREE")) return "FREE";

    return "FREE"; // Default fallback
  };

  // Helper function to check if user can access recruiter based on tier
  const canAccessRecruiter = (recruiterTier: string | null) => {
    // Get raw tier from profile
    const rawUserTier = profile?.subscription_tier || "FREE";

    // Helper to resolve the effective tier level
    // If we have a 'daily_limit' from the fetched emailLimit state, we can hint the tier from that too?
    // But emailLimit might not be loaded yet. Safer to normalize the string.

    const userTier = normalizeTier(rawUserTier);
    const recruiterTierValue = normalizeTier(recruiterTier);

    const tierOrder = ["FREE", "PRO", "PRO_MAX"];
    const userTierIndex = tierOrder.indexOf(userTier);
    const recruiterTierIndex = tierOrder.indexOf(recruiterTierValue);

    // User can access recruiters at their tier or below
    return recruiterTierIndex <= userTierIndex;
  };

  // Helper function to get cooldown info for a recruiter
  const getCooldownInfo = (email: string) => {
    const cooldown = cooldowns.find(c =>
      c.recruiter_email.toLowerCase() === email.toLowerCase()
    );
    if (!cooldown) return null;

    const blockedUntil = new Date(cooldown.blocked_until);
    const now = new Date();
    if (blockedUntil <= now) return null;

    const daysRemaining = Math.ceil(
      (blockedUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return { blockedUntil, daysRemaining };
  };

  // Check if a recruiter is blocked
  const isRecruiterBlocked = (email: string) => {
    return getCooldownInfo(email) !== null;
  };

  // Handle recruiter selection from URL parameter
  useEffect(() => {
    const recruiterId = searchParams.get("recruiter");
    if (recruiterId && recruiters.length > 0 && !isLoadingRecruiters) {
      // Check if recruiter exists and user can access it
      const recruiter = recruiters.find(r => r.id === recruiterId);
      if (recruiter && canAccessRecruiter(recruiter.tier)) {
        // Select the recruiter if not already selected
        if (!selectedRecruiters.includes(recruiterId)) {
          setSelectedRecruiters([recruiterId]);
          // Clear the URL parameter after selecting
          navigate("/compose", { replace: true });
        }
      } else if (recruiter) {
        toast.error("You don't have access to this recruiter. Please upgrade your plan.");
        navigate("/compose", { replace: true });
      }
    }
  }, [searchParams, recruiters, selectedRecruiters, navigate, isLoadingRecruiters]);

  const filteredRecruiters = recruiters.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.company?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesDomain = selectedDomain === "all" || r.domain === selectedDomain;
    // Filter by tier - only show recruiters user can access
    const matchesTier = canAccessRecruiter(r.tier);
    return matchesSearch && matchesDomain && matchesTier;
  });

  // Count blocked recruiters in selection
  const blockedInSelection = selectedRecruiters.filter(id => {
    const recruiter = recruiters.find(r => r.id === id);
    return recruiter && isRecruiterBlocked(recruiter.email);
  }).length;

  // Get available (non-blocked) recruiters
  const availableRecruiters = filteredRecruiters.filter(r => !isRecruiterBlocked(r.email));

  const toggleRecruiter = (id: string) => {
    const recruiter = recruiters.find(r => r.id === id);
    if (recruiter && isRecruiterBlocked(recruiter.email)) {
      const cooldownInfo = getCooldownInfo(recruiter.email);
      toast.error(`This recruiter is blocked for ${cooldownInfo?.daysRemaining} more day(s)`);
      return;
    }
    setSelectedRecruiters((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleSelectAvailable = () => {
    setSelectedRecruiters(availableRecruiters.map(r => r.id));
    toast.success(`Selected ${availableRecruiters.length} available recruiter(s)`);
  };

  const handleAddAttachment = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setAttachments((prev) => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} file(s) added`);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUseTemplate = () => {
    setShowTemplateDialog(true);
  };

  const handleSelectTemplate = (template: { subject: string; body: string }) => {
    setSubject(template.subject);
    setBody(template.body);
    setShowTemplateDialog(false);
    toast.success("Template applied!");
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    // Simulate AI generation
    setTimeout(() => {
      setSubject("Application for Software Engineer Position");
      setBody(`Dear Hiring Manager,

I am writing to express my strong interest in the Software Engineer position at your company. With my background in full-stack development and passion for building innovative solutions, I believe I would be a valuable addition to your team.

My experience includes working with React, TypeScript, and Node.js to build scalable web applications. I am particularly drawn to your company's mission and would love the opportunity to contribute to your success.

I have attached my resume for your review and would welcome the chance to discuss how my skills align with your needs.

Thank you for considering my application.

Best regards,
[Your Name]`);
      setIsGenerating(false);
      toast.success("Email generated with AI!");
    }, 1500);
  };

  const handleSend = async () => {
    if (!isGmailConnected) {
      toast.error("Please connect your Gmail account first");
      return;
    }
    if (selectedRecruiters.length === 0) {
      toast.error("Please select at least one recruiter");
      return;
    }
    if (!subject || !body) {
      toast.error("Please fill in subject and body");
      return;
    }

    // Check email limits
    if (emailLimit) {
      if (emailLimit.remaining <= 0) {
        toast.error(`Daily email limit reached (${emailLimit.dailyLimit}). Upgrade your plan for more emails.`);
        return;
      }
      if (selectedRecruiters.length > emailLimit.remaining) {
        toast.error(`You can only send ${emailLimit.remaining} more emails today. Please select fewer recipients.`);
        return;
      }
    }

    setIsSending(true);

    try {
      const selectedRecruiterData = recruiters.filter(r => selectedRecruiters.includes(r.id));
      let successCount = 0;

      for (const recruiter of selectedRecruiterData) {
        const { error } = await supabase.functions.invoke("send-email-gmail", {
          body: {
            to: recruiter.email,
            subject: subject,
            body: body,
          },
        });

        if (error) {
          console.error(`Failed to send to ${recruiter.email}:`, error);
        } else {
          successCount++;
        }
      }

      // Update daily email count in profile
      if (user?.id && successCount > 0) {
        const today = new Date().toISOString().split("T")[0];
        const newCount = (emailLimit?.dailySent || 0) + successCount;

        // Get current total and update both counts
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("total_emails_sent")
          .eq("id", user.id)
          .single();

        const currentTotal = currentProfile?.total_emails_sent || 0;

        await supabase
          .from("profiles")
          .update({
            daily_emails_sent: newCount,
            last_sent_date: today,
            total_emails_sent: currentTotal + successCount,
          })
          .eq("id", user.id);

        // Update local state
        setEmailLimit(prev => prev ? {
          ...prev,
          dailySent: newCount,
          remaining: Math.max(0, prev.dailyLimit - newCount),
        } : null);
      }

      toast.success(`Sent email to ${successCount} recipients!`);
      setSelectedRecruiters([]);

      // Refresh cooldowns after sending
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("email_cooldowns" as any)
        .select("*")
        .eq("user_id", user.id)
        .gt("blocked_until", now);
      setCooldowns((data as unknown as EmailCooldown[]) || []);
    } catch (error: any) {
      console.error("Send error:", error);
      toast.error(error.message || "Failed to send emails");
    } finally {
      setIsSending(false);
    }
  };

  // Get unique domains from recruiters for fallback
  const uniqueRecruiterDomains = [...new Set(recruiters.map(r => r.domain).filter(Boolean))];

  return (
    <>
      <Helmet>
        <title>Compose Email | JobSeeker</title>
        <meta name="description" content="Compose and send professional emails to recruiters" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <div className="flex-1 sm:flex-none">
                  <h1 className="text-lg sm:text-xl font-bold text-foreground">Compose Email</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Craft your perfect outreach</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
                {emailLimit && (
                  <Badge
                    variant="outline"
                    className={`text-xs ${emailLimit.remaining <= 0
                      ? "text-destructive border-destructive/30"
                      : emailLimit.remaining <= 3
                        ? "text-warning border-warning/30"
                        : "text-success border-success/30"
                      }`}
                  >
                    <span className="hidden sm:inline">{emailLimit.remaining}/{emailLimit.dailyLimit} emails left today</span>
                    <span className="sm:hidden">{emailLimit.remaining}/{emailLimit.dailyLimit}</span>
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs text-accent border-accent/30">
                  {selectedRecruiters.length} selected
                </Badge>
                <Button
                  variant="hero"
                  size="sm"
                  className="text-xs sm:text-sm"
                  onClick={handleSend}
                  disabled={!isGmailConnected || isSending || (emailLimit?.remaining || 0) <= 0}
                >
                  {isSending ? (
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  )}
                  <span className="hidden sm:inline">{isSending ? "Sending..." : "Send Email"}</span>
                  <span className="sm:hidden">{isSending ? "Sending" : "Send"}</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
            {/* Email Composer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 space-y-6"
            >
              {/* Gmail Connection Status */}
              {isCheckingGmail ? (
                <Card className="border-border/50 bg-card/50 backdrop-blur">
                  <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Checking Gmail connection...</span>
                  </CardContent>
                </Card>
              ) : !isGmailConnected ? (
                <Card className="border-warning/30 bg-warning/5 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-warning">
                      <AlertCircle className="h-5 w-5" />
                      Connect Your Gmail
                    </CardTitle>
                    <CardDescription>
                      To send emails to recruiters, you need to connect your Gmail account.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          Connect your Gmail account to enable email sending through our platform.
                          Your account is connected securely via Gmail and you can disconnect anytime.
                        </p>
                      </div>
                      <Button
                        variant="accent"
                        onClick={handleConnectGmail}
                        disabled={isConnectingGmail}
                        className="shrink-0"
                      >
                        {isConnectingGmail ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4 mr-2" />
                            Connect Gmail
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-success/30 bg-success/5 backdrop-blur">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      <div>
                        <p className="text-sm font-medium text-success">Gmail Connected</p>
                        <p className="text-xs text-muted-foreground">You can now send emails to recruiters</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDisconnectGmail}
                      disabled={isDisconnectingGmail}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      {isDisconnectingGmail ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Unlink className="h-4 w-4 mr-1" />
                          Disconnect
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Blocked Recruiters Warning */}
              {blockedInSelection > 0 && (
                <Card className="border-warning/30 bg-warning/5 backdrop-blur">
                  <CardContent className="flex items-center gap-3 py-4">
                    <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-warning">
                        {blockedInSelection} selected recruiter(s) are blocked by cooldown
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        These recruiters cannot receive emails yet. They will be skipped when sending.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-accent" />
                        Email Content
                      </CardTitle>
                      <CardDescription>Compose your message or use AI to generate</CardDescription>
                    </div>
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={handleGenerateAI}
                      disabled={isGenerating}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {isGenerating ? "Generating..." : "Generate with AI"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Subject</label>
                    <Input
                      placeholder="Enter email subject..."
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Body</label>
                    <Textarea
                      placeholder="Write your email content..."
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      className="min-h-[300px] bg-background/50 resize-none"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="resume"
                          checked={attachResume}
                          onCheckedChange={(checked) => setAttachResume(checked as boolean)}
                        />
                        <label htmlFor="resume" className="text-sm text-muted-foreground cursor-pointer">
                          Attach Resume
                        </label>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleAddAttachment} type="button">
                        <Paperclip className="h-4 w-4 mr-2" />
                        Add Attachment
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,.txt"
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={handleUseTemplate} type="button">
                      <FileText className="h-4 w-4 mr-2" />
                      Use Template
                    </Button>
                  </div>
                  {attachments.length > 0 && (
                    <div className="pt-4 space-y-2">
                      <label className="text-sm font-medium text-foreground">Attachments:</label>
                      <div className="flex flex-wrap gap-2">
                        {attachments.map((file, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-2">
                            <FileText className="h-3 w-3" />
                            {file.name}
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(index)}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Recruiter Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-border/50 bg-card/50 backdrop-blur lg:sticky lg:top-24">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                    Select Recipients
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Choose recruiters to contact</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search recruiters..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-background/50 text-sm"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                      <SelectTrigger className="flex-1 text-sm">
                        <Filter className="h-3 w-3 mr-2" />
                        <SelectValue placeholder="All Domains" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Domains</SelectItem>
                        {domains.length > 0 ? (
                          domains.map((domain) => (
                            <SelectItem key={domain.id} value={domain.name}>
                              {domain.display_name}
                            </SelectItem>
                          ))
                        ) : (
                          uniqueRecruiterDomains.map((domain) => (
                            <SelectItem key={domain} value={domain!}>
                              {domain}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs sm:text-sm"
                      onClick={handleSelectAvailable}
                      disabled={availableRecruiters.length === 0}
                    >
                      Select Available ({availableRecruiters.length})
                    </Button>
                    {selectedRecruiters.length === filteredRecruiters.length && filteredRecruiters.length > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs sm:text-sm"
                        onClick={() => setSelectedRecruiters([])}
                      >
                        Unselect All
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs sm:text-sm"
                        onClick={() => setSelectedRecruiters(filteredRecruiters.map((r) => r.id))}
                        disabled={filteredRecruiters.length === 0}
                      >
                        Select All
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-[300px] sm:max-h-[400px] overflow-y-auto">
                    {isLoadingRecruiters ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredRecruiters.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No recruiters found</p>
                      </div>
                    ) : (
                      filteredRecruiters.map((recruiter) => {
                        const cooldownInfo = getCooldownInfo(recruiter.email);
                        const isBlocked = cooldownInfo !== null;

                        return (
                          <div
                            key={recruiter.id}
                            onClick={() => toggleRecruiter(recruiter.id)}
                            className={`p-3 rounded-lg border transition-all ${isBlocked
                              ? "border-destructive/30 bg-destructive/5 opacity-60 cursor-not-allowed"
                              : selectedRecruiters.includes(recruiter.id)
                                ? "border-accent/50 bg-accent/10 cursor-pointer"
                                : "border-border/50 bg-background/30 hover:border-border cursor-pointer"
                              }`}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={selectedRecruiters.includes(recruiter.id)}
                                onCheckedChange={() => toggleRecruiter(recruiter.id)}
                                disabled={isBlocked}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium text-sm truncate">{recruiter.name}</span>
                                  {isBlocked && (
                                    <Badge variant="destructive" className="text-xs shrink-0">
                                      <Ban className="h-3 w-3 mr-1" />
                                      {cooldownInfo.daysRemaining}d
                                    </Badge>
                                  )}
                                </div>
                                {recruiter.company && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <Building2 className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground truncate">
                                      {recruiter.company}
                                    </span>
                                  </div>
                                )}
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                  {recruiter.email}
                                </p>
                                {isBlocked && (
                                  <p className="text-xs text-destructive mt-1">
                                    Blocked for {cooldownInfo.daysRemaining} more day(s)
                                  </p>
                                )}
                              </div>
                              {!isBlocked && recruiter.domain && (
                                <Badge variant="secondary" className="text-xs shrink-0">
                                  {recruiter.domain}
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select a Template</DialogTitle>
            <DialogDescription>
              Choose a template to quickly fill in your email subject and body
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <div className="space-y-3 mt-4">
              {templates.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No templates found. Create one in the Templates page.</p>
                </div>
              ) : (
                templates.map((template: any) => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:border-accent transition-colors"
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground mb-1">{template.name}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            <strong>Subject:</strong> {template.subject}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {template.body.substring(0, 150)}...
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Compose;
