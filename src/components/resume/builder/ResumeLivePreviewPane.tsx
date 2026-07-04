/**
 * @fileoverview Live, debounced resume preview shown alongside the wizard form.
 * Calls `generateTemplateHTML` directly with structured data (no text
 * serialization round-trip), so edits are reflected immediately.
 */

import { useDeferredValue, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StructuredResumeData } from "@/types/resume";
import { ResumeTemplate } from "../templates/templateRegistry";
import { FormattingData } from "../templates/resumeParsing";
import { generateTemplateHTML, TemplateRenderError } from "../templates/templateRenderers";

interface ResumeLivePreviewPaneProps {
  resumeData: StructuredResumeData;
  template: ResumeTemplate;
  profilePhotoUrl?: string | null;
  formattingData?: FormattingData | null;
  isLoading?: boolean;
}

function hasAnyContent(data: StructuredResumeData): boolean {
  return Boolean(data.personalInfo.name.trim() || data.workExperience.length > 0 || data.summary.trim());
}

export function ResumeLivePreviewPane({
  resumeData,
  template,
  profilePhotoUrl,
  formattingData,
  isLoading,
}: ResumeLivePreviewPaneProps) {
  const [retryKey, setRetryKey] = useState(0);
  const deferredData = useDeferredValue(resumeData);

  const { html, error } = useMemo(() => {
    try {
      return {
        html: generateTemplateHTML(template, "", formattingData, deferredData, profilePhotoUrl),
        error: null as string | null,
      };
    } catch (err) {
      const message = err instanceof TemplateRenderError ? err.message : "Failed to render preview";
      return { html: null, error: message };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- retryKey intentionally forces recompute after a render failure without changing inputs
  }, [deferredData, template, formattingData, profilePhotoUrl, retryKey]);

  if (isLoading) {
    return (
      <div className="h-full w-full space-y-3 p-6 border rounded-lg bg-white">
        <Skeleton className="h-8 w-2/3 mx-auto" />
        <Skeleton className="h-4 w-1/2 mx-auto" />
        <Skeleton className="h-24 w-full mt-6" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!hasAnyContent(deferredData)) {
    return (
      <div className="h-full w-full flex items-center justify-center border rounded-lg bg-white text-center p-6">
        <p className="text-sm text-muted-foreground">
          Start filling in your details to see a live preview of your resume here.
        </p>
      </div>
    );
  }

  if (error || !html) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 border rounded-lg bg-white text-center p-6">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Preview failed to render. {error}</p>
        <Button variant="outline" size="sm" onClick={() => setRetryKey((k) => k + 1)}>
          <RotateCcw className="mr-2 h-3 w-3" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full w-full border rounded-lg bg-white overflow-hidden">
      <iframe srcDoc={html} className="w-full h-full min-h-[500px] border-0" title="Resume live preview" />
    </div>
  );
}
