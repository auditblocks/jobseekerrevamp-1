/**
 * @fileoverview Admin Requests page — unified inbox for two request types:
 * 1. Domain / Recruiter addition requests submitted by users.
 * 2. Contact-form messages from the homepage, contact page, and app settings.
 * Admins can review, approve/reject, mark as resolved, and add internal notes.
 */

import { useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { FileText, RefreshCw, CheckCircle, XCircle, Clock, Mail } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

/** Shape of a domain/recruiter request from `domain_recruiter_requests`. */
interface DomainRequest {
  id: string;
  request_type: string;
  domain_name: string | null;
  recruiter_name: string | null;
  recruiter_email: string | null;
  company_name: string | null;
  status: string | null;
  admin_notes: string | null;
  created_at: string | null;
  user_id: string | null;
}

/** Shape of a contact-form submission from `contact_submissions`. */
interface ContactSubmission {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  source: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Admin page presenting a tabbed view of domain/recruiter requests and
 * contact messages. Each tab has independent status filters and action dialogs.
 * @returns {JSX.Element}
 */
export default function AdminRequests() {
  const [requests, setRequests] = useState<DomainRequest[]>([]);
  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [loadingDomain, setLoadingDomain] = useState(true);
  const [loadingContact, setLoadingContact] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [contactStatusFilter, setContactStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<DomainRequest | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactSubmission | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [contactAdminNotes, setContactAdminNotes] = useState("");

  const fetchDomainRequests = useCallback(async () => {
    setLoadingDomain(true);
    try {
      const { data, error } = await supabase
        .from("domain_recruiter_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests((data as DomainRequest[]) || []);
    } catch (error: unknown) {
      console.error("Failed to fetch requests:", error);
      toast.error("Failed to fetch domain/recruiter requests");
    } finally {
      setLoadingDomain(false);
    }
  }, []);

  const fetchContactSubmissions = useCallback(async () => {
    setLoadingContact(true);
    try {
      const { data, error } = await supabase
        .from("contact_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setContacts((data as ContactSubmission[]) || []);
    } catch (error: unknown) {
      console.error("Failed to fetch contact submissions:", error);
      toast.error("Failed to fetch contact messages");
    } finally {
      setLoadingContact(false);
    }
  }, []);

  useEffect(() => {
    fetchDomainRequests();
    fetchContactSubmissions();
  }, [fetchDomainRequests, fetchContactSubmissions]);

  const refreshAll = () => {
    fetchDomainRequests();
    fetchContactSubmissions();
  };

  const loading = loadingDomain || loadingContact;

  const updateRequestStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("domain_recruiter_requests")
        .update({
          status,
          admin_notes: adminNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Request ${status}`);
      setSelectedRequest(null);
      setAdminNotes("");
      fetchDomainRequests();
    } catch {
      toast.error("Failed to update request");
    }
  };

  const updateContactSubmission = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("contact_submissions")
        .update({
          status,
          admin_notes: contactAdminNotes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      toast.success(status === "resolved" ? "Marked as resolved" : "Reopened");
      setSelectedContact(null);
      setContactAdminNotes("");
      fetchContactSubmissions();
    } catch {
      toast.error("Failed to update contact submission");
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (statusFilter === "all") return true;
    return req.status === statusFilter;
  });

  const filteredContacts = contacts.filter((c) => {
    if (contactStatusFilter === "all") return true;
    return c.status === contactStatusFilter;
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500/10 text-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-destructive/10 text-destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "domain":
        return <Badge variant="outline">Domain</Badge>;
      case "recruiter":
        return <Badge variant="secondary">Recruiter</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getContactStatusBadge = (status: string) => {
    if (status === "resolved") {
      return (
        <Badge className="bg-green-500/10 text-green-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Resolved
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-500/10 text-yellow-500">
        <Clock className="h-3 w-3 mr-1" />
        Open
      </Badge>
    );
  };

  /** Maps the raw `source` column to a user-friendly display label. */
  const sourceLabel = (s: string) => {
    switch (s) {
      case "home":
        return "Home page";
      case "contact_page":
        return "Contact page";
      case "settings":
        return "Settings";
      default:
        return s;
    }
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>User Requests | Admin</title>
      </Helmet>

      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">User Requests</h1>
            <p className="text-muted-foreground">
              Domain and recruiter requests, plus contact form messages from the site and app settings.
            </p>
          </div>
          <Button onClick={refreshAll} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="domain" className="space-y-4">
          <TabsList className="bg-card border border-border p-1 h-auto flex-wrap justify-start">
            <TabsTrigger value="domain" className="gap-2">
              <FileText className="h-4 w-4" />
              Recruiter &amp; domain
            </TabsTrigger>
            <TabsTrigger value="contact" className="gap-2">
              <Mail className="h-4 w-4" />
              Contact messages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="domain" className="space-y-4">
            <div className="flex justify-end">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Requests ({filteredRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingDomain ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ) : filteredRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No requests found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell>{getTypeBadge(request.request_type)}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {request.domain_name && (
                                  <div className="text-sm">
                                    Domain: <span className="font-medium">{request.domain_name}</span>
                                  </div>
                                )}
                                {request.recruiter_name && (
                                  <div className="text-sm">
                                    Recruiter: <span className="font-medium">{request.recruiter_name}</span>
                                  </div>
                                )}
                                {request.recruiter_email && (
                                  <div className="text-sm text-muted-foreground">{request.recruiter_email}</div>
                                )}
                                {request.company_name && (
                                  <div className="text-sm">Company: {request.company_name}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(request.status)}</TableCell>
                            <TableCell>
                              {request.created_at ? format(new Date(request.created_at), "MMM d, yyyy") : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {request.status === "pending" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setAdminNotes(request.admin_notes || "");
                                  }}
                                >
                                  Review
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4">
            <div className="flex justify-end">
              <Select value={contactStatusFilter} onValueChange={setContactStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Contact messages ({filteredContacts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingContact ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ) : filteredContacts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No contact messages yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredContacts.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="whitespace-nowrap text-sm">
                              {row.created_at ? format(new Date(row.created_at), "MMM d, yyyy HH:mm") : "-"}
                            </TableCell>
                            <TableCell>{sourceLabel(row.source)}</TableCell>
                            <TableCell>
                              <div className="text-sm font-medium">{row.name}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[180px]">{row.email}</div>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm">{row.subject}</TableCell>
                            <TableCell>{getContactStatusBadge(row.status)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedContact(row);
                                  setContactAdminNotes(row.admin_notes || "");
                                }}
                              >
                                View
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
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Request Type</div>
                <div>{getTypeBadge(selectedRequest.request_type)}</div>
              </div>
              {selectedRequest.domain_name && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Domain Name</div>
                  <div className="font-medium">{selectedRequest.domain_name}</div>
                </div>
              )}
              {selectedRequest.recruiter_name && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Recruiter</div>
                  <div className="font-medium">{selectedRequest.recruiter_name}</div>
                  <div className="text-sm text-muted-foreground">{selectedRequest.recruiter_email}</div>
                </div>
              )}
              {selectedRequest.company_name && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Company</div>
                  <div className="font-medium">{selectedRequest.company_name}</div>
                </div>
              )}
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Admin Notes</div>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes for this request..."
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => updateRequestStatus(selectedRequest.id, "rejected")}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button className="flex-1" onClick={() => updateRequestStatus(selectedRequest.id, "approved")}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedContact} onOpenChange={() => setSelectedContact(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contact message</DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Source</div>
                <div>{sourceLabel(selectedContact.source)}</div>
                <div className="text-muted-foreground">Status</div>
                <div>{getContactStatusBadge(selectedContact.status)}</div>
                {selectedContact.user_id && (
                  <>
                    <div className="text-muted-foreground">User ID</div>
                    <div className="font-mono text-xs break-all">{selectedContact.user_id}</div>
                  </>
                )}
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Name</div>
                <div className="font-medium">{selectedContact.name}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Email</div>
                <a href={`mailto:${selectedContact.email}`} className="text-primary hover:underline text-sm break-all">
                  {selectedContact.email}
                </a>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Subject</div>
                <div className="font-medium">{selectedContact.subject}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Message</div>
                <div className="text-sm whitespace-pre-wrap rounded-md border bg-muted/30 p-3 max-h-48 overflow-y-auto">
                  {selectedContact.message}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Admin notes</div>
                <Textarea
                  value={contactAdminNotes}
                  onChange={(e) => setContactAdminNotes(e.target.value)}
                  placeholder="Internal notes (optional)..."
                  rows={3}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {selectedContact.status === "open" ? (
                  <Button className="flex-1" onClick={() => updateContactSubmission(selectedContact.id, "resolved")}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark resolved
                  </Button>
                ) : (
                  <Button variant="outline" className="flex-1" onClick={() => updateContactSubmission(selectedContact.id, "open")}>
                    Reopen
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
