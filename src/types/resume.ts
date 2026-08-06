/**
 * @file resume.ts
 * Type definitions for the structured resume data model used by the Resume Optimizer
 * and AI-powered resume builder features.
 */

/**
 * Canonical shape for a parsed / AI-generated resume.
 * Consumed by the resume editor UI, PDF renderer, and optimizer diff view.
 */
export interface StructuredResumeData {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    website?: string;
  };
  professionalTitle?: string;
  summary: string;
  workExperience: Array<{
    jobTitle: string;
    company: string;
    location?: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    location?: string;
    graduationDate: string;
    gpa?: string;
  }>;
  skills: string[];
  projects?: Array<{
    name: string;
    description: string;
    technologies?: string[];
    duration?: string;
  }>;
  certifications?: string[];
  languages?: string[];
}

/**
 * A single line-anchored ATS issue returned by `analyze-resume-ats`.
 * `excerpt` is an exact, verbatim substring of the analyzed resume text — the UI
 * locates it via string matching to render an inline flag next to that line, and
 * `suggested_replacement` is applied in its place when the user clicks Apply.
 */
export interface LineIssue {
  id: string;
  category:
    | "action_verb"
    | "metric"
    | "keyword"
    | "grammar"
    | "formatting"
    | "structure"
    | "contact"
    | "length"
    | "buzzword"
    | "tense"
    | "clarity"
    | string;
  severity: "high" | "medium" | "low";
  section?: string;
  issue: string;
  explanation: string;
  excerpt: string;
  suggested_replacement: string;
}

