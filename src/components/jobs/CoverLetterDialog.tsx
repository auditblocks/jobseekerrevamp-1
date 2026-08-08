/**
 * @file CoverLetterDialog.tsx
 * @description One-click AI cover letter generator for a specific private job.
 * Lets the user pick which saved resume to base it on, calls the
 * generate-cover-letter edge function (Lovable AI gateway — not the paid ATS
 * Vision path), and shows the result for copy/edit. The edge function already
 * persists the letter to `cover_letters`; "Save edits" here just updates that
 * same row if the user tweaks the text.
 */
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, Sparkles, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface JobTarget {
  id: string;
  title: string;
  company_name: string | null;
  summary: string | null;
}

interface ResumeOption {
  id: string;
  name: string;
  is_active: boolean;
}

interface CoverLetterDialogProps {
  job: JobTarget | null;
  onOpenChange: (open: boolean) => void;
}

/** Dialog: pick a resume, generate a tailored cover letter for `job`, edit and copy. */
export function CoverLetterDialog({ job, onOpenChange }: CoverLetterDialogProps) {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<ResumeOption[]>([]);
  const [resumesLoading, setResumesLoading] = useState(true);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [letterId, setLetterId] = useState<string | null>(null);
  const [content, setContent] = useState("");

  const open = !!job;

  useEffect(() => {
    if (!open || !user) return;
    setContent("");
    setLetterId(null);
    setResumesLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("resumes" as never)
        .select("id, name, is_active")
        .eq("user_id", user.id)
        .order("is_active", { ascending: false })
        .order("updated_at", { ascending: false });
      if (error) {
        console.error("Failed to load resumes:", error);
        setResumes([]);
      } else {
        const list = (data ?? []) as unknown as ResumeOption[];
        setResumes(list);
        setSelectedResumeId((prev) => prev || list.find((r) => r.is_active)?.id || list[0]?.id || "");
      }
      setResumesLoading(false);
    })();
  }, [open, user]);

  const handleGenerate = async () => {
    if (!job || !selectedResumeId) {
      toast.error("Select a resume first");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-cover-letter", {
        body: {
          resume_id: selectedResumeId,
          naukri_job_id: job.id,
          job_title: job.title,
          company_name: job.company_name ?? undefined,
          job_description: job.summary ?? undefined,
        },
      });
      if (error) throw error;
      const d = data as { success?: boolean; error?: string; cover_letter?: { id: string; content: string } };
      if (d?.error || !d?.cover_letter) throw new Error(d?.error || "Generation failed");
      setContent(d.cover_letter.content);
      setLetterId(d.cover_letter.id);
      toast.success("Cover letter generated");
    } catch (e) {
      console.error("generate-cover-letter:", e);
      toast.error(e instanceof Error ? e.message : "Could not generate cover letter");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!letterId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("cover_letters" as never)
        .update({ content } as never)
        .eq("id", letterId);
      if (error) throw error;
      toast.success("Saved");
    } catch (e) {
      console.error("save cover letter edits:", e);
      toast.error("Could not save edits");
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate cover letter</DialogTitle>
          <DialogDescription>
            {job ? (
              <>
                Tailored for <strong>{job.title}</strong>
                {job.company_name ? ` at ${job.company_name}` : ""}, grounded in your resume — no
                placeholder text.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Resume to use</Label>
            {resumesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading your resumes…
              </div>
            ) : resumes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No resumes on file yet — upload one from the Resume Optimizer first.
              </p>
            ) : (
              <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a resume" />
                </SelectTrigger>
                <SelectContent>
                  {resumes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                      {r.is_active ? " (active)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {content ? (
            <div className="space-y-2">
              <Label>Cover letter</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[280px] font-mono text-sm"
              />
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {content ? (
            <>
              <Button type="button" variant="outline" onClick={handleCopy} className="gap-2">
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button type="button" variant="outline" onClick={handleSaveEdits} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save edits
              </Button>
              <Button type="button" onClick={handleGenerate} disabled={generating} className="gap-2">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Regenerate
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={generating || resumesLoading || resumes.length === 0}
              className="gap-2"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate cover letter
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
