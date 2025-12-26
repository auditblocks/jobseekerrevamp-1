import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Plus, RefreshCw, Users } from "lucide-react";
import { toast } from "sonner";

interface Domain {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number | null;
  recruiter_count?: number;
}

export default function AdminDomains() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDomain, setNewDomain] = useState({
    name: "",
    display_name: "",
    description: "",
  });

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    setLoading(true);
    try {
      const { data: domainsData, error } = await supabase
        .from("domains")
        .select("*")
        .order("sort_order");

      if (error) throw error;

      // Get recruiter counts per domain
      const { data: recruiters } = await supabase
        .from("recruiters")
        .select("domain");

      const domainCounts = new Map<string, number>();
      recruiters?.forEach((r) => {
        if (r.domain) {
          domainCounts.set(r.domain, (domainCounts.get(r.domain) || 0) + 1);
        }
      });

      const domainsWithCounts = (domainsData || []).map((domain) => ({
        ...domain,
        recruiter_count: domainCounts.get(domain.name) || 0,
      }));

      setDomains(domainsWithCounts);
    } catch (error: any) {
      console.error("Failed to fetch domains:", error);
      toast.error("Failed to fetch domains");
    } finally {
      setLoading(false);
    }
  };

  const addDomain = async () => {
    try {
      const { error } = await supabase.from("domains").insert({
        name: newDomain.name.toLowerCase().replace(/\s+/g, "_"),
        display_name: newDomain.display_name,
        description: newDomain.description || null,
        sort_order: domains.length,
      });

      if (error) throw error;
      toast.success("Domain added successfully");
      setIsAddDialogOpen(false);
      setNewDomain({ name: "", display_name: "", description: "" });
      fetchDomains();
    } catch (error: any) {
      toast.error(error.message || "Failed to add domain");
    }
  };

  const toggleDomainStatus = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("domains")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Domain ${isActive ? "activated" : "deactivated"}`);
      fetchDomains();
    } catch (error: any) {
      toast.error("Failed to update domain status");
    }
  };

  const deleteDomain = async (id: string) => {
    if (!confirm("Are you sure you want to delete this domain?")) return;

    try {
      const { error } = await supabase.from("domains").delete().eq("id", id);
      if (error) throw error;
      toast.success("Domain deleted");
      fetchDomains();
    } catch (error: any) {
      toast.error("Failed to delete domain");
    }
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Domain Management | Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Domain Management</h1>
            <p className="text-muted-foreground">Manage job domains and categories</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchDomains} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Domain
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Domain</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Display Name *</Label>
                    <Input
                      value={newDomain.display_name}
                      onChange={(e) => setNewDomain({ ...newDomain, display_name: e.target.value })}
                      placeholder="Technology"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Internal Name *</Label>
                    <Input
                      value={newDomain.name}
                      onChange={(e) => setNewDomain({ ...newDomain, name: e.target.value })}
                      placeholder="technology"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={newDomain.description}
                      onChange={(e) => setNewDomain({ ...newDomain, description: e.target.value })}
                      placeholder="Description of this domain..."
                    />
                  </div>
                  <Button
                    onClick={addDomain}
                    disabled={!newDomain.name || !newDomain.display_name}
                    className="w-full"
                  >
                    Add Domain
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Domains Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Domains ({domains.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Internal Name</TableHead>
                    <TableHead>Recruiters</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : domains.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No domains found
                      </TableCell>
                    </TableRow>
                  ) : (
                    domains.map((domain) => (
                      <TableRow key={domain.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{domain.display_name}</div>
                            {domain.description && (
                              <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                                {domain.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{domain.name}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {domain.recruiter_count || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={domain.is_active}
                              onCheckedChange={(checked) =>
                                toggleDomainStatus(domain.id, checked)
                              }
                            />
                            <span className="text-sm text-muted-foreground">
                              {domain.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteDomain(domain.id)}
                          >
                            Delete
                          </Button>
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
