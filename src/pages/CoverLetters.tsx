/**
 * @file CoverLetters.tsx
 * @description List of AI-generated cover letters saved by the user (see
 * generate-cover-letter edge function / CoverLetterDialog.tsx). Lets them
 * revisit, copy, edit, or delete past letters.
 */
import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Copy, Trash2, FileText, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import DashboardLayout from "@/components/DashboardLayout";

interface CoverLetterRow {
  id: string;
  job_title: string | null;
  company_name: string | null;
  content: string;
  created_at: string;
}

const CoverLetters = () => {
  const { user } = useAuth();
  const [letters, setLetters] = useState<CoverLetterRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) void fetchLetters();
  }, [user]);

  const fetchLetters = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("cover_letters" as never)
        .select("id, job_title, company_name, content, created_at")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setLetters((data as unknown as CoverLetterRow[]) || []);
    } catch (error) {
      console.error("Error fetching cover letters:", error);
      toast.error("Failed to load your cover letters");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this cover letter?")) return;
    try {
      const { error } = await supabase.from("cover_letters" as never).delete().eq("id", id);
      if (error) throw error;
      setLetters((prev) => prev.filter((l) => l.id !== id));
      toast.success("Deleted");
    } catch (error) {
      console.error("Error deleting cover letter:", error);
      toast.error("Failed to delete");
    }
  };

  const handleSave = async (id: string) => {
    const draft = drafts[id];
    if (draft === undefined) return;
    setSavingId(id);
    try {
      const { error } = await supabase
        .from("cover_letters" as never)
        .update({ content: draft } as never)
        .eq("id", id);
      if (error) throw error;
      setLetters((prev) => prev.map((l) => (l.id === id ? { ...l, content: draft } : l)));
      toast.success("Saved");
    } catch (error) {
      console.error("Error saving cover letter:", error);
      toast.error("Failed to save");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <DashboardLayout>
      <Helmet>
        <title>My Cover Letters | JobSeeker</title>
      </Helmet>

      <div className="container mx-auto px-4 pt-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-xl font-bold">My Cover Letters</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Generated from "Apply latest jobs" — click a job's "Cover letter" button to create
              a new one.
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : letters.length === 0 ? (
            <div className="text-center py-20 border rounded-2xl bg-card/50">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground">You haven't generated any cover letters yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {letters.map((letter) => {
                const isExpanded = expandedId === letter.id;
                const draft = drafts[letter.id] ?? letter.content;
                return (
                  <Card key={letter.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-sm">
                            {letter.job_title || "Untitled role"}
                            {letter.company_name ? ` · ${letter.company_name}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(letter.created_at), "MMM d, yyyy · HH:mm")}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleCopy(draft)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(letter.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div className="space-y-2">
                          <Textarea
                            value={draft}
                            onChange={(e) =>
                              setDrafts((prev) => ({ ...prev, [letter.id]: e.target.value }))
                            }
                            className="min-h-[240px] font-mono text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSave(letter.id)}
                              disabled={savingId === letter.id}
                              className="gap-1.5"
                            >
                              {savingId === letter.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Save className="h-3.5 w-3.5" />
                              )}
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setExpandedId(null)}>
                              Collapse
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="text-left text-sm text-muted-foreground line-clamp-3 w-full hover:text-foreground"
                          onClick={() => setExpandedId(letter.id)}
                        >
                          {letter.content}
                        </button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CoverLetters;
