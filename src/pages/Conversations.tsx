import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Search,
  MessageSquare,
  Send,
  MoreVertical,
  Archive,
  Star,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

interface ConversationThread {
  id: string;
  recruiter_name: string | null;
  recruiter_email: string;
  company_name: string | null;
  subject_line: string | null;
  status: string;
  total_messages: number | null;
  user_messages_count: number | null;
  recruiter_messages_count: number | null;
  engagement_score: number | null;
  last_activity_at: string | null;
  metadata: any;
}

interface ConversationMessage {
  id: string;
  thread_id: string;
  sender_type: string;
  subject: string;
  body_preview: string | null;
  body_full: string | null;
  sent_at: string;
  status: string | null;
}

const Conversations = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "starred">("all");
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [starredThreads, setStarredThreads] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchThreads = async () => {
      if (!user?.id) return;

      setIsLoadingThreads(true);
      try {
        const { data, error } = await supabase
          .from("conversation_threads")
          .select("*")
          .eq("user_id", user.id)
          .order("last_activity_at", { ascending: false });

        if (error) throw error;
        setThreads(data || []);

        // Load starred from metadata
        const starred = new Set<string>();
        (data || []).forEach(t => {
          const meta = t.metadata as Record<string, any> | null;
          if (meta?.starred) starred.add(t.id);
        });
        setStarredThreads(starred);
      } catch (error) {
        console.error("Error fetching threads:", error);
      } finally {
        setIsLoadingThreads(false);
      }
    };

    fetchThreads();
  }, [user?.id]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedThread) {
        setMessages([]);
        return;
      }

      setIsLoadingMessages(true);
      try {
        const { data, error } = await supabase
          .from("conversation_messages")
          .select("*")
          .eq("thread_id", selectedThread)
          .order("sent_at", { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [selectedThread]);

  const handleSendReply = async () => {
    if (!selectedThread || !replyText.trim()) return;

    const thread = threads.find(t => t.id === selectedThread);
    if (!thread) return;

    setIsSending(true);
    try {
      // Send the email via Gmail
      const { error: sendError } = await supabase.functions.invoke("send-email-gmail", {
        body: {
          to: thread.recruiter_email,
          subject: thread.subject_line ? `Re: ${thread.subject_line}` : "Follow up",
          body: replyText,
        },
      });

      if (sendError) throw sendError;

      // Create message record
      const messageNumber = (thread.total_messages || 0) + 1;
      const { data: newMessage, error: messageError } = await supabase
        .from("conversation_messages")
        .insert({
          thread_id: selectedThread,
          sender_type: "user",
          subject: thread.subject_line ? `Re: ${thread.subject_line}` : "Follow up",
          body_preview: replyText.substring(0, 200),
          body_full: replyText,
          sent_at: new Date().toISOString(),
          message_number: messageNumber,
          status: "sent",
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Update thread
      await supabase
        .from("conversation_threads")
        .update({
          total_messages: messageNumber,
          user_messages_count: (thread.user_messages_count || 0) + 1,
          last_activity_at: new Date().toISOString(),
          last_user_message_at: new Date().toISOString(),
        })
        .eq("id", selectedThread);

      setMessages(prev => [...prev, newMessage]);
      setThreads(prev => prev.map(t =>
        t.id === selectedThread
          ? { ...t, total_messages: messageNumber, last_activity_at: new Date().toISOString() }
          : t
      ));
      setReplyText("");
      toast.success("Email sent successfully!");
    } catch (error: any) {
      console.error("Error sending reply:", error);
      toast.error(error.message || "Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  const toggleStar = async (threadId: string) => {
    const isStarred = starredThreads.has(threadId);
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;

    const newStarred = new Set(starredThreads);
    if (isStarred) {
      newStarred.delete(threadId);
    } else {
      newStarred.add(threadId);
    }
    setStarredThreads(newStarred);

    // Update metadata in database
    await supabase
      .from("conversation_threads")
      .update({
        metadata: { ...thread.metadata, starred: !isStarred }
      })
      .eq("id", threadId);
  };

  const filteredThreads = threads.filter((thread) => {
    const matchesSearch =
      (thread.recruiter_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (thread.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (thread.subject_line?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesFilter =
      filter === "all" ||
      (filter === "active" && thread.status === "active") ||
      (filter === "starred" && starredThreads.has(thread.id));
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Engagement score calculation:
  // - Base: 10 points
  // - Each recruiter message: +20 points
  // - Each user message response: +10 points
  // - Recency: +20 points if activity within 7 days
  // - Max: 100 points
  const calculateEngagement = (thread: ConversationThread): number => {
    let score = 10; // Base score

    // Recruiter messages (shows interest)
    score += (thread.recruiter_messages_count || 0) * 20;

    // User engagement
    score += (thread.user_messages_count || 0) * 10;

    // Recency bonus
    if (thread.last_activity_at) {
      const daysSinceActivity = Math.floor(
        (Date.now() - new Date(thread.last_activity_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceActivity <= 7) score += 20;
    }

    return Math.min(100, score);
  };

  const getEngagementColor = (score: number) => {
    if (score >= 70) return "text-success bg-success/10";
    if (score >= 40) return "text-warning bg-warning/10";
    return "text-muted-foreground bg-muted/50";
  };

  return (
    <DashboardLayout>
      <Helmet>
        <title>Conversations | JobSeeker</title>
        <meta name="description" content="Manage your email conversations with recruiters" />
      </Helmet>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Thread List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader className="pb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-background/50"
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  {(["all", "active", "starred"] as const).map((f) => (
                    <Button
                      key={f}
                      variant={filter === f ? "accent" : "ghost"}
                      size="sm"
                      onClick={() => setFilter(f)}
                      className="capitalize"
                    >
                      {f === "starred" && <Star className="h-3 w-3 mr-1" />}
                      {f}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingThreads ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredThreads.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">No conversations yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Send emails to recruiters to start conversations
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50 max-h-[600px] overflow-y-auto">
                    {filteredThreads.map((thread) => {
                      const engagement = calculateEngagement(thread);
                      return (
                        <div
                          key={thread.id}
                          onClick={() => setSelectedThread(thread.id)}
                          className={`p-4 cursor-pointer transition-all hover:bg-muted/30 ${selectedThread === thread.id ? "bg-accent/10 border-l-2 border-accent" : ""
                            }`}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-accent/20 text-accent">
                                {(thread.recruiter_name || thread.recruiter_email)
                                  .split(/[\s@]/)
                                  .slice(0, 2)
                                  .map((n) => n[0]?.toUpperCase())
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm truncate">
                                    {thread.recruiter_name || thread.recruiter_email.split("@")[0]}
                                  </span>
                                  {starredThreads.has(thread.id) && (
                                    <Star className="h-3 w-3 fill-warning text-warning" />
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(thread.last_activity_at)}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate mb-1">
                                {thread.company_name || thread.recruiter_email}
                              </p>
                              <p className="text-sm truncate text-muted-foreground">
                                {thread.subject_line || "No subject"}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary" className="text-xs">
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  {thread.total_messages || 0}
                                </Badge>
                                <Badge
                                  className={`text-xs border-0 ${getEngagementColor(engagement)}`}
                                >
                                  {engagement}% engaged
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Thread Detail */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            {selectedThread ? (
              <Card className="border-border/50 bg-card/50 backdrop-blur h-full flex flex-col">
                {(() => {
                  const thread = threads.find((t) => t.id === selectedThread);
                  if (!thread) return null;
                  const engagement = calculateEngagement(thread);
                  return (
                    <>
                      <CardHeader className="border-b border-border/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="bg-accent/20 text-accent text-lg">
                                {(thread.recruiter_name || thread.recruiter_email)
                                  .split(/[\s@]/)
                                  .slice(0, 2)
                                  .map((n) => n[0]?.toUpperCase())
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-lg">
                                {thread.recruiter_name || thread.recruiter_email}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {thread.company_name || thread.recruiter_email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs border-0 ${getEngagementColor(engagement)}`}>
                              {engagement}% engaged
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStar(thread.id);
                              }}
                            >
                              <Star className={starredThreads.has(thread.id) ? "fill-warning text-warning" : ""} />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Archive className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 p-6 overflow-y-auto">
                        {isLoadingMessages ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          </div>
                        ) : messages.length === 0 ? (
                          <div className="text-center py-8">
                            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">
                              No messages yet. Send a reply to start the conversation.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {messages.map((message) => (
                              <div
                                key={message.id}
                                className={`p-4 rounded-lg ${message.sender_type === "user"
                                    ? "bg-accent/10 ml-8"
                                    : "bg-muted/30 mr-8"
                                  }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium">
                                    {message.sender_type === "user" ? "You" : thread.recruiter_name || "Recruiter"}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(message.sent_at).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">
                                  {message.body_full || message.body_preview}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                      <div className="p-4 border-t border-border/50">
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Type your reply..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="flex-1 bg-background/50 min-h-[80px] resize-none"
                          />
                        </div>
                        <div className="flex justify-end mt-2">
                          <Button
                            variant="hero"
                            onClick={handleSendReply}
                            disabled={!replyText.trim() || isSending}
                          >
                            {isSending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4 mr-2" />
                            )}
                            {isSending ? "Sending..." : "Send Email"}
                          </Button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </Card>
            ) : (
              <Card className="border-border/50 bg-card/50 backdrop-blur h-full flex items-center justify-center">
                <div className="text-center py-12">
                  <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                  <p className="text-muted-foreground">
                    Choose a thread from the list to view messages
                  </p>
                </div>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Conversations;
