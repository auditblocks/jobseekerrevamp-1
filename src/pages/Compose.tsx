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
  AlertTriangle,
  Lock,
} from "lucide-react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { storagePathFromResumeFileUrl } from "@/lib/resumeStoragePath";
import { cn } from "@/lib/utils";

const MAX_RESUME_INLINE_BYTES = 5 * 1024 * 1024;

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, Math.min(i + chunk, bytes.length))) as unknown as number[],
    );
  }
  return btoa(binary);
}

/** Load primary resume bytes with the user session (RLS). Edge function uses this first to avoid storage/env mismatches. */
async function loadResumeInlineForCompose(userId: string): Promise<
  | { filename: string; content_base64: string; mime_type?: string }
  | undefined
> {
  const { data: urList, error: urErr } = await supabase
    .from("user_resumes")
    .select("file_url, file_name, file_type")
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (urErr) {
    console.warn("user_resumes fetch for attach:", urErr.message);
  }

  let fileUrl: string | null = urList?.[0]?.file_url?.trim() ?? null;
  let fileName = urList?.[0]?.file_name?.trim() || "resume.pdf";
  let fileType: string | undefined = urList?.[0]?.file_type || undefined;

  if (!fileUrl) {
    const { data: rlist, error: rErr } = await supabase
      .from("resumes")
      .select("file_url, name, file_type")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1);

    if (rErr) {
      console.warn("resumes fetch for attach:", rErr.message);
    }

    const r = rlist?.[0];
    if (r?.file_url?.trim()) {
      fileUrl = r.file_url.trim();
      fileName = `${(r.name || "resume").replace(/[^\w.-]+/g, "_")}.${r.file_type || "pdf"}`;
      fileType = r.file_type || undefined;
    }
  }

  if (!fileUrl) return undefined;

  const path = storagePathFromResumeFileUrl(fileUrl);
  if (!path) {
    console.warn("Could not parse resume storage path from URL");
    return undefined;
  }

  const { data: blob, error: dlErr } = await supabase.storage.from("resumes").download(path);
  if (dlErr || !blob) {
    console.warn("Resume storage download failed:", dlErr?.message);
    return undefined;
  }
  if (blob.size > MAX_RESUME_INLINE_BYTES) {
    console.warn("Resume too large for inline payload; relying on server fetch");
    return undefined;
  }

  const content_base64 = arrayBufferToBase64(await blob.arrayBuffer());
  return { filename: fileName, content_base64, mime_type: fileType };
}

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
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [gmailTrustModalOpen, setGmailTrustModalOpen] = useState(false);
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
        const cleanTier = tier.trim();

        const tierPlanResult = await supabase
          .from("subscription_plans")
          .select("daily_limit")
          .eq("id", cleanTier)
          .maybeSingle();
        let planData = tierPlanResult.data;
        const planError = tierPlanResult.error;

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
    setGmailTrustModalOpen(false);
    if (!googleClientId) {
      toast.error("Google OAuth is not configured. Please contact support.");
      return;
    }

    setIsConnectingGmail(true);
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

  const openGmailTrustThenConnect = () => {
    setGmailTrustModalOpen(true);
  };

  const handleContinueToGoogleOAuth = () => {
    handleConnectGmail();
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

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const r = reader.result as string;
        const i = r.indexOf(",");
        resolve(i >= 0 ? r.slice(i + 1) : r);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleSend = async () => {
    if (!isGmailConnected) {
      setShowConnectDialog(true);
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

    const MAX_BYTES = 6 * 1024 * 1024;
    let serializedAttachments: { filename: string; content_base64: string; mime_type?: string }[] = [];
    try {
      for (const f of attachments) {
        if (f.size > MAX_BYTES) {
          toast.error(`"${f.name}" is too large (max 6MB per file).`);
          return;
        }
        serializedAttachments.push({
          filename: f.name,
          content_base64: await readFileAsBase64(f),
          mime_type: f.type || undefined,
        });
      }
    } catch (e) {
      console.error(e);
      toast.error("Could not read attachment files.");
      return;
    }

    let resumeInline:
      | { filename: string; content_base64: string; mime_type?: string }
      | undefined;
    if (attachResume && user?.id) {
      try {
        resumeInline = await loadResumeInlineForCompose(user.id);
      } catch (e) {
        console.error("Resume inline load failed; server will attach if possible:", e);
      }
    }

    setIsSending(true);

    try {
      const selectedRecruiterData = recruiters.filter(r => selectedRecruiters.includes(r.id));
      let successCount = 0;

      for (const recruiter of selectedRecruiterData) {
        const { data, error } = await supabase.functions.invoke("send-email-gmail", {
          body: {
            to: recruiter.email,
            subject: subject,
            body: body,
            attachResume: attachResume,
            resumeInline,
            attachments: serializedAttachments,
            recruiterName: recruiter.name,
          },
        });

        if (error) {
          console.error(`Failed to send to ${recruiter.email}:`, error);
          const ctx = (error as { context?: { body?: string } })?.context?.body;
          let msg = error.message || "Send failed";
          if (typeof ctx === "string") {
            try {
              const j = JSON.parse(ctx) as { error?: string };
              if (j?.error) msg = j.error;
            } catch {
              /* ignore */
            }
          }
          toast.error(`${recruiter.email}: ${msg}`);
        } else if (data && typeof data === "object" && "error" in data && (data as { error?: string }).error) {
          toast.error(`${recruiter.email}: ${(data as { error: string }).error}`);
        } else {
          successCount++;
        }
      }

      // Edge function updates profile counts per send; sync local limit from server
      if (user?.id && successCount > 0) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("daily_emails_sent, last_sent_date")
          .eq("id", user.id)
          .single();

        const today = new Date().toISOString().split("T")[0];
        const dailySent =
          prof?.last_sent_date === today ? prof?.daily_emails_sent ?? 0 : 0;

        setEmailLimit((prev) =>
          prev
            ? {
                ...prev,
                dailySent,
                remaining: Math.max(0, prev.dailyLimit - dailySent),
              }
            : null,
        );
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
    <DashboardLayout>
      <Helmet>
        <title>Compose Email | JobSeeker</title>
        <meta name="description" content="Compose and send professional emails to recruiters" />
      </Helmet>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Action Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Compose Email</h1>
            <p className="text-sm text-muted-foreground">Craft your perfect outreach</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end sm:justify-start">
            {emailLimit && (
              <Badge
                variant="outline"
                className={`text-[10px] sm:text-xs py-1 ${emailLimit.remaining <= 0
                  ? "text-destructive border-destructive/30"
                  : emailLimit.remaining <= 3
                    ? "text-warning border-warning/30"
                    : "text-success border-success/30"
                  }`}
              >
                <span className="hidden sm:inline">{emailLimit.remaining}/{emailLimit.dailyLimit} emails left today</span>
                <span className="sm:hidden">{emailLimit.remaining}/{emailLimit.dailyLimit} remaining</span>
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] sm:text-xs text-accent border-accent/30 py-1">
              {selectedRecruiters.length} selected
            </Badge>
            <Button
              variant="hero"
              size="sm"
              className="text-[10px] sm:text-sm h-8 sm:h-9 px-2 sm:px-4"
              onClick={handleSend}
              disabled={isSending || (emailLimit?.remaining || 0) <= 0}
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
              <Card className="border-accent/20 bg-accent/5 backdrop-blur">
                <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-accent/10 p-2 rounded-full">
                      <Mail className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Connect Gmail to Send</h3>
                      <p className="text-sm text-muted-foreground">
                        Review what we access, then connect securely with Google.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={openGmailTrustThenConnect}
                    disabled={isConnectingGmail}
                    className="shrink-0 min-h-11 touch-manipulation"
                  >
                    {isConnectingGmail ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      "Connect Gmail"
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-success/30 bg-success/5 backdrop-blur">
                <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-success/20 shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-success">Gmail Connected</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">You can now send emails to recruiters</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnectGmail}
                    disabled={isDisconnectingGmail}
                    className="text-muted-foreground hover:text-destructive h-8 text-xs w-full sm:w-auto border border-success/20 sm:border-0"
                  >
                    {isDisconnectingGmail ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Unlink className="h-3.5 w-3.5 mr-1.5" />
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
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Mail className="h-5 w-5 text-accent" />
                      Email Content
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Compose your message or use AI to generate</CardDescription>
                  </div>
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={handleGenerateAI}
                    disabled={isGenerating}
                    className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm"
                  >
                    <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
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
                <div className="space-y-2 pt-4 border-t border-border/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="resume"
                          checked={attachResume}
                          onCheckedChange={(checked) => setAttachResume(checked === true)}
                        />
                        <label htmlFor="resume" className="text-xs sm:text-sm text-muted-foreground cursor-pointer">
                          Attach Resume
                        </label>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleAddAttachment} type="button" className="h-8 text-xs px-2">
                        <Paperclip className="h-3.5 w-3.5 mr-1.5" />
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
                    <Button variant="outline" size="sm" onClick={handleUseTemplate} type="button" className="w-full sm:w-auto h-8 text-xs">
                      <FileText className="h-3.5 w-3.5 mr-1.5" />
                      Use Template
                    </Button>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Primary resume comes from Settings (marked primary, else most recent). Your line breaks and links are kept in the message. “Add Attachment” files are included too.
                  </p>
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
                <div className="flex flex-col gap-2">
                  <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                    <SelectTrigger className="w-full text-sm">
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
                  <div className="flex gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-[10px] sm:text-xs h-8 px-1"
                      onClick={handleSelectAvailable}
                      disabled={availableRecruiters.length === 0}
                    >
                      Available ({availableRecruiters.length})
                    </Button>
                    {selectedRecruiters.length === filteredRecruiters.length && filteredRecruiters.length > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-[10px] sm:text-xs h-8 px-1"
                        onClick={() => setSelectedRecruiters([])}
                      >
                        Unselect All
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-[10px] sm:text-xs h-8 px-1"
                        onClick={() => setSelectedRecruiters(filteredRecruiters.map((r) => r.id))}
                        disabled={filteredRecruiters.length === 0}
                      >
                        Select All
                      </Button>
                    )}
                  </div>
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

      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">One Last Step! 🚀</DialogTitle>
            <DialogDescription className="text-center">
              Connect your Gmail account to send these {selectedRecruiters.length} emails securely.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="h-20 w-20 bg-accent/10 rounded-full flex items-center justify-center">
              <Mail className="h-10 w-10 text-accent" />
            </div>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Send directly from your email address
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Track opens and responses automatically
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Safe and secure OAuth connection
              </li>
            </ul>
            <Button
              variant="hero"
              size="lg"
              className="w-full mt-2 min-h-12 touch-manipulation"
              onClick={() => {
                setShowConnectDialog(false);
                setGmailTrustModalOpen(true);
              }}
              disabled={isConnectingGmail}
            >
              {isConnectingGmail ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect Gmail & Send"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gmail trust modal — layout matches public/mock-sprint-gmail-trust.html */}
      <Dialog open={gmailTrustModalOpen} onOpenChange={setGmailTrustModalOpen}>
        <DialogContent
          overlayClassName="z-[100] bg-black/60 backdrop-blur-sm"
          closeButtonClassName="opacity-100 ring-offset-white data-[state=open]:bg-transparent data-[state=open]:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 dark:ring-offset-zinc-950 dark:data-[state=open]:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 rounded-lg p-1 [&_svg]:h-5 [&_svg]:w-5"
          className={cn(
            "z-[101] flex w-[calc(100vw-2rem)] max-w-md translate-x-[-50%] translate-y-[-50%] flex-col gap-0 rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl duration-200",
            "max-h-[min(90dvh,640px)] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]",
            "dark:border-zinc-700 dark:bg-zinc-950 dark:ring-offset-zinc-950",
            "sm:w-full sm:rounded-2xl",
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400">
            <Lock className="h-6 w-6" aria-hidden />
          </div>
          <DialogTitle
            id="gmail-trust-title"
            className="mt-4 text-left text-xl font-bold text-zinc-900 dark:text-zinc-50"
          >
            Before you connect Gmail
          </DialogTitle>
          <DialogDescription className="mt-2 text-left text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            With your permission, we use Google’s secure sign-in. Here’s what that means in plain language:
          </DialogDescription>
          <ul className="mt-4 list-none space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
            <li className="flex gap-3">
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 dark:bg-teal-900/80 dark:text-teal-200"
                aria-hidden
              >
                1
              </span>
              <span>
                <strong className="text-zinc-900 dark:text-zinc-50">Send</strong> recruiter emails from your address so
                replies come back to you.
              </span>
            </li>
            <li className="flex gap-3">
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 dark:bg-teal-900/80 dark:text-teal-200"
                aria-hidden
              >
                2
              </span>
              <span>
                <strong className="text-zinc-900 dark:text-zinc-50">Read</strong> only what’s needed to match job-related
                threads and show status in JobSeeker — not unrelated personal mail.
              </span>
            </li>
            <li className="flex gap-3">
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 dark:bg-teal-900/80 dark:text-teal-200"
                aria-hidden
              >
                3
              </span>
              <span>
                <strong className="text-zinc-900 dark:text-zinc-50">Disconnect anytime</strong> in the app; we stop
                using tokens from that point.
              </span>
            </li>
          </ul>

          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <Link
              to="/privacy-policy"
              className="font-semibold text-teal-700 underline underline-offset-2 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
              onClick={() => setGmailTrustModalOpen(false)}
            >
              Privacy Policy
            </Link>
            <span className="text-zinc-300 dark:text-zinc-600" aria-hidden>
              ·
            </span>
            <Link
              to="/terms-of-service"
              className="font-semibold text-teal-700 underline underline-offset-2 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
              onClick={() => setGmailTrustModalOpen(false)}
            >
              Terms
            </Link>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="min-h-11 touch-manipulation rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:min-h-0"
              onClick={() => setGmailTrustModalOpen(false)}
            >
              Not now
            </button>
            <button
              type="button"
              className="min-h-11 touch-manipulation rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-teal-700 disabled:opacity-70 dark:bg-teal-600 dark:hover:bg-teal-500 sm:min-h-0"
              onClick={handleContinueToGoogleOAuth}
              disabled={isConnectingGmail}
            >
              {isConnectingGmail ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redirecting…
                </span>
              ) : (
                "Continue to Google"
              )}
            </button>
          </div>
          <p className="mt-3 text-[11px] leading-snug text-zinc-400 dark:text-zinc-500">
            You’ll finish signing in on Google’s secure page. JobSeeker never sees your Google password.
          </p>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Compose;
