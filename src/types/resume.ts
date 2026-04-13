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

