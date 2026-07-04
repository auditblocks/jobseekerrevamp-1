import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FileText, FileDown } from "lucide-react";
import { ResumeTemplate } from "./templateRegistry";
import { FormattingData } from "./resumeParsing";
import { generateTemplateHTML, TemplateRenderError } from "./templateRenderers";
import { ResumeTemplateGallery } from "./ResumeTemplateGallery";
import { useResumeExport } from "./useResumeExport";
import { toast } from "sonner";

interface TemplateGalleryDialogProps {
  originalResume: string;
  optimizedResume: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profilePhotoUrl?: string | null;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  userLocation?: string;
  userLinkedIn?: string;
  professionalTitle?: string;
  formattingData?: FormattingData | null;
}

export function TemplateGalleryDialog({
  originalResume,
  optimizedResume,
  open,
  onOpenChange,
  profilePhotoUrl,
  userName,
  userEmail,
  userPhone,
  userLocation,
  userLinkedIn,
  professionalTitle,
  formattingData,
}: TemplateGalleryDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplate | null>(null);
  const [resumeSource, setResumeSource] = useState<"original" | "optimized">(
    optimizedResume ? "optimized" : "original"
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const { downloadHtml, downloadPdf, isExporting } = useResumeExport();

  const currentResume = resumeSource === "optimized" && optimizedResume ? optimizedResume : originalResume;
  const parserContext = { userName, userEmail, userPhone, userLocation, userLinkedIn, professionalTitle };

  const renderHtml = (template: ResumeTemplate): string | null => {
    try {
      return generateTemplateHTML(template, currentResume, formattingData, null, profilePhotoUrl, parserContext);
    } catch (error) {
      if (error instanceof TemplateRenderError) {
        toast.error("Failed to render this template. Please try another one.");
      }
      return null;
    }
  };

  const handlePreview = (template: ResumeTemplate) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  const handleDownload = (template: ResumeTemplate, format: "html" | "pdf") => {
    const html = renderHtml(template);
    if (!html) return;
    if (format === "pdf") {
      downloadPdf(template, html);
    } else {
      downloadHtml(template, html);
    }
  };

  const previewHtml = selectedTemplate ? renderHtml(selectedTemplate) : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose a Template</DialogTitle>
            <DialogDescription>
              Pick a professional template and download your resume.
            </DialogDescription>
          </DialogHeader>

          {optimizedResume && (
            <div className="mb-4 p-3 bg-accent/5 rounded-lg border border-accent/20">
              <Label className="text-xs font-medium mb-2 block">Resume Source</Label>
              <RadioGroup value={resumeSource} onValueChange={(value) => setResumeSource(value as "original" | "optimized")}>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="optimized" id="optimized" />
                    <Label htmlFor="optimized" className="cursor-pointer text-sm">Optimized</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="original" id="original" />
                    <Label htmlFor="original" className="cursor-pointer text-sm">Original</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}

          <ResumeTemplateGallery
            profilePhotoUrl={profilePhotoUrl}
            isExporting={isExporting}
            onPreview={handlePreview}
            onDownload={handleDownload}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name} Preview</DialogTitle>
            <DialogDescription>
              Preview your resume with the {selectedTemplate?.name} template
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded-lg bg-white">
            {selectedTemplate && previewHtml && (
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full min-h-[600px] border-0"
                title="Resume Preview"
              />
            )}
            {selectedTemplate && !previewHtml && (
              <div className="flex items-center justify-center h-full min-h-[600px] text-sm text-muted-foreground">
                This template failed to render. Please try another one.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
            {selectedTemplate && (
              <>
                <Button variant="outline" onClick={() => handleDownload(selectedTemplate, "html")} disabled={isExporting}>
                  <FileText className="mr-2 h-4 w-4" />
                  HTML
                </Button>
                <Button onClick={() => handleDownload(selectedTemplate, "pdf")} disabled={isExporting}>
                  <FileDown className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
