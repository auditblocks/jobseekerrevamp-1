import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowLeft,
  Search,
  Mail,
  Eye,
  MousePointer,
  Reply,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar as CalendarIcon,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { DateRange } from "react-day-picker";

interface EmailRecord {
  id: string;
  recipient: string;
  subject: string;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  replied_at: string | null;
  bounced_at: string | null;
  domain: string | null;
}

const statusConfig = {
  sent: { icon: Mail, color: "text-muted-foreground", bg: "bg-muted/50", label: "Sent" },
  delivered: { icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-500/10", label: "Delivered" },
  opened: { icon: Eye, color: "text-accent", bg: "bg-accent/10", label: "Opened" },
  clicked: { icon: MousePointer, color: "text-purple-500", bg: "bg-purple-500/10", label: "Clicked" },
  replied: { icon: Reply, color: "text-success", bg: "bg-success/10", label: "Replied" },
  bounced: { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Bounced" },
};

const EmailHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEmails = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("email_tracking")
          .select("id, recipient, subject, status, sent_at, opened_at, clicked_at, replied_at, bounced_at, domain")
          .eq("user_id", user.id)
          .order("sent_at", { ascending: false });

        if (error) throw error;
        
        setEmails(data || []);
        
        // Extract unique domains
        const uniqueDomains = [...new Set((data || []).map(e => e.domain).filter(Boolean))] as string[];
        setDomains(uniqueDomains);
      } catch (error) {
        console.error("Error fetching emails:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmails();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("email-tracking-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "email_tracking",
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setEmails((prev) => [payload.new as EmailRecord, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setEmails((prev) =>
              prev.map((e) => (e.id === payload.new.id ? (payload.new as EmailRecord) : e))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const getEmailStatus = (email: EmailRecord): string => {
    if (email.bounced_at) return "bounced";
    if (email.replied_at) return "replied";
    if (email.clicked_at) return "clicked";
    if (email.opened_at) return "opened";
    if (email.status === "delivered") return "delivered";
    return "sent";
  };

  const filteredEmails = emails.filter((email) => {
    const matchesSearch =
      email.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchQuery.toLowerCase());
    
    const emailStatus = getEmailStatus(email);
    const matchesStatus = !statusFilter || emailStatus === statusFilter;
    
    const matchesDomain = domainFilter === "all" || email.domain === domainFilter;
    
    let matchesDate = true;
    if (dateRange?.from && email.sent_at) {
      const emailDate = parseISO(email.sent_at);
      matchesDate = isWithinInterval(emailDate, {
        start: startOfDay(dateRange.from),
        end: endOfDay(dateRange.to || dateRange.from),
      });
    }
    
    return matchesSearch && matchesStatus && matchesDomain && matchesDate;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusCounts = () => {
    const counts: Record<string, number> = {};
    emails.forEach((email) => {
      const status = getEmailStatus(email);
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <>
      <Helmet>
        <title>Email History | JobSeeker</title>
        <meta name="description" content="Track all your sent emails and their status" />
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
                  <h1 className="text-xl font-bold text-foreground">Email History</h1>
                  <p className="text-sm text-muted-foreground">Track all your sent emails</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Stats Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8"
          >
            {Object.entries(statusConfig).map(([key, config]) => {
              const count = statusCounts[key] || 0;
              const StatusIcon = config.icon;
              return (
                <Card
                  key={key}
                  className={`border-border/50 cursor-pointer transition-all hover:border-border ${
                    statusFilter === key ? "ring-2 ring-accent" : ""
                  }`}
                  onClick={() => setStatusFilter(statusFilter === key ? null : key)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${config.bg}`}>
                        <StatusIcon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{count}</p>
                        <p className="text-xs text-muted-foreground">{config.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>

          {/* Search and Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row gap-4 mb-6"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by recipient, subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card/50"
              />
            </div>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[200px] justify-start">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      "Date Range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                  <div className="p-3 border-t flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)}>
                      Clear
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Select value={domainFilter} onValueChange={setDomainFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Domains</SelectItem>
                  {domains.map((domain) => (
                    <SelectItem key={domain} value={domain}>
                      {domain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {/* Email List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredEmails.length === 0 ? (
                  <div className="text-center py-12">
                    <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No emails found</h3>
                    <p className="text-muted-foreground">
                      {emails.length === 0
                        ? "Start sending emails to see them here"
                        : "Try adjusting your filters"}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {filteredEmails.map((email, index) => {
                      const emailStatus = getEmailStatus(email);
                      const status = statusConfig[emailStatus as keyof typeof statusConfig];
                      const StatusIcon = status.icon;
                      return (
                        <motion.div
                          key={email.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                        >
                          <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-lg ${status.bg} shrink-0`}>
                              <StatusIcon className={`h-4 w-4 ${status.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium truncate">{email.recipient}</span>
                                {email.domain && (
                                  <Badge variant="secondary" className="text-xs shrink-0">
                                    {email.domain}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm truncate">{email.subject}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <Badge className={`${status.bg} ${status.color} border-0 mb-2`}>
                                {status.label}
                              </Badge>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatDate(email.sent_at)}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    </>
  );
};

export default EmailHistory;
