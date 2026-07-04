/**
 * @fileoverview Step-by-step resume builder wizard with a live side-by-side
 * preview. Replaces the old tabbed-dialog `ResumeTemplateBuilder` +
 * separate-preview-dialog `ResumeTemplates` flow.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { StructuredResumeData } from "@/types/resume";
import { FormattingData } from "../templates/resumeParsing";
import { TEMPLATES } from "../templates/templateRegistry";
import { useIsMobile } from "@/hooks/use-mobile";
import ErrorBoundary from "@/components/ErrorBoundary";
import { WIZARD_STEPS } from "./builderSteps";
import { WizardProgressHeader } from "./WizardProgressHeader";
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

export function ResumeBuilderWizard({
  open,
  onOpenChange,
  initialData,
  profilePhotoUrl,
  extractingData,
  formattingData,
}: ResumeBuilderWizardProps) {
  const [resumeData, setResumeData] = useState<StructuredResumeData>(EMPTY_RESUME_DATA);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTemplateId, setSelectedTemplateId] = useState(TEMPLATES[0].id);
  const isMobile = useIsMobile();

  // Initialize with provided data whenever the dialog is (re)opened with new data
  useEffect(() => {
    if (initialData) {
      setResumeData(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    if (open) setCurrentStep(0);
  }, [open]);

  const step = WIZARD_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;
  const selectedTemplate = TEMPLATES.find((t) => t.id === selectedTemplateId) || TEMPLATES[0];

  const goNext = () => {
    const error = step.validate(resumeData);
    if (error) {
      toast.error(error);
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  };

  const goBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  return (
    <ErrorBoundary>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resume Builder</DialogTitle>
            <DialogDescription>
              Fill in your details step by step and watch your resume update live.
            </DialogDescription>
          </DialogHeader>

          <WizardProgressHeader steps={WIZARD_STEPS} currentStep={currentStep} />

          <div className={isMobile ? "grid grid-cols-1 gap-6 mt-4" : "grid grid-cols-2 gap-6 mt-4"}>
            <div className="min-w-0">
              <step.Component
                data={resumeData}
                onChange={setResumeData}
                selectedTemplateId={selectedTemplateId}
                onSelectTemplateId={setSelectedTemplateId}
                profilePhotoUrl={profilePhotoUrl}
                formattingData={formattingData}
              />
            </div>
            <div className={isMobile ? "min-h-[400px]" : "min-h-[500px]"}>
              <ResumeLivePreviewPane
                resumeData={resumeData}
                template={selectedTemplate}
                profilePhotoUrl={profilePhotoUrl}
                formattingData={formattingData}
                isLoading={extractingData}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {!isFirstStep && (
              <Button variant="outline" onClick={goBack}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            {!isLastStep && (
              <Button onClick={goNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            {isLastStep && <Button onClick={() => onOpenChange(false)}>Done</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
}
