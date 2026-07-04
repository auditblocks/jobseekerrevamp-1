/**
 * @fileoverview Resume content parsing.
 * Converts either strongly-typed `StructuredResumeData` or raw resume text
 * into the generic `ParsedResume` shape consumed by the template renderers.
 */

import { StructuredResumeData } from "@/types/resume";

/** Intermediate representation of a resume's content sections, used by template renderers. */
export interface ParsedResume {
  header: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    workExperience?: string;
  };
  professionalTitle?: string;
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    dates: string;
    description: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    dates: string;
  }>;
  skills: string[];
  projects?: Array<{
    name: string;
    description: string;
    duration?: string;
  }>;
  languages?: string[];
  certifications?: string[];
}

/** AI-detected formatting hints used to preserve the look of an uploaded resume. */
export interface FormattingData {
  layout_type?: string;
  sidebar_color?: string;
  font_family?: string;
  section_spacing?: string;
  design_style?: string;
  colors?: string[];
  fonts?: string[];
  layout?: string;
}

/** Fields needed to seed the heuristic text parser's header when structured data is absent. */
export interface ParserUserContext {
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  userLocation?: string;
  userLinkedIn?: string;
  professionalTitle?: string;
}

/** Maps the strongly-typed `StructuredResumeData` into the generic `ParsedResume` shape for template rendering. */
export function convertStructuredToParsed(data: StructuredResumeData): ParsedResume {
  return {
    header: {
      name: data.personalInfo.name,
      email: data.personalInfo.email,
      phone: data.personalInfo.phone,
      location: data.personalInfo.location,
      linkedin: data.personalInfo.linkedin,
    },
    professionalTitle: data.professionalTitle,
    summary: data.summary,
    experience: data.workExperience.map((exp) => ({
      title: exp.jobTitle,
      company: exp.company,
      dates: `${exp.startDate} - ${exp.current ? "Present" : exp.endDate}`,
      description: exp.description,
    })),
    education: data.education.map((edu) => ({
      degree: edu.degree,
      institution: edu.institution,
      dates: edu.graduationDate,
    })),
    skills: data.skills,
    projects: data.projects,
    languages: data.languages,
    certifications: data.certifications,
  };
}

/**
 * Heuristic parser that converts raw resume text into a `ParsedResume`.
 * Detects sections via uppercase headers and extracts contact details with regex.
 * Falls back gracefully when structured data is unavailable.
 */
