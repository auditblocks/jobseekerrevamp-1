import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  FileText,
  Briefcase,
  GraduationCap,
  Wrench,
  FolderOpen,
  Download,
  FileDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StructuredResumeData } from "@/types/resume";
import { FormattingData } from "../templates/resumeParsing";
import { TEMPLATES, ResumeTemplate } from "../templates/templateRegistry";
import { generateTemplateHTML, TemplateRenderError } from "../templates/templateRenderers";
import { useResumeExport } from "../templates/useResumeExport";
import { useIsMobile } from "@/hooks/use-mobile";
import ErrorBoundary from "@/components/ErrorBoundary";
import { PersonalInfoStep } from "./steps/PersonalInfoStep";
import { SummaryStep } from "./steps/SummaryStep";
import { ExperienceStep } from "./steps/ExperienceStep";
import { EducationStep } from "./steps/EducationStep";
import { SkillsStep } from "./steps/SkillsStep";
import { ExtrasStep } from "./steps/ExtrasStep";
import { ResumeLivePreviewPane } from "./ResumeLivePreviewPane";

interface ResumeBuilderWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: StructuredResumeData | null;
  profilePhotoUrl?: string | null;
  extractingData?: boolean;
  formattingData?: FormattingData | null;
}

const EMPTY_RESUME_DATA: StructuredResumeData = {
  personalInfo: { name: "", email: "", phone: "", location: "", linkedin: "", website: "" },
  professionalTitle: "",
  summary: "",
  workExperience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  languages: [],
};

const TEMPLATE_THUMBNAILS: Record<string, { layout: "single" | "sidebar"; color: string }> = {
  professional: { layout: "single", color: "#1a365d" },
  modern: { layout: "single", color: "#0f766e" },
  executive: { layout: "single", color: "#1e293b" },
  minimal: { layout: "single", color: "#111827" },
  creative: { layout: "sidebar", color: "#334155" },
  elegant: { layout: "sidebar", color: "#1e293b" },
};

function TemplateMiniPreview({ template, selected, onClick }: { template: ResumeTemplate; selected: boolean; onClick: () => void }) {
  const thumb = TEMPLATE_THUMBNAILS[template.id] || { layout: "single", color: template.accentColor };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all hover:border-accent/50 cursor-pointer shrink-0",
        selected ? "border-accent bg-accent/5 shadow-sm" : "border-transparent bg-muted/50",
      )}
    >
      <div className="w-[72px] h-[96px] bg-white rounded border border-border overflow-hidden shadow-sm relative">
        {thumb.layout === "single" ? (
          <>
            <div className="w-full h-[18px] flex flex-col items-center justify-center pt-2 px-2">
              <div className="w-8 h-1 rounded-full" style={{ background: thumb.color }} />
              <div className="w-5 h-0.5 rounded-full bg-gray-200 mt-0.5" />
            </div>
            <div className="px-2 mt-1.5 space-y-1">
              <div className="w-full h-0.5 rounded-full" style={{ background: thumb.color, opacity: 0.3 }} />
              <div className="space-y-0.5">
                <div className="w-full h-0.5 rounded-full bg-gray-200" />
                <div className="w-4/5 h-0.5 rounded-full bg-gray-200" />
                <div className="w-full h-0.5 rounded-full bg-gray-200" />
              </div>
              <div className="w-full h-0.5 rounded-full" style={{ background: thumb.color, opacity: 0.3 }} />
              <div className="space-y-0.5">
                <div className="w-full h-0.5 rounded-full bg-gray-200" />
                <div className="w-3/4 h-0.5 rounded-full bg-gray-200" />
              </div>
              <div className="w-full h-0.5 rounded-full" style={{ background: thumb.color, opacity: 0.3 }} />
              <div className="flex gap-0.5 flex-wrap">
                <div className="w-3 h-1 rounded-sm bg-gray-200" />
                <div className="w-4 h-1 rounded-sm bg-gray-200" />
                <div className="w-3 h-1 rounded-sm bg-gray-200" />
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full">
            <div className="w-[24px] h-full flex-shrink-0 p-1 flex flex-col items-center pt-2 gap-1" style={{ background: thumb.color }}>
              <div className="w-3 h-3 rounded-full bg-white/30" />
              <div className="w-4 h-0.5 rounded-full bg-white/40 mt-1" />
              <div className="w-3 h-0.5 rounded-full bg-white/30" />
              <div className="w-4 h-0.5 rounded-full bg-white/30 mt-1" />
              <div className="w-3 h-0.5 rounded-full bg-white/20" />
            </div>
            <div className="flex-1 px-1.5 pt-2 space-y-1">
              <div className="space-y-0.5">
                <div className="w-full h-0.5 rounded-full bg-gray-200" />
                <div className="w-4/5 h-0.5 rounded-full bg-gray-200" />
                <div className="w-full h-0.5 rounded-full bg-gray-200" />
              </div>
              <div className="w-full h-0.5 rounded-full" style={{ background: thumb.color, opacity: 0.3 }} />
              <div className="space-y-0.5">
                <div className="w-full h-0.5 rounded-full bg-gray-200" />
                <div className="w-3/4 h-0.5 rounded-full bg-gray-200" />
              </div>
            </div>
          </div>
        )}
      </div>
      <span className={cn("text-[10px] font-medium leading-none", selected ? "text-accent" : "text-muted-foreground")}>
        {template.name}
      </span>
      {selected && <Check className="h-3 w-3 text-accent -mt-0.5" />}
    </button>
  );
}

