import { useEffect, useMemo, useState } from "react";
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
import { Search, RefreshCw, UserSearch, Plus, Building2, Mail, Star, Upload, ChevronLeft, ChevronRight, Trash2, Download, Layers } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

function normalizeRecruiterEmail(email: string): string {
  return email.trim().toLowerCase();
}

interface Recruiter {
  id: string;
  name: string;
  email: string;
  company: string | null;
  domain: string | null;
  tier: string | null;
  quality_score: number | null;
  response_rate: number | null;
  created_at?: string | null;
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
  const [duplicateFilter, setDuplicateFilter] = useState<"all" | "duplicates">("all");
  const [deletingDuplicates, setDeletingDuplicates] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkImportDialogOpen, setIsBulkImportDialogOpen] = useState(false);
  const [bulkImportLoading, setBulkImportLoading] = useState(false);
  const [bulkImportMode, setBulkImportMode] = useState<"sheet" | "csv">("sheet");
  const [bulkImportSheetUrl, setBulkImportSheetUrl] = useState("");
  const [bulkImportCsvData, setBulkImportCsvData] = useState("");
  const [bulkImportCsvFileName, setBulkImportCsvFileName] = useState("");
  const [bulkImportSkipDuplicates, setBulkImportSkipDuplicates] = useState(true);
  const [newRecruiter, setNewRecruiter] = useState({
    name: "",
    email: "",
    company: "",
    domain: "",
    tier: "FREE",
  });

  const RECRUITERS_PER_PAGE = 100;

  useEffect(() => {
    fetchRecruiters();
    fetchDomains();
  }, []);

  const fetchRecruiters = async () => {
    setLoading(true);
    try {
      // Supabase has a default limit of 1000 rows, so we need to fetch in batches
      let allRecruiters: Recruiter[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error, count } = await supabase
          .from("recruiters")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, from + batchSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allRecruiters = [...allRecruiters, ...data];
          from += batchSize;
          hasMore = data.length === batchSize; // Continue if we got a full batch
        } else {
          hasMore = false;
        }

        // Safety check to prevent infinite loops
        if (from > 100000) {
          console.warn("Reached safety limit while fetching recruiters");
          break;
        }
      }

      console.log(`Fetched ${allRecruiters.length} recruiters total`);
      setRecruiters(allRecruiters);
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

  const duplicateEmailKeys = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of recruiters) {
      const k = normalizeRecruiterEmail(r.email);
      if (!k) continue;
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    const keys = new Set<string>();
    counts.forEach((n, email) => {
      if (n > 1) keys.add(email);
    });
    return keys;
  }, [recruiters]);

  const duplicateStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of recruiters) {
      const k = normalizeRecruiterEmail(r.email);
      if (!k) continue;
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    let emailsWithDuplicates = 0;
    let rowsToRemove = 0;
    counts.forEach((n) => {
      if (n > 1) {
        emailsWithDuplicates += 1;
        rowsToRemove += n - 1;
      }
    });
    return { emailsWithDuplicates, rowsToRemove };
  }, [recruiters]);

  const isDuplicateEmailRow = (email: string) => duplicateEmailKeys.has(normalizeRecruiterEmail(email));

  const deleteDuplicateRecruiters = async () => {
    const byEmail = new Map<string, Recruiter[]>();
    for (const r of recruiters) {
      const k = normalizeRecruiterEmail(r.email);
      if (!k) continue;
      if (!byEmail.has(k)) byEmail.set(k, []);
      byEmail.get(k)!.push(r);
    }

    const toDelete: string[] = [];
    for (const [, rows] of byEmail) {
      if (rows.length < 2) continue;
      const sorted = [...rows].sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (tb !== ta) return tb - ta;
        return b.id.localeCompare(a.id);
      });
      for (let i = 1; i < sorted.length; i++) {
        toDelete.push(sorted[i].id);
      }
    }

    if (toDelete.length === 0) {
      toast.info("No duplicate emails found.");
      return;
    }

    const msg =
      `Delete ${toDelete.length} duplicate row(s), keeping the newest entry per email (by created date)? This cannot be undone.`;
    if (!confirm(msg)) return;

    setDeletingDuplicates(true);
    try {
      const batchSize = 100;
      for (let i = 0; i < toDelete.length; i += batchSize) {
        const batch = toDelete.slice(i, i + batchSize);
        const { error } = await supabase.from("recruiters").delete().in("id", batch);
        if (error) throw error;
      }
      toast.success(`Removed ${toDelete.length} duplicate recruiter row(s).`);
      await fetchRecruiters();
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to remove duplicates");
    } finally {
      setDeletingDuplicates(false);
    }
  };

  const deleteAllRecruiters = async () => {
    const confirmMessage = `Are you sure you want to delete ALL ${recruiters.length} recruiters? This action cannot be undone!`;
    if (!confirm(confirmMessage)) return;

    const doubleConfirm = prompt(`Type "DELETE ALL" to confirm deletion of all ${recruiters.length} recruiters:`);
    if (doubleConfirm !== "DELETE ALL") {
      toast.info("Deletion cancelled");
      return;
    }

    setLoading(true);
    try {
      // Delete all recruiters by selecting all IDs and deleting them
      const recruiterIds = recruiters.map(r => r.id);
      
      if (recruiterIds.length === 0) {
        toast.info("No recruiters to delete");
        return;
      }

      // Delete in batches to avoid query size limits
      const batchSize = 100;
      for (let i = 0; i < recruiterIds.length; i += batchSize) {
        const batch = recruiterIds.slice(i, i + batchSize);
        const { error } = await supabase
          .from("recruiters")
          .delete()
          .in("id", batch);
        
        if (error) throw error;
      }
      
      toast.success(`All ${recruiters.length} recruiters deleted successfully`);
      fetchRecruiters();
    } catch (error: any) {
      console.error("Failed to delete all recruiters:", error);
      toast.error(error.message || "Failed to delete all recruiters");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImport = async () => {
    if (bulkImportMode === "sheet" && !bulkImportSheetUrl.trim()) {
      toast.error("Please enter a Google Sheets URL");
      return;
    }
    if (bulkImportMode === "csv" && !bulkImportCsvData.trim()) {
      toast.error("Please upload a CSV file");
      return;
    }

    setBulkImportLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        throw new Error("Not authenticated. Please sign in again.");
      }

      const { data, error } = await supabase.functions.invoke("bulk-import-recruiters", {
        body: {
          sheet_url: bulkImportMode === "sheet" ? bulkImportSheetUrl.trim() : undefined,
          csv_data: bulkImportMode === "csv" ? bulkImportCsvData : undefined,
          file_name: bulkImportMode === "csv" ? bulkImportCsvFileName : undefined,
          skip_duplicates: bulkImportSkipDuplicates,
        },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) {
        console.error("Function invocation error:", error);
        
        // Try to extract error message from error object
        let errorMessage = "Failed to import recruiters";
        
        // Check if error has a message
        if (error.message) {
          errorMessage = error.message;
        }
        
        // Check if error has context with error message
        if (error.context && error.context.body) {
          try {
            const errorBody = typeof error.context.body === 'string' 
              ? JSON.parse(error.context.body) 
              : error.context.body;
            
            if (errorBody.error) {
              errorMessage = errorBody.error;
            }
            if (errorBody.errors && Array.isArray(errorBody.errors)) {
              const errorCount = errorBody.errors.length;
              errorMessage += `. ${errorCount} validation error${errorCount !== 1 ? 's' : ''} found.`;
              if (errorBody.errors.length > 0) {
                console.error("First few errors:", errorBody.errors.slice(0, 5));
                // Show first error as example
                errorMessage += ` Example: ${errorBody.errors[0]}`;
              }
            }
          } catch (e) {
            // If parsing fails, use default message
          }
        }
        
        toast.error(errorMessage, { duration: 10000 });
        return;
      }

      // Check if response contains an error
      if (data && data.error) {
        let errorMessage = data.error;
        
        // Add error details if available
        if (data.errors) {
          if (Array.isArray(data.errors)) {
            const errorCount = data.errors.length;
            errorMessage += `. ${errorCount} error${errorCount !== 1 ? 's' : ''} found.`;
            if (data.errors.length > 0) {
              console.error("Errors:", data.errors.slice(0, 10));
              errorMessage += ` First error: ${data.errors[0]}`;
            }
          } else if (data.errors.total_count) {
            errorMessage += `. ${data.errors.total_count} error${data.errors.total_count !== 1 ? 's' : ''} found.`;
            if (data.errors.validation_errors && data.errors.validation_errors.length > 0) {
              errorMessage += ` Example: ${data.errors.validation_errors[0]}`;
            }
          }
        }
        
        toast.error(errorMessage, { duration: 10000 });
        if (data.details) {
          console.error("Error details:", data.details);
        }
        return;
      }

      // Check if response indicates success
      if (data && data.success !== undefined) {
        if (data.success) {
          const message = data.message || `Import completed: ${data.stats?.inserted || 0} inserted, ${data.stats?.skipped || 0} skipped`;
          toast.success(message);

          // Show warning if CSV was truncated
          if (data.warning) {
            toast.warning(data.warning, { duration: 8000 });
          }

          // Show detailed error information
          if (data.errors) {
            const errorCount = typeof data.errors === 'number' 
              ? data.errors 
              : data.errors.total_count || 0;
            
            if (errorCount > 0) {
              console.warn("Import errors:", data.errors);
              
              // Show detailed error message
              let errorMessage = `${errorCount} error${errorCount !== 1 ? 's' : ''} occurred during import`;
              if (data.errors.message) {
                errorMessage += `. ${data.errors.message}`;
              }
              
              toast.warning(errorMessage, { duration: 6000 });
              
              // Log first few errors for debugging
              if (data.errors.validation_errors && data.errors.validation_errors.length > 0) {
                console.warn("Validation errors (first 10):", data.errors.validation_errors.slice(0, 10));
              }
              if (data.errors.insert_errors && data.errors.insert_errors.length > 0) {
                console.warn("Insert errors (first 10):", data.errors.insert_errors.slice(0, 10));
              }
            }
          }

          setIsBulkImportDialogOpen(false);
          setBulkImportSheetUrl("");
          setBulkImportCsvData("");
          setBulkImportCsvFileName("");
          setBulkImportMode("sheet");
          fetchRecruiters();
        } else {
          toast.error(data.message || "Import failed");
          if (data.errors) {
            console.error("Import errors:", data.errors);
          }
        }
      } else {
        // Unexpected response format
        console.error("Unexpected response format:", data);
        toast.error("Unexpected response from server");
      }
    } catch (error: any) {
      console.error("Bulk import error:", error);
      const errorMessage = error.message || error.toString() || "Failed to import recruiters";
      toast.error(errorMessage);
    } finally {
      setBulkImportLoading(false);
    }
  };

  const handleCsvFileUpload = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please upload a .csv file");
      return;
    }
    try {
      const text = await file.text();
      if (!text.trim()) {
        toast.error("Uploaded CSV is empty");
        return;
      }
      setBulkImportCsvData(text);
      setBulkImportCsvFileName(file.name);
      toast.success(`CSV loaded: ${file.name}`);
    } catch (error: any) {
      console.error("Failed to read CSV:", error);
      toast.error("Failed to read CSV file");
    }
  };

  const filteredRecruiters = recruiters.filter((recruiter) => {
    const matchesSearch =
      recruiter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recruiter.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (recruiter.company || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDomain = domainFilter === "all" || recruiter.domain === domainFilter;
    const matchesTier = tierFilter === "all" || recruiter.tier === tierFilter;
    const matchesDuplicateFilter =
      duplicateFilter === "all" || isDuplicateEmailRow(recruiter.email);
    return matchesSearch && matchesDomain && matchesTier && matchesDuplicateFilter;
  });

  const exportToCSV = () => {
    try {
      // Use filtered recruiters for export (respects current filters)
      const dataToExport = filteredRecruiters.length > 0 ? filteredRecruiters : recruiters;
      
      if (dataToExport.length === 0) {
        toast.error("No recruiters to export");
        return;
      }

      // Define CSV headers
      const headers = [
        "Name",
        "Email",
        "Company",
        "Domain",
        "Tier",
        "Quality Score",
        "Response Rate",
        "Created At"
      ];

      // Convert recruiters to CSV rows
      const csvRows = [
        headers.join(","),
        ...dataToExport.map((recruiter) => {
          // Escape commas and quotes in CSV values
          const escapeCSV = (value: any) => {
            if (value === null || value === undefined) return "";
            const stringValue = String(value);
            // If value contains comma, quote, or newline, wrap in quotes and escape quotes
            if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          };

          return [
            escapeCSV(recruiter.name),
            escapeCSV(recruiter.email),
            escapeCSV(recruiter.company),
            escapeCSV(recruiter.domain),
            escapeCSV(recruiter.tier),
            escapeCSV(recruiter.quality_score),
            escapeCSV(recruiter.response_rate),
            escapeCSV((recruiter as any).created_at ? new Date((recruiter as any).created_at).toLocaleDateString() : ""),
          ].join(",");
        }),
      ];

      // Create CSV content
      const csvContent = csvRows.join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `recruiters_export_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Exported ${dataToExport.length} recruiters to CSV`);
    } catch (error: any) {
      console.error("Failed to export CSV:", error);
      toast.error("Failed to export CSV: " + error.message);
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredRecruiters.length / RECRUITERS_PER_PAGE);
  const startIndex = (currentPage - 1) * RECRUITERS_PER_PAGE;
  const endIndex = startIndex + RECRUITERS_PER_PAGE;
  const paginatedRecruiters = filteredRecruiters.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, domainFilter, tierFilter, duplicateFilter]);

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

      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Recruiter Management</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage recruiter database</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button onClick={fetchRecruiters} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button 
              onClick={exportToCSV} 
              variant="outline" 
              size="sm"
              disabled={loading || (filteredRecruiters.length === 0 && recruiters.length === 0)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={deleteDuplicateRecruiters}
              variant="outline"
              size="sm"
              disabled={loading || deletingDuplicates || duplicateStats.rowsToRemove === 0}
              title="Keeps the newest row per email (by created_at); deletes the rest"
            >
              <Layers className={`h-4 w-4 mr-2 ${deletingDuplicates ? "animate-pulse" : ""}`} />
              {deletingDuplicates ? "Removing…" : "Remove duplicate emails"}
            </Button>
            <Button 
              onClick={deleteAllRecruiters} 
              variant="destructive" 
              size="sm"
              disabled={loading || recruiters.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All
            </Button>
            <Dialog open={isBulkImportDialogOpen} onOpenChange={setIsBulkImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Import
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Bulk Import Recruiters</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Import Source</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={bulkImportMode === "sheet" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setBulkImportMode("sheet")}
                      >
                        Google Sheet URL
                      </Button>
                      <Button
                        type="button"
                        variant={bulkImportMode === "csv" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setBulkImportMode("csv")}
                      >
                        CSV Upload
                      </Button>
                    </div>
                  </div>
                  {bulkImportMode === "sheet" ? (
                  <div className="space-y-2">
                    <Label>Google Sheets URL *</Label>
                    <Input
                      value={bulkImportSheetUrl}
                      onChange={(e) => setBulkImportSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                    />
                    <p className="text-sm text-muted-foreground">
                      Make sure the sheet is publicly accessible or shared with view permissions
                    </p>
                  </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>CSV File *</Label>
                      <Input
                        type="file"
                        accept=".csv,text/csv"
                        onChange={(e) => void handleCsvFileUpload(e.target.files?.[0])}
                      />
                      <p className="text-sm text-muted-foreground">
                        Upload a CSV file from your computer. Supports 1000+ recruiters in one upload.
                      </p>
                      {bulkImportCsvFileName ? (
                        <p className="text-xs text-muted-foreground">
                          Selected: {bulkImportCsvFileName}
                        </p>
                      ) : null}
                    </div>
                  )}
                  <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-0.5">
                      <Label>Skip Duplicates</Label>
                      <p className="text-sm text-muted-foreground">
                        Skip recruiters with existing email addresses
                      </p>
                    </div>
                    <Switch
                      checked={bulkImportSkipDuplicates}
                      onCheckedChange={setBulkImportSkipDuplicates}
                    />
                  </div>
                  <div className="rounded-lg border p-4 bg-muted/50">
                    <p className="text-sm font-semibold mb-2">Required Columns:</p>
                    <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                      <li><strong>name</strong> - Recruiter name</li>
                      <li><strong>email</strong> - Email address (must be unique)</li>
                    </ul>
                    <p className="text-sm font-semibold mt-3 mb-2">Optional Columns:</p>
                    <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                      <li><strong>company</strong> - Company name</li>
                      <li><strong>domain</strong> - Job domain</li>
                      <li><strong>tier</strong> - FREE, PRO, or PRO_MAX (defaults to FREE)</li>
                      <li><strong>quality_score</strong> - Number between 0-100</li>
                    </ul>
                  </div>
                  <Button
                    onClick={handleBulkImport}
                    disabled={
                      bulkImportLoading ||
                      (bulkImportMode === "sheet" && !bulkImportSheetUrl.trim()) ||
                      (bulkImportMode === "csv" && !bulkImportCsvData.trim())
                    }
                    className="w-full"
                  >
                    {bulkImportLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Import Recruiters
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
              <Select
                value={duplicateFilter}
                onValueChange={(v) => setDuplicateFilter(v as "all" | "duplicates")}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Duplicates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All rows</SelectItem>
                  <SelectItem value="duplicates">Duplicate emails only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {duplicateStats.emailsWithDuplicates > 0 && (
              <p className="text-sm text-muted-foreground mt-3">
                <span className="text-amber-600 dark:text-amber-500 font-medium">
                  {duplicateStats.emailsWithDuplicates}
                </span>{" "}
                email(s) appear more than once ({duplicateStats.rowsToRemove} extra row
                {duplicateStats.rowsToRemove !== 1 ? "s" : ""}). Use{" "}
                <strong>Duplicate emails only</strong> to review, then{" "}
                <strong>Remove duplicate emails</strong> to keep the newest row per address.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recruiters Table */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <UserSearch className="h-4 w-4 sm:h-5 sm:w-5" />
              Recruiters ({filteredRecruiters.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Recruiter</TableHead>
                    <TableHead className="min-w-[120px]">Company</TableHead>
                    <TableHead className="min-w-[100px]">Domain</TableHead>
                    <TableHead className="min-w-[100px]">Tier</TableHead>
                    <TableHead className="min-w-[100px]">Quality</TableHead>
                    <TableHead className="text-right min-w-[120px]">Actions</TableHead>
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
                    paginatedRecruiters.map((recruiter) => (
                      <TableRow key={recruiter.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium flex flex-wrap items-center gap-2">
                              {recruiter.name}
                              {isDuplicateEmailRow(recruiter.email) && (
                                <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-700 dark:text-amber-400">
                                  Duplicate email
                                </Badge>
                              )}
                            </div>
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
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredRecruiters.length)} of {filteredRecruiters.length} recruiters
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      return null;
                    })}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