export function parseResumeContent(text: string, ctx: ParserUserContext = {}): ParsedResume {
  const { userName, userEmail, userPhone, userLocation, userLinkedIn, professionalTitle } = ctx;
  const lines = text.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);

  const parsed: ParsedResume = {
    header: {
      name: userName || "",
      email: userEmail || "",
      phone: userPhone || "",
      location: userLocation || "",
      linkedin: userLinkedIn || "",
    },
    professionalTitle: professionalTitle || "",
    summary: "",
    experience: [],
    education: [],
    skills: [],
    projects: [],
    languages: [],
    certifications: [],
  };

  // Extract header info from first lines if not provided
  if (!parsed.header.name) {
    const headerLines = lines.slice(0, 5);
    headerLines.forEach((line) => {
      const emailMatch = line.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch && !parsed.header.email) {
        parsed.header.email = emailMatch[0];
        line = line.replace(emailMatch[0], "").trim();
      }
      const phoneMatch = line.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
      if (phoneMatch && !parsed.header.phone) {
        parsed.header.phone = phoneMatch[0];
        line = line.replace(phoneMatch[0], "").trim();
      }
      const linkedinMatch = line.match(/linkedin\.com\/in\/[\w-]+/i);
      if (linkedinMatch && !parsed.header.linkedin) {
        parsed.header.linkedin = line;
      }
      if (!parsed.header.name && !emailMatch && !phoneMatch && line.length > 2 && line.length < 50) {
        parsed.header.name = line;
      }
      if (line.match(/\b[A-Z][a-z]+,\s*[A-Z]{2}\b/) && !parsed.header.location) {
        parsed.header.location = line;
      }
      // Work experience pattern
      const workExpMatch = line.match(/(\d+)\s*(?:years?|yrs?)\s*(\d+)?\s*(?:months?|mos?)?/i);
      if (workExpMatch && !parsed.header.workExperience) {
        parsed.header.workExperience = line;
      }
    });
  }

  // Find section headers
  let currentSection = "";
  let currentExperience: any = null;
  let currentEducation: any = null;
  let currentProject: any = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase();
    const originalLine = lines[i];

    // Section detection
    if (line.match(/^(SUMMARY|PROFESSIONAL SUMMARY|OBJECTIVE|PROFILE|PROFILE SUMMARY)/)) {
      currentSection = "summary";
      continue;
    } else if (line.match(/^(EXPERIENCE|WORK EXPERIENCE|EMPLOYMENT|PROFESSIONAL EXPERIENCE|WORK HISTORY)/)) {
      currentSection = "experience";
      continue;
    } else if (line.match(/^(EDUCATION|ACADEMIC BACKGROUND|ACADEMIC QUALIFICATIONS)/)) {
      currentSection = "education";
      continue;
    } else if (line.match(/^(SKILLS|TECHNICAL SKILLS|CORE SKILLS|KEY SKILLS|COMPETENCIES)/)) {
      currentSection = "skills";
      continue;
    } else if (line.match(/^(PROJECTS|PROJECT EXPERIENCE|PROJECT WORK)/)) {
      currentSection = "projects";
      continue;
    } else if (line.match(/^(LANGUAGES|LANGUAGE)/)) {
      currentSection = "languages";
      continue;
    } else if (line.match(/^(CERTIFICATIONS|CERTIFICATES|COURSES)/)) {
      currentSection = "certifications";
      continue;
    }

    // Process sections
    if (currentSection === "summary") {
      if (parsed.summary) parsed.summary += " ";
      parsed.summary += originalLine;
    } else if (currentSection === "experience") {
      // Look for job title patterns
      if (originalLine.match(/^[A-Z][^•\-\d]+$/) && originalLine.length < 60 && !currentExperience) {
        if (currentExperience) parsed.experience.push(currentExperience);
        currentExperience = {
          title: originalLine,
          company: "",
          dates: "",
          description: [],
        };
      } else if (currentExperience) {
        if (!currentExperience.company && originalLine.length < 80 && !originalLine.match(/^\d{4}/)) {
          currentExperience.company = originalLine;
        } else if (originalLine.match(/\d{4}|\w+\s+\d{4}|Present|Current/i)) {
          currentExperience.dates = originalLine;
        } else if (/^(?:-|•|\*|\d+\.)/.test(originalLine)) {
          currentExperience.description.push(
            originalLine.replace(/^(?:-|•|\*|\d+\.)\s*/, ""),
          );
        }
      }
    } else if (currentSection === "education") {
      if (originalLine.match(/^[A-Z][^•\-\d]+$/) && originalLine.length < 80 && !currentEducation) {
        if (currentEducation) parsed.education.push(currentEducation);
        currentEducation = {
          degree: originalLine,
          institution: "",
          dates: "",
        };
      } else if (currentEducation) {
        if (!currentEducation.institution && originalLine.length < 100) {
          currentEducation.institution = originalLine;
        } else if (originalLine.match(/\d{4}/)) {
          currentEducation.dates = originalLine;
        }
      }
    } else if (currentSection === "skills") {
      const skills = originalLine
        .split(/[|,]|•|\*|-/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      parsed.skills.push(...skills);
    } else if (currentSection === "projects") {
      if (originalLine.match(/^[A-Z][^•\-\d]+$/) && originalLine.length < 80 && !currentProject) {
        if (currentProject) parsed.projects!.push(currentProject);
        currentProject = {
          name: originalLine,
          description: "",
          duration: "",
        };
      } else if (currentProject) {
        const durationMatch = originalLine.match(/(\d+)\s*(?:days?|months?|years?)/i);
        if (durationMatch && !currentProject.duration) {
          currentProject.duration = originalLine;
        } else {
          currentProject.description += (currentProject.description ? " " : "") + originalLine;
        }
      }
    } else if (currentSection === "languages") {
      const langs = originalLine.split(/[|,]|•|\*|-/).map((s) => s.trim()).filter((s) => s.length > 0);
      parsed.languages!.push(...langs);
    } else if (currentSection === "certifications") {
      const certs = originalLine.split(/[|,]|•|\*|-/).map((s) => s.trim()).filter((s) => s.length > 0);
      parsed.certifications!.push(...certs);
    }
  }

  // Push last items
  if (currentExperience) parsed.experience.push(currentExperience);
  if (currentEducation) parsed.education.push(currentEducation);
  if (currentProject) parsed.projects!.push(currentProject);

  // Fallback
  if (!parsed.header.name && lines.length > 0) {
    parsed.header.name = lines[0] || "Your Name";
  }
  if (parsed.experience.length === 0 && parsed.education.length === 0 && !parsed.summary) {
    parsed.summary = lines.slice(1, 5).join(" ");
  }

  return parsed;
}
