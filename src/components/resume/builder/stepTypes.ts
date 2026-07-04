/**
 * @fileoverview Shared prop contract for every wizard step component.
 */

import { StructuredResumeData } from "@/types/resume";
import { FormattingData } from "../templates/resumeParsing";

export interface StepProps {
  data: StructuredResumeData;
  onChange: (next: StructuredResumeData) => void;
}

/**
 * Superset of `StepProps` used by the wizard's render switch. Only the final
 * (template & export) step reads the extra fields — earlier steps ignore them.
 */
export interface WizardStepComponentProps extends StepProps {
  selectedTemplateId: string;
  onSelectTemplateId: (id: string) => void;
  profilePhotoUrl?: string | null;
  formattingData?: FormattingData | null;
}
