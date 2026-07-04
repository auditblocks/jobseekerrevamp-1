/**
 * @fileoverview Single source of truth for the wizard's steps — consumed by
 * both the progress header and the orchestrator's render switch.
 */

import { StructuredResumeData } from "@/types/resume";
import { WizardStepComponentProps } from "./stepTypes";
import { PersonalInfoStep, validatePersonalStep } from "./steps/PersonalInfoStep";
import { SummaryStep, validateSummaryStep } from "./steps/SummaryStep";
import { ExperienceStep, validateExperienceStep } from "./steps/ExperienceStep";
import { EducationStep, validateEducationStep } from "./steps/EducationStep";
import { SkillsStep, validateSkillsStep } from "./steps/SkillsStep";
import { ExtrasStep, validateExtrasStep } from "./steps/ExtrasStep";
import { TemplateExportStep } from "./steps/TemplateExportStep";

export interface WizardStep {
  id: string;
  label: string;
  Component: (props: WizardStepComponentProps) => JSX.Element;
  validate: (data: StructuredResumeData) => string | null;
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: "personal", label: "Personal", Component: PersonalInfoStep, validate: validatePersonalStep },
  { id: "summary", label: "Summary", Component: SummaryStep, validate: validateSummaryStep },
  { id: "experience", label: "Experience", Component: ExperienceStep, validate: validateExperienceStep },
  { id: "education", label: "Education", Component: EducationStep, validate: validateEducationStep },
  { id: "skills", label: "Skills", Component: SkillsStep, validate: validateSkillsStep },
  { id: "extras", label: "Extras", Component: ExtrasStep, validate: validateExtrasStep },
  { id: "template", label: "Template & Export", Component: TemplateExportStep, validate: () => null },
];
