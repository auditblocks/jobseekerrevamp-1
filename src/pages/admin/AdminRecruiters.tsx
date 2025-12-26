import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Search, RefreshCw, UserSearch, Plus, Building2, Mail, Star } from "lucide-react";
import { toast } from "sonner";

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

interface Domain {
  id: string;
  name: string;
  display_name: string;
}

export default function AdminRecruiters() {
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newRecruiter, setNewRecruiter] = useState({
    name: "",
    email: "",
    company: "",
    domain: "",
    tier: "FREE",
  });

  useEffect(() => {
    fetchRecruiters();
    fetchDomains();
  }, []);

  const fetchRecruiters = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("recruiters")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setRecruiters(data || []);
    } catch (error: any) {
      console.error("Failed to fetch recruiters:", error);
      toast.error("Failed to fetch recruiters");
    } finally {
      setLoading(false);
    }
  };

  const fetchDomains = async () => {
    const { data } = await supabase
      .from("domains")
      .select("id, name, display_name")
      .eq("is_active", true)
      .order("sort_order");
    setDomains(data || []);
  };

  const addRecruiter = async () => {
    try {
      const { error } = await supabase.from("recruiters").insert({
        name: newRecruiter.name,
        email: newRecruiter.email,
        company: newRecruiter.company || null,
        domain: newRecruiter.domain || null,
        tier: newRecruiter.tier,
      });

      if (error) throw error;
      toast.success("Recruiter added successfully");
      setIsAddDialogOpen(false);
      setNewRecruiter({ name: "", email: "", company: "", domain: "", tier: "FREE" });
      fetchRecruiters();
    } catch (error: any) {
      toast.error(error.message || "Failed to add recruiter");
    }
  };

  const updateRecruiterTier = async (id: string, tier: string) => {
    try {
      const { error } = await supabase
        .from("recruiters")
        .update({ tier })
        .eq("id", id);

      if (error) throw error;
      toast.success("Recruiter tier updated");
      fetchRecruiters();
    } catch (error: any) {
      toast.error("Failed to update tier");
    }
  };

  const deleteRecruiter = async (id: string) => {
    if (!confirm("Are you sure you want to delete this recruiter?")) return;

    try {
      const { error } = await supabase.from("recruiters").delete().eq("id", id);
      if (error) throw error;
      toast.success("Recruiter deleted");
      fetchRecruiters();
    } catch (error: any) {
      toast.error("Failed to delete recruiter");
    }
  };

  const filteredRecruiters = recruiters.filter((recruiter) => {
    const matchesSearch =
      recruiter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recruiter.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (recruiter.company || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDomain = domainFilter === "all" || recruiter.domain === domainFilter;
    const matchesTier = tierFilter === "all" || recruiter.tier === tierFilter;
    return matchesSearch && matchesDomain && matchesTier;
  });

  const getTierColor = (tier: string | null) => {
    switch (tier) {
      case "PRO_MAX":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "PRO":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Recruiter Management | Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Recruiter Management</h1>
            <p className="text-muted-foreground">Manage recruiter database</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchRecruiters} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Recruiter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Recruiter</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={newRecruiter.name}
                      onChange={(e) => setNewRecruiter({ ...newRecruiter, name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={newRecruiter.email}
                      onChange={(e) => setNewRecruiter({ ...newRecruiter, email: e.target.value })}
                      placeholder="john@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input
                      value={newRecruiter.company}
                      onChange={(e) => setNewRecruiter({ ...newRecruiter, company: e.target.value })}
                      placeholder="Company Inc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Domain</Label>
                    <Select
                      value={newRecruiter.domain}
                      onValueChange={(value) => setNewRecruiter({ ...newRecruiter, domain: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select domain" />
                      </SelectTrigger>
                      <SelectContent>
                        {domains.map((domain) => (
                          <SelectItem key={domain.id} value={domain.name}>
                            {domain.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tier</Label>
                    <Select
                      value={newRecruiter.tier}
                      onValueChange={(value) => setNewRecruiter({ ...newRecruiter, tier: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FREE">Free</SelectItem>
                        <SelectItem value="PRO">Pro</SelectItem>
                        <SelectItem value="PRO_MAX">Pro Max</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={addRecruiter}
                    disabled={!newRecruiter.name || !newRecruiter.email}
                    className="w-full"
                  >
                    Add Recruiter
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={domainFilter} onValueChange={setDomainFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Domains</SelectItem>
                  {domains.map((domain) => (
                    <SelectItem key={domain.id} value={domain.name}>
                      {domain.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="FREE">Free</SelectItem>
                  <SelectItem value="PRO">Pro</SelectItem>
                  <SelectItem value="PRO_MAX">Pro Max</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Recruiters Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserSearch className="h-5 w-5" />
              Recruiters ({filteredRecruiters.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recruiter</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : filteredRecruiters.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No recruiters found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecruiters.map((recruiter) => (
                      <TableRow key={recruiter.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{recruiter.name}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {recruiter.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {recruiter.company ? (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              {recruiter.company}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {recruiter.domain ? (
                            <Badge variant="outline">{recruiter.domain}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getTierColor(recruiter.tier)}>
                            {recruiter.tier || "FREE"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {recruiter.quality_score !== null ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500" />
                              {recruiter.quality_score.toFixed(1)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Select
                              value={recruiter.tier || "FREE"}
                              onValueChange={(value) => updateRecruiterTier(recruiter.id, value)}
                            >
                              <SelectTrigger className="w-[90px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="FREE">Free</SelectItem>
                                <SelectItem value="PRO">Pro</SelectItem>
                                <SelectItem value="PRO_MAX">Pro Max</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteRecruiter(recruiter.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
