/**
 * @fileoverview Wizard step 7 (final): pick a template and export.
 * No "Preview" dialog is needed here — clicking a card selects it as the
 * template shown in the wizard's live preview pane; download buttons export
 * directly.
 */

import { toast } from "sonner";
import { TEMPLATES, ResumeTemplate } from "../../templates/templateRegistry";
import { generateTemplateHTML, TemplateRenderError } from "../../templates/templateRenderers";
import { ResumeTemplateGallery } from "../../templates/ResumeTemplateGallery";
import { useResumeExport } from "../../templates/useResumeExport";
import { WizardStepComponentProps } from "../stepTypes";

export function TemplateExportStep({
  data,
  selectedTemplateId,
  onSelectTemplateId,
  profilePhotoUrl,
  formattingData,
}: WizardStepComponentProps) {
  const { downloadHtml, downloadPdf, isExporting } = useResumeExport();

  const handleDownload = (template: ResumeTemplate, format: "html" | "pdf") => {
    onSelectTemplateId(template.id);
    let html: string;
    try {
      html = generateTemplateHTML(template, "", formattingData, data, profilePhotoUrl);
    } catch (error) {
      if (error instanceof TemplateRenderError) {
        toast.error("Failed to render this template. Please try another one.");
      }
      return;
    }
    if (format === "pdf") {
      downloadPdf(template, html);
    } else {
      downloadHtml(template, html);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select a template to see it in the live preview, then download it as HTML or PDF.
      </p>
      <ResumeTemplateGallery
        templates={TEMPLATES}
        profilePhotoUrl={profilePhotoUrl}
        selectedId={selectedTemplateId}
        isExporting={isExporting}
        onPreview={(template) => onSelectTemplateId(template.id)}
        onDownload={handleDownload}
      />
    </div>
  );
}
