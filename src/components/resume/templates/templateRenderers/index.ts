/**
 * @fileoverview Façade for generating a resume's rendered HTML.
 * Single entry point used by both the wizard's live preview and export flows,
 * guaranteeing identical output between the two.
 */

import { StructuredResumeData } from "@/types/resume";
import { ResumeTemplate } from "../templateRegistry";
import {
  FormattingData,
  ParserUserContext,
  convertStructuredToParsed,
  parseResumeContent,
} from "../resumeParsing";
import { renderSimpleTemplate } from "./simpleTemplate";
import { renderCreativeTemplate } from "./creativeTemplate";

/** Thrown when template HTML generation fails, so callers can show a dedicated error state. */
export class TemplateRenderError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "TemplateRenderError";
  }
}

/**
 * Generates a self-contained HTML document for the given template and resume content.
 * Uses structured data when available, otherwise falls back to the text parser.
 */
export function generateTemplateHTML(
  template: ResumeTemplate,
  resumeText: string,
  formatData?: FormattingData | null,
  structuredData?: StructuredResumeData | null,
  profilePhotoUrl?: string | null,
  parserContext?: ParserUserContext,
): string {
  try {
    const parsed = structuredData
      ? convertStructuredToParsed(structuredData)
      : parseResumeContent(resumeText, parserContext);

    if (template.templateType === "simple") {
      return renderSimpleTemplate(parsed, template, formatData);
    }
    return renderCreativeTemplate(parsed, template, formatData, profilePhotoUrl);
  } catch (error) {
    throw new TemplateRenderError("Failed to render resume template", error);
  }
}

export { TEMPLATES } from "../templateRegistry";
export type { ResumeTemplate } from "../templateRegistry";
export type { ParsedResume, FormattingData } from "../resumeParsing";
