import { Helmet } from "react-helmet-async";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Search,
  Filter,
  Users,
  Building2,
  Mail,
  Star,
  ChevronDown,
  Crown,
  Zap,
  Sparkles,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  LockKeyhole
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";

interface Recruiter {
  id: string;
  name: string;
  email: string;
  company: string | null;
  domain: string | null;
  tier: string | null;
  quality_score: number | null;
  response_rate: number | null;
}

const tierConfig = {
  FREE: { icon: Sparkles, color: "text-muted-foreground", bg: "bg-muted/50", label: "Free" },
  PRO: { icon: Zap, color: "text-accent", bg: "bg-accent/10", label: "Pro" },
  PRO_MAX: { icon: Crown, color: "text-warning", bg: "bg-warning/10", label: "Pro Max" },
};

const PAGE_SIZE = 12;

const Recruiters = () => {
  const navigate = useNavigate();
  const { profile, isSuperadmin, loading: authLoading } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("All");
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [domains, setDomains] = useState<string[]>(["All"]);
  const [page, setPage] = useState(0); // 0-indexed internally

  const [isLoading, setIsLoading] = useState(true);
  const [tierCounts, setTierCounts] = useState<{ FREE: number, PRO: number, PRO_MAX: number }>({ FREE: 0, PRO: 0, PRO_MAX: 0 });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch domains and stats on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        // Fetch Domains
        const { data: domainData } = await supabase
          .from("domains")
          .select("display_name")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (domainData) {
          setDomains(["All", ...domainData.map(d => d.display_name)]);
        }

        // Fetch Tier Counts
        const [freeCount, proCount, proMaxCount] = await Promise.all([
          supabase.from("recruiters").select("id", { count: "exact", head: true }).in('tier', ['FREE', 'Free']),
          supabase.from("recruiters").select("id", { count: "exact", head: true }).in('tier', ['PRO', 'Pro']),
          supabase.from("recruiters").select("id", { count: "exact", head: true }).in('tier', ['PRO_MAX', 'Pro Max', 'PRO MAX'])
        ]);

        setTierCounts({
          FREE: freeCount.count || 0,
          PRO: proCount.count || 0,
          PRO_MAX: proMaxCount.count || 0
        });

      } catch (error) {
        console.error("Error fetching metadata:", error);
      }
    };
    fetchMetadata();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, selectedDomain, selectedTier]);

  // Main Fetch Logic
  const fetchRecruiters = useCallback(
    async (currentPage: number) => {
      setIsLoading(true);

      try {
        let query = supabase
          .from("recruiters")
          .select("id, name, email, company, domain, tier, quality_score, response_rate", { count: "exact" })
          .order("created_at", { ascending: false })
          .order("id", { ascending: true }); // Deterministic sort

        // Apply filters
        if (debouncedSearch) {
          query = query.or(`name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,company.ilike.%${debouncedSearch}%`);
        }

        if (selectedDomain !== "All") {
          query = query.eq("domain", selectedDomain);
        }

        if (selectedTier) {
          query = query.eq("tier", selectedTier);
        }

        // Pagination
        const from = currentPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        query = query.range(from, to);

        const { data, count, error } = await query;

        if (error) throw error;

        if (data) {
          setRecruiters(data);
          setTotalCount(count || 0);
        }
      } catch (error) {
        console.error("Error fetching recruiters:", error);
        toast.error("Failed to load recruiters");
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedSearch, selectedDomain, selectedTier]
  );

  useEffect(() => {
    fetchRecruiters(page);
  }, [page, fetchRecruiters]);

  // Robust Level Logic
  const getTierLevel = (tier: string | null): number => {
    const t = (tier || "").trim().toUpperCase().replace(/\s+/g, "_"); // "Pro Max" -> "PRO_MAX"
    if (t === "PRO_MAX" || t === "PROMAX") return 2;
    // Map "PRO PLAN" etc to Level 1
    if (t === "PRO" || t === "PRO_PLAN" || t === "PROPLAN") return 1;
    return 0; // FREE or unknown
  };

  const c_canAccessRecruiter = (tier: string | null) => {
    // Admin always accesses everything
    if (isSuperadmin) return true;

    const recruiterLevel = getTierLevel(tier);
    const userLevel = getTierLevel(profile?.subscription_tier);

    // Logic: User Level must be >= Recruiter Level
    return userLevel >= recruiterLevel;
  };

  const getRecruiterTierKey = (tier: string | null): keyof typeof tierConfig => {
    const level = getTierLevel(tier);
    if (level === 2) return "PRO_MAX";
    if (level === 1) return "PRO";
    return "FREE";
  };

  const userTierLabel = profile?.subscription_tier ? profile.subscription_tier.toUpperCase() : "FREE";

  const getQualityColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 90) return "text-success";
    if (score >= 70) return "text-accent";
    return "text-warning";
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <Helmet>
        <title>Recruiters | JobSeeker</title>
        <meta name="description" content="Browse and contact recruiters in your industry" />
      </Helmet>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Action Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">Recruiters</h1>
              <p className="text-sm text-muted-foreground">Find recruiters in your industry</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4">
            {/* User Tier Indicator - Critical for debugging access issues */}
            <div className="flex items-center text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md border border-border/50">
              <ShieldCheck className="h-3 w-3 mr-1 text-primary" />
              Your Plan: <span className="ml-1 text-primary font-bold">{userTierLabel.replace(/_/g, " ")}</span>
              {isSuperadmin && <span className="ml-2 text-warning font-mono text-[10px]">(ADMIN ACCESS)</span>}
            </div>

            <div className="flex gap-2">
              <Badge variant="outline" className="border-border/50 text-muted-foreground">
                Free: {tierCounts.FREE}
              </Badge>
              <Badge variant="outline" className="border-accent/20 text-accent">
                Pro: {tierCounts.PRO}
              </Badge>
              <Badge variant="outline" className="border-warning/20 text-warning">
                Max: {tierCounts.PRO_MAX}
              </Badge>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row gap-4 mb-6"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </motion.div>

        {/* Domain Pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex flex-wrap gap-2 mb-4"
        >
          {domains.map((domain) => (
            <Button
              key={domain}
              variant={selectedDomain === domain ? "accent" : "outline"}
              size="sm"
              onClick={() => setSelectedDomain(domain)}
            >
              {domain}
            </Button>
          ))}
        </motion.div>

        {/* Tier Pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2 mb-8"
        >
          <Button
            variant={selectedTier === null ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSelectedTier(null)}
          >
            All Tiers
          </Button>
          {Object.entries(tierConfig).map(([tier, config]) => {
            const TierIcon = config.icon;
            return (
              <Button
                key={tier}
                variant={selectedTier === tier ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSelectedTier(selectedTier === tier ? null : tier)}
                className={selectedTier === tier ? config.bg : ""}
              >
                <TierIcon className={`h-3 w-3 mr-1 ${config.color}`} />
                {config.label}
              </Button>
            );
          })}
        </motion.div>

        {/* Recruiters Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : recruiters.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No recruiters found</p>
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
            >
              {recruiters.map((recruiter, index) => {
                const tierKey = getRecruiterTierKey(recruiter.tier);
                const tier = tierConfig[tierKey] || tierConfig.FREE;
                const TierIcon = tier.icon;
                const isLocked = !c_canAccessRecruiter(recruiter.tier);

                return (
                  <motion.div
                    key={recruiter.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <Card
                      className={`border-border/50 bg-card/50 transition-all h-full ${isLocked ? "opacity-75" : "hover:border-accent/50"
                        }`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-accent/20 text-accent">
                              {recruiter.name.split(" ").map((n) => n[0]).join("").substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold truncate">{recruiter.name}</h3>
                              <Badge className={`${tier.bg} ${tier.color} border-0 text-xs shrink-0`}>
                                <TierIcon className="h-3 w-3 mr-1" />
                                {tier.label}
                              </Badge>
                            </div>
                            {recruiter.company && (
                              <div className="flex items-center gap-1 mt-1">
                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground truncate">
                                  {recruiter.company}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 mt-1">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground truncate">
                                {/* Explicitly hide email if locked OR if logic mismatch */}
                                {isLocked || (!isSuperadmin && tierKey === 'PRO_MAX' && getTierLevel(profile?.subscription_tier) < 2)
                                  ? "••••••@••••.com"
                                  : recruiter.email}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/50">
                          <div className="flex items-center gap-1">
                            <Star className={`h-4 w-4 ${getQualityColor(recruiter.quality_score)}`} />
                            <span className="text-sm font-medium">{recruiter.quality_score || 0}</span>
                            <span className="text-xs text-muted-foreground">quality</span>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">{recruiter.response_rate || 0}%</span>
                            <span className="text-muted-foreground ml-1">response</span>
                          </div>
                        </div>

                        {recruiter.domain && (
                          <div className="flex items-center gap-2 mt-4">
                            <Badge variant="outline" className="text-xs">
                              {recruiter.domain}
                            </Badge>
                          </div>
                        )}

                        <Button
                          variant={isLocked ? "outline" : "hero"}
                          className="w-full mt-4"
                          onClick={() => {
                            if (isLocked) {
                              navigate("/subscription");
                            } else {
                              navigate(`/compose?recruiter=${recruiter.id}`);
                            }
                          }}
                        >
                          {isLocked ? (
                            <>
                              <Crown className="h-4 w-4 mr-2" />
                              Upgrade to Contact
                            </>
                          ) : (
                            <>
                              <Mail className="h-4 w-4 mr-2" />
                              Contact
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Numbered Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pb-8">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Recruiters;
