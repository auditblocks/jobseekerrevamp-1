import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
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
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

const Recruiters = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("All");
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [domains, setDomains] = useState<string[]>(["All"]);
  const [isLoading, setIsLoading] = useState(true);
  
  const userTier = profile?.subscription_tier || "FREE";

  // Fetch recruiters and domains
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch recruiters
        const { data: recruitersData, error: recruitersError } = await supabase
          .from("recruiters")
          .select("id, name, email, company, domain, tier, quality_score, response_rate")
          .order("name");

        if (recruitersError) throw recruitersError;
        setRecruiters(recruitersData || []);

        // Extract unique domains
        const uniqueDomains = [...new Set(recruitersData?.map(r => r.domain).filter(Boolean) || [])];
        setDomains(["All", ...uniqueDomains as string[]]);
      } catch (error) {
        console.error("Error fetching recruiters:", error);
        toast.error("Failed to load recruiters");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredRecruiters = recruiters.filter((recruiter) => {
    const matchesSearch =
      recruiter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recruiter.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (recruiter.company?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesDomain = selectedDomain === "All" || recruiter.domain === selectedDomain;
    const matchesTier = !selectedTier || recruiter.tier === selectedTier;
    // Filter by tier - only show recruiters user can access (unless they specifically filter by tier)
    const matchesUserTier = selectedTier ? true : canAccessRecruiter(recruiter.tier);
    return matchesSearch && matchesDomain && matchesTier && matchesUserTier;
  });

  const canAccessRecruiter = (tier: string | null) => {
    const tierOrder = ["FREE", "PRO", "PRO_MAX"];
    const recruiterTier = tier || "FREE";
    return tierOrder.indexOf(recruiterTier) <= tierOrder.indexOf(userTier);
  };

  const getQualityColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 90) return "text-success";
    if (score >= 70) return "text-accent";
    return "text-warning";
  };

  return (
    <>
      <Helmet>
        <title>Recruiters | JobSeeker</title>
        <meta name="description" content="Browse and contact recruiters in your industry" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Recruiters</h1>
                  <p className="text-sm text-muted-foreground">Find recruiters in your industry</p>
                </div>
              </div>
              <Badge variant="outline" className="text-accent border-accent/30">
                <Users className="h-3 w-3 mr-1" />
                {recruiters.length} recruiters
              </Badge>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Search and Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
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
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </motion.div>

          {/* Domain Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
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

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRecruiters.length === 0 ? (
            <div className="text-center py-16">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No recruiters found</p>
            </div>
          ) : (
            /* Recruiters Grid */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredRecruiters.map((recruiter, index) => {
                const tierKey = (recruiter.tier || "FREE") as keyof typeof tierConfig;
                const tier = tierConfig[tierKey] || tierConfig.FREE;
                const TierIcon = tier.icon;
                const isLocked = !canAccessRecruiter(recruiter.tier);
                return (
                  <motion.div
                    key={recruiter.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className={`border-border/50 bg-card/50 transition-all h-full ${
                        isLocked ? "opacity-60" : "hover:border-accent/50"
                      }`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-accent/20 text-accent">
                              {recruiter.name.split(" ").map((n) => n[0]).join("")}
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
                                {isLocked ? "••••••@••••.com" : recruiter.email}
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
                          disabled={isLocked}
                          onClick={() => {
                            if (isLocked) {
                              toast.info("Upgrade to access this recruiter");
                            } else {
                              navigate("/compose");
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
          )}
        </main>
      </div>
    </>
  );
};

export default Recruiters;
