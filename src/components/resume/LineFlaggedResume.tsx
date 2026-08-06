/**
 * @file LineFlaggedResume.tsx
 * @description Renders a resume as a line-by-line document with AI-found issues flagged
 * inline (Naukri/Jobscan-style), each with its own "Apply" fix. This is the primary
 * output of the ATS review: instead of category tabs, the user sees exactly which line
 * has a problem and can fix it in place with one click.
 *
 * Matching strategy: issues are matched to physical lines (or a 2-line window, for
 * excerpts spanning a wrapped bullet) via whitespace/case-insensitive containment —
 * forgiving of minor AI transcription differences. Applying a fix replaces the exact
 * raw line(s) pulled from the resume itself (not the AI's excerpt), so the replace
 * always succeeds even if the AI's copy wasn't byte-perfect.
 */

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Flag, Check, X, Wand2, Sparkles, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { LineIssue } from "@/types/resume";

interface LineFlaggedResumeProps {
  resumeText: string;
  issues: LineIssue[];
  onResumeTextChange: (text: string) => void;
}

interface MatchCluster {
  key: string;
  lineIndexes: number[];
  rawText: string;
  issues: LineIssue[];
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

const SEVERITY_STYLES: Record<LineIssue["severity"], { dot: string; badge: string; ring: string }> = {
  high: { dot: "bg-destructive", badge: "bg-destructive/10 text-destructive border-destructive/30", ring: "ring-destructive/40 bg-destructive/5" },
  medium: { dot: "bg-warning", badge: "bg-warning/10 text-warning border-warning/30", ring: "ring-warning/40 bg-warning/5" },
  low: { dot: "bg-muted-foreground", badge: "bg-muted text-muted-foreground border-border", ring: "ring-border bg-muted/40" },
};

const CATEGORY_LABELS: Record<string, string> = {
  action_verb: "Weak verb",
  metric: "No metric",
  keyword: "Keyword",
  grammar: "Grammar",
  formatting: "Formatting",
  structure: "Structure",
  contact: "Contact",
  length: "Length",
  buzzword: "Buzzword",
  tense: "Tense",
  clarity: "Clarity",
};

/** Highest-severity-first, so the most important fix in a cluster is what shows first. */
const severityRank = (s: LineIssue["severity"]) => (s === "high" ? 0 : s === "medium" ? 1 : 2);

export function LineFlaggedResume({ resumeText, issues, onResumeTextChange }: LineFlaggedResumeProps) {
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const lines = useMemo(() => resumeText.split("\n"), [resumeText]);

  const activeIssues = useMemo(
    () => issues.filter((i) => !resolvedIds.has(i.id) && !dismissedIds.has(i.id)),
    [issues, resolvedIds, dismissedIds],
  );

  // Match each active issue to a physical line (or 2-line window), earliest match first.
  const { clusterByLine, unmatched } = useMemo(() => {
    const normLines = lines.map(normalize);
    const clusters = new Map<string, MatchCluster>();
    const unmatchedList: LineIssue[] = [];

    for (const issue of activeIssues) {
      const normExcerpt = normalize(issue.excerpt || "");
      if (!normExcerpt) {
        unmatchedList.push(issue);
        continue;
      }

      let matchedKey: string | null = null;
      let matchedLineIdx: number[] = [];
      let matchedRaw = "";

      for (let i = 0; i < lines.length; i++) {
        const line = normLines[i];
        if (line.length > 3 && (line.includes(normExcerpt) || normExcerpt.includes(line))) {
          matchedKey = `${i}`;
          matchedLineIdx = [i];
          matchedRaw = lines[i];
          break;
        }
        // 2-line window, for excerpts that span a wrapped bullet
        if (i < lines.length - 1) {
          const windowNorm = normalize(`${lines[i]} ${lines[i + 1]}`);
          if (windowNorm.length > 3 && windowNorm.includes(normExcerpt)) {
            matchedKey = `${i}-${i + 1}`;
            matchedLineIdx = [i, i + 1];
            matchedRaw = `${lines[i]}\n${lines[i + 1]}`;
            break;
          }
        }
      }

      if (!matchedKey) {
        unmatchedList.push(issue);
        continue;
      }

      const existing = clusters.get(matchedKey);
      if (existing) {
        existing.issues.push(issue);
      } else {
        clusters.set(matchedKey, {
          key: matchedKey,
          lineIndexes: matchedLineIdx,
          rawText: matchedRaw,
          issues: [issue],
        });
      }
    }

    // Index by first line of the cluster for render-time lookup while walking `lines`.
    const byLine = new Map<number, MatchCluster>();
    for (const cluster of clusters.values()) {
      cluster.issues.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
      byLine.set(cluster.lineIndexes[0], cluster);
    }
    return { clusterByLine: byLine, unmatched: unmatchedList };
  }, [lines, activeIssues]);

  const totalActive = activeIssues.length;
  const counts = {
    high: activeIssues.filter((i) => i.severity === "high").length,
    medium: activeIssues.filter((i) => i.severity === "medium").length,
    low: activeIssues.filter((i) => i.severity === "low").length,
  };
  const resolvedCount = resolvedIds.size;

  const applyIssue = (issue: LineIssue, cluster: MatchCluster) => {
    if (!resumeText.includes(cluster.rawText)) {
      // Text moved/changed since this cluster was computed — safest is to skip silently;
      // the next render will re-locate (or move it to "couldn't find" if truly gone).
      return;
    }
    const newText = resumeText.replace(cluster.rawText, issue.suggested_replacement);
    onResumeTextChange(newText);
    // The whole line was just rewritten, so every issue anchored to that exact line
    // is now moot — resolve the full cluster together rather than leaving stale flags.
    setResolvedIds((prev) => {
      const next = new Set(prev);
      cluster.issues.forEach((i) => next.add(i.id));
      return next;
    });
  };

  const dismissIssue = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  const applyAll = () => {
    let text = resumeText;
    const newlyResolved: string[] = [];
    // Re-derive clusters against the running text on each step so offsets never go stale.
    const remainingIssues = [...activeIssues];
    let progressed = true;
    while (progressed && remainingIssues.length > 0) {
      progressed = false;
      const currentLines = text.split("\n");
      const normLines = currentLines.map(normalize);
      for (let idx = remainingIssues.length - 1; idx >= 0; idx--) {
        const issue = remainingIssues[idx];
        const normExcerpt = normalize(issue.excerpt || "");
        if (!normExcerpt) continue;
        let raw: string | null = null;
        for (let i = 0; i < currentLines.length; i++) {
          if (normLines[i].length > 3 && (normLines[i].includes(normExcerpt) || normExcerpt.includes(normLines[i]))) {
            raw = currentLines[i];
            break;
          }
          if (i < currentLines.length - 1) {
            const windowNorm = normalize(`${currentLines[i]} ${currentLines[i + 1]}`);
            if (windowNorm.length > 3 && windowNorm.includes(normExcerpt)) {
              raw = `${currentLines[i]}\n${currentLines[i + 1]}`;
              break;
            }
          }
        }
        if (raw && text.includes(raw)) {
          text = text.replace(raw, issue.suggested_replacement);
          newlyResolved.push(issue.id);
          remainingIssues.splice(idx, 1);
          progressed = true;
          break; // restart scan against freshly updated text
        }
      }
    }
    if (newlyResolved.length > 0) {
      onResumeTextChange(text);
      setResolvedIds((prev) => {
        const next = new Set(prev);
        newlyResolved.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center gap-3 flex-wrap text-sm">
          <span className="font-medium text-foreground">
            {totalActive} issue{totalActive === 1 ? "" : "s"} found
          </span>
          {counts.high > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <span className="w-2 h-2 rounded-full bg-destructive" /> {counts.high} high
            </span>
          )}
          {counts.medium > 0 && (
            <span className="flex items-center gap-1 text-warning">
              <span className="w-2 h-2 rounded-full bg-warning" /> {counts.medium} medium
            </span>
          )}
          {counts.low > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-muted-foreground" /> {counts.low} low
            </span>
          )}
          {resolvedCount > 0 && (
            <span className="flex items-center gap-1 text-success">
              <Check className="w-3.5 h-3.5" /> {resolvedCount} fixed
            </span>
          )}
        </div>
        {totalActive > 0 && (
          <Button size="sm" onClick={applyAll} className="bg-accent hover:bg-accent/90">
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            Apply All Fixes
          </Button>
        )}
        {totalActive === 0 && issues.length > 0 && (
          <span className="text-sm text-success flex items-center gap-1">
            <Check className="w-4 h-4" /> All flagged issues addressed
          </span>
        )}
      </div>

      {/* Document view */}
      <div className="rounded-lg border border-border bg-card p-5 sm:p-8 font-serif text-[13.5px] leading-relaxed max-h-[600px] overflow-y-auto">
        {lines.map((line, idx) => {
          const cluster = clusterByLine.get(idx);
          const isSecondLineOfWindow = !cluster && lines.some((_, i) => clusterByLine.get(i)?.lineIndexes.includes(idx));
          if (isSecondLineOfWindow) return null; // rendered as part of the window above

          if (!cluster) {
            return (
              <div key={idx} className="whitespace-pre-wrap text-foreground/90 min-h-[1.4em]">
                {line || " "}
              </div>
            );
          }

          const worst = cluster.issues[0];
          const style = SEVERITY_STYLES[worst.severity];
          const displayText = cluster.rawText;

          return (
            <Popover key={idx}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "block w-full text-left whitespace-pre-wrap rounded px-1.5 -mx-1.5 py-0.5 my-0.5 ring-1 transition-colors hover:brightness-95",
                    style.ring,
                  )}
                >
                  <span className="inline-flex items-start gap-1.5">
                    <Flag className={cn("w-3 h-3 mt-1 shrink-0", style.dot.replace("bg-", "text-"))} />
                    <span>{displayText}</span>
                    {cluster.issues.length > 1 && (
                      <Badge variant="outline" className="ml-1 text-[10px] shrink-0">
                        +{cluster.issues.length - 1} more
                      </Badge>
                    )}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 sm:w-96 p-0" align="start">
                <div className="max-h-96 overflow-y-auto divide-y divide-border">
                  {cluster.issues.map((issue) => {
                    const s = SEVERITY_STYLES[issue.severity];
                    return (
                      <div key={issue.id} className="p-3.5 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={cn("text-[10px] border", s.badge)} variant="outline">
                            {CATEGORY_LABELS[issue.category] || issue.category}
                          </Badge>
                          <span className="text-xs font-semibold text-foreground">{issue.issue}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{issue.explanation}</p>
                        {issue.suggested_replacement && (
                          <div className="text-xs bg-success/5 border border-success/20 rounded p-2 text-foreground/90">
                            <span className="text-success font-medium">Suggested: </span>
                            {issue.suggested_replacement}
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" className="h-7 text-xs bg-accent hover:bg-accent/90" onClick={() => applyIssue(issue, cluster)}>
                            <Wand2 className="mr-1 h-3 w-3" /> Apply fix
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => dismissIssue(issue.id)}>
                            <X className="mr-1 h-3 w-3" /> Dismiss
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>

      {/* Issues the AI raised but that couldn't be pinned to an exact line */}
      {unmatched.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5" /> Additional suggestions (couldn't auto-locate — apply manually)
          </p>
          {unmatched.map((issue) => {
            const s = SEVERITY_STYLES[issue.severity];
            return (
              <div key={issue.id} className={cn("p-3 rounded-lg border text-sm", s.ring)}>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={cn("text-[10px] border", s.badge)} variant="outline">
                    {CATEGORY_LABELS[issue.category] || issue.category}
                  </Badge>
                  <span className="font-medium">{issue.issue}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{issue.explanation}</p>
                {issue.suggested_replacement && (
                  <p className="text-xs">
                    <span className="text-success font-medium">Suggested: </span>
                    {issue.suggested_replacement}
                  </p>
                )}
                <Button size="sm" variant="ghost" className="h-6 text-xs mt-1 px-2" onClick={() => dismissIssue(issue.id)}>
                  <X className="mr-1 h-3 w-3" /> Dismiss
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