const SECTIONS = [
  { id: "personal", label: "Personal Info", icon: User, required: true },
  { id: "summary", label: "Summary", icon: FileText, required: false },
  { id: "experience", label: "Experience", icon: Briefcase, required: true },
  { id: "education", label: "Education", icon: GraduationCap, required: true },
  { id: "skills", label: "Skills", icon: Wrench, required: false },
  { id: "extras", label: "Additional", icon: FolderOpen, required: false },
] as const;

function sectionHasContent(id: string, data: StructuredResumeData): boolean {
  switch (id) {
    case "personal": return Boolean(data.personalInfo.name.trim());
    case "summary": return Boolean(data.summary.trim());
    case "experience": return data.workExperience.length > 0;
    case "education": return data.education.length > 0;
    case "skills": return data.skills.length > 0;
    case "extras": return Boolean((data.projects?.length || 0) + (data.certifications?.length || 0) + (data.languages?.length || 0));
    default: return false;
  }
}

export function ResumeBuilderWizard({
  open,
  onOpenChange,
  initialData,
  profilePhotoUrl,
  extractingData,
  formattingData,
}: ResumeBuilderWizardProps) {
  const [resumeData, setResumeData] = useState<StructuredResumeData>(EMPTY_RESUME_DATA);
  const [selectedTemplateId, setSelectedTemplateId] = useState(TEMPLATES[0].id);
  const [openSections, setOpenSections] = useState<string[]>(["personal"]);
  const isMobile = useIsMobile();
  const { downloadHtml, downloadPdf, isExporting } = useResumeExport();

  useEffect(() => {
    if (initialData) setResumeData(initialData);
  }, [initialData]);

  useEffect(() => {
    if (open) {
      const filled = SECTIONS.filter(s => sectionHasContent(s.id, initialData || EMPTY_RESUME_DATA)).map(s => s.id);
      setOpenSections(filled.length > 0 ? filled : ["personal"]);
    }
  }, [open, initialData]);

  const selectedTemplate = TEMPLATES.find((t) => t.id === selectedTemplateId) || TEMPLATES[0];

  const handleExport = (format: "html" | "pdf") => {
    if (!resumeData.personalInfo.name.trim()) {
      toast.error("Please add your name before downloading.");
      return;
    }
    let html: string;
    try {
      html = generateTemplateHTML(selectedTemplate, "", formattingData, resumeData, profilePhotoUrl);
    } catch (error) {
      if (error instanceof TemplateRenderError) {
        toast.error("Failed to render template. Try selecting a different one.");
      }
      return;
    }
    if (format === "pdf") {
      downloadPdf(selectedTemplate, html);
    } else {
      downloadHtml(selectedTemplate, html);
    }
  };

  return (
    <ErrorBoundary>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] w-[1200px] max-h-[92vh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <DialogTitle className="text-lg">Resume Builder</DialogTitle>
            <DialogDescription className="text-xs">
              Choose a template, fill in your details, and download.
            </DialogDescription>
            <div className="flex gap-1.5 overflow-x-auto pt-3 pb-1 -mx-1 px-1">
              {TEMPLATES.map((t) => (
                <TemplateMiniPreview
                  key={t.id}
                  template={t}
                  selected={t.id === selectedTemplateId}
                  onClick={() => setSelectedTemplateId(t.id)}
                />
              ))}
            </div>
          </DialogHeader>

          <div className={cn("flex-1 min-h-0 flex", isMobile ? "flex-col" : "flex-row")}>
            <ScrollArea className={cn("shrink-0 border-r", isMobile ? "h-[45vh] border-r-0 border-b" : "w-[420px]")}>
              <div className="p-4">
                <Accordion
                  type="multiple"
                  value={openSections}
                  onValueChange={setOpenSections}
                  className="space-y-1"
                >
                  {SECTIONS.map((section) => {
                    const Icon = section.icon;
                    const filled = sectionHasContent(section.id, resumeData);
                    return (
                      <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-3 data-[state=open]:bg-muted/20">
                        <AccordionTrigger className="py-2.5 hover:no-underline gap-2">
                          <div className="flex items-center gap-2 text-sm">
                            <div className={cn(
                              "w-5 h-5 rounded flex items-center justify-center shrink-0",
                              filled ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground",
                            )}>
                              {filled ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                            </div>
                            <span className="font-medium">{section.label}</span>
                            {section.required && !filled && (
                              <span className="text-[10px] text-destructive font-medium">Required</span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-3">
                          {section.id === "personal" && <PersonalInfoStep data={resumeData} onChange={setResumeData} />}
                          {section.id === "summary" && <SummaryStep data={resumeData} onChange={setResumeData} />}
                          {section.id === "experience" && <ExperienceStep data={resumeData} onChange={setResumeData} />}
                          {section.id === "education" && <EducationStep data={resumeData} onChange={setResumeData} />}
                          {section.id === "skills" && <SkillsStep data={resumeData} onChange={setResumeData} />}
                          {section.id === "extras" && <ExtrasStep data={resumeData} onChange={setResumeData} />}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            </ScrollArea>

            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex-1 min-h-0 p-4">
                <ResumeLivePreviewPane
                  resumeData={resumeData}
                  template={selectedTemplate}
                  profilePhotoUrl={profilePhotoUrl}
                  formattingData={formattingData}
                  isLoading={extractingData}
                />
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t px-6 py-3 flex items-center justify-between bg-muted/30">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("html")}
                disabled={isExporting}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                HTML
              </Button>
              <Button
                size="sm"
                onClick={() => handleExport("pdf")}
                disabled={isExporting}
              >
                <FileDown className="h-3.5 w-3.5 mr-1.5" />
                Download PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
}
