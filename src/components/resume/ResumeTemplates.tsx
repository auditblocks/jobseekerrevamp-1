import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Download, Eye, FileText, FileDown } from "lucide-react";
import { toast } from "sonner";
import { StructuredResumeData } from "@/types/resume";

export interface ResumeTemplate {
  id: string;
  name: string;
  style: string;
  accentColor: string;
  description: string;
  hasPhoto: boolean;
  templateType: "simple" | "creative";
}

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

interface ResumeTemplatesProps {
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
  formattingData?: {
    layout_type?: string;
    sidebar_color?: string;
    font_family?: string;
    section_spacing?: string;
    design_style?: string;
    colors?: string[];
    fonts?: string[];
    layout?: string;
  } | null;
  structuredData?: StructuredResumeData | null;
}

const TEMPLATES: ResumeTemplate[] = [
  // Simple Templates (Naukri-style)
  {
    id: "simple-classic",
    name: "Simple Classic",
    style: "Single-column ATS-friendly",
    accentColor: "#000000",
    description: "Clean, professional single-column layout perfect for ATS scanning",
    hasPhoto: false,
    templateType: "simple",
  },
  {
    id: "simple-modern",
    name: "Simple Modern",
    style: "Single-column with subtle accents",
    accentColor: "#2563EB",
    description: "Modern single-column design with professional styling",
    hasPhoto: false,
    templateType: "simple",
  },
  {
    id: "simple-minimal",
    name: "Simple Minimal",
    style: "Ultra-clean single-column",
    accentColor: "#374151",
    description: "Minimalist design focused on content, maximum ATS compatibility",
    hasPhoto: false,
    templateType: "simple",
  },
  // Creative Templates (Two-column)
  {
    id: "blue-sidebar",
    name: "Blue Sidebar Professional",
    style: "Two-column with blue sidebar",
    accentColor: "#4A90E2",
    description: "Classic professional layout with light blue sidebar and photo",
    hasPhoto: true,
    templateType: "creative",
  },
  {
    id: "purple-sidebar",
    name: "Purple Sidebar Elegant",
    style: "Two-column with purple sidebar",
    accentColor: "#9B59B6",
    description: "Elegant design with purple sidebar and modern typography",
    hasPhoto: true,
    templateType: "creative",
  },
  {
    id: "green-sidebar",
    name: "Green Sidebar Modern",
    style: "Two-column with green sidebar",
    accentColor: "#27AE60",
    description: "Modern layout with green accent and clean design",
    hasPhoto: true,
    templateType: "creative",
  },
  {
    id: "minimal-no-photo",
    name: "Minimal Clean",
    style: "Two-column minimal design",
    accentColor: "#34495E",
    description: "Clean minimal design without photo, perfect for ATS",
    hasPhoto: false,
    templateType: "creative",
  },
  {
    id: "orange-sidebar",
    name: "Orange Sidebar Creative",
    style: "Two-column with orange sidebar",
    accentColor: "#E67E22",
    description: "Creative design with warm orange tones",
    hasPhoto: true,
    templateType: "creative",
  },
  {
    id: "teal-sidebar",
    name: "Teal Sidebar Contemporary",
    style: "Two-column with teal sidebar",
    accentColor: "#16A085",
    description: "Contemporary design with teal accent color",
    hasPhoto: true,
    templateType: "creative",
  },
];

export const ResumeTemplates = ({
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
  structuredData,
}: ResumeTemplatesProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplate | null>(null);
  const [resumeSource, setResumeSource] = useState<"original" | "optimized">(
    optimizedResume ? "optimized" : "original"
  );
  const [previewOpen, setPreviewOpen] = useState(false);

  const currentResume = resumeSource === "optimized" && optimizedResume ? optimizedResume : originalResume;

  // Convert structured data to ParsedResume format for template rendering
  const convertStructuredToParsed = (data: StructuredResumeData): ParsedResume => {
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
  };

  // Enhanced parsing with better section detection
  const parseResumeContent = (text: string): ParsedResume => {
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
          } else if (originalLine.match(/^[•\-\*]/) || originalLine.match(/^\d+\./)) {
            currentExperience.description.push(originalLine.replace(/^[•\-\*\d+\.]\s*/, ""));
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
          .split(/[,•\-\*|]/)
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
        const langs = originalLine.split(/[,•\-\*]/).map((s) => s.trim()).filter((s) => s.length > 0);
        parsed.languages!.push(...langs);
      } else if (currentSection === "certifications") {
        const certs = originalLine.split(/[,•\-\*]/).map((s) => s.trim()).filter((s) => s.length > 0);
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
  };

  const generateTemplateHTML = (template: ResumeTemplate, resumeText: string, formatData?: typeof formattingData): string => {
    // Use structured data if available, otherwise parse from text
    const parsed = structuredData 
      ? convertStructuredToParsed(structuredData)
      : parseResumeContent(resumeText);
    const { header, professionalTitle, summary, experience, education, skills, projects, languages, certifications } = parsed;
    
    // Use formatting data if available to preserve original format
    const sidebarColor = formatData?.sidebar_color || (formatData as any)?.styling?.colors?.[0] || template.accentColor;
    const fontFamily = formatData?.font_family || (formatData as any)?.styling?.fonts?.[0] || 'Arial, sans-serif';
    const layoutType = formatData?.layout_type || 'two-column';

    const escapeHtml = (text: string) => {
      if (!text) return "";
      return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    // Format summary with proper paragraph breaks
    const formatSummary = (text: string): string => {
      if (!text) return "";
      // Split by sentences and create paragraphs
      const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim());
      const paragraphs: string[] = [];
      let currentPara = "";
      
      sentences.forEach((sentence, index) => {
        currentPara += sentence + " ";
        // Create paragraph every 2-3 sentences or at end
        if ((index + 1) % 3 === 0 || index === sentences.length - 1) {
          paragraphs.push(currentPara.trim());
          currentPara = "";
        }
      });
      
      return paragraphs.length > 0 ? paragraphs.join("</p><p>") : text;
    };

    // Generate simple template HTML (Naukri-style)
    if (template.templateType === "simple") {
      const fontFamily = formatData?.font_family || 'Arial, sans-serif';
      const accentColor = template.accentColor;
      
      return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume - ${escapeHtml(header.name || "Your Name")}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: ${fontFamily}; 
      line-height: 1.6; 
      color: #000; 
      background: #fff; 
      padding: 40px;
      max-width: 900px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid ${accentColor};
    }
    .name {
      font-size: 32px;
      font-weight: 700;
      color: #000;
      margin-bottom: 8px;
    }
    .title {
      font-size: 18px;
      color: #333;
      margin-bottom: 12px;
      font-weight: 500;
    }
    .contact-info {
      font-size: 14px;
      color: #555;
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 15px;
    }
    .contact-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: ${accentColor};
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
    }
    .summary-text {
      font-size: 14px;
      line-height: 1.8;
      color: #333;
      text-align: justify;
    }
    .summary-text p {
      margin-bottom: 10px;
    }
    .experience-item, .education-item {
      margin-bottom: 20px;
    }
    .job-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 8px;
    }
    .job-title {
      font-size: 16px;
      font-weight: 600;
      color: #000;
    }
    .company {
      font-size: 15px;
      color: #333;
      font-weight: 500;
      margin-top: 2px;
    }
    .dates {
      font-size: 13px;
      color: #666;
      white-space: nowrap;
    }
    .description {
      margin-top: 10px;
      padding-left: 20px;
    }
    .description ul {
      list-style: none;
      padding: 0;
    }
    .description li {
      margin-bottom: 6px;
      font-size: 14px;
      color: #444;
      position: relative;
    }
    .description li:before {
      content: "•";
      position: absolute;
      left: -15px;
      color: ${accentColor};
      font-weight: bold;
    }
    .skills-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .skill-tag {
      background: #f5f5f5;
      color: #333;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 13px;
      border: 1px solid #ddd;
    }
    .project-item {
      margin-bottom: 15px;
    }
    .project-name {
      font-size: 16px;
      font-weight: 600;
      color: #000;
      margin-bottom: 5px;
    }
    .project-description {
      font-size: 14px;
      color: #444;
      line-height: 1.7;
    }
    @media print {
      body { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="name">${escapeHtml(header.name || "Your Name")}</div>
    ${professionalTitle ? `<div class="title">${escapeHtml(professionalTitle)}</div>` : ""}
    <div class="contact-info">
      ${header.email ? `<div class="contact-item">${escapeHtml(header.email)}</div>` : ""}
      ${header.phone ? `<div class="contact-item">${escapeHtml(header.phone)}</div>` : ""}
      ${header.location ? `<div class="contact-item">${escapeHtml(header.location)}</div>` : ""}
      ${header.linkedin ? `<div class="contact-item"><a href="${escapeHtml(header.linkedin)}" style="color: ${accentColor};">${escapeHtml(header.linkedin)}</a></div>` : ""}
    </div>
  </div>

  ${summary ? `
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <div class="summary-text"><p>${formatSummary(summary)}</p></div>
  </div>
  ` : ""}

  ${experience.length > 0 ? `
  <div class="section">
    <div class="section-title">Work Experience</div>
    ${experience.map((exp) => `
      <div class="experience-item">
        <div class="job-header">
          <div>
            <div class="job-title">${escapeHtml(exp.title)}</div>
            ${exp.company ? `<div class="company">${escapeHtml(exp.company)}</div>` : ""}
          </div>
          ${exp.dates ? `<div class="dates">${escapeHtml(exp.dates)}</div>` : ""}
        </div>
        ${exp.description.length > 0 ? `
        <div class="description">
          <ul>
            ${exp.description.map((desc) => `<li>${escapeHtml(desc)}</li>`).join("")}
          </ul>
        </div>
        ` : ""}
      </div>
    `).join("")}
  </div>
  ` : ""}

  ${education.length > 0 ? `
  <div class="section">
    <div class="section-title">Education</div>
    ${education.map((edu) => `
      <div class="education-item">
        <div class="job-header">
          <div>
            <div class="job-title">${escapeHtml(edu.degree)}</div>
            ${edu.institution ? `<div class="company">${escapeHtml(edu.institution)}</div>` : ""}
          </div>
          ${edu.dates ? `<div class="dates">${escapeHtml(edu.dates)}</div>` : ""}
        </div>
      </div>
    `).join("")}
  </div>
  ` : ""}

  ${skills.length > 0 ? `
  <div class="section">
    <div class="section-title">Skills</div>
    <div class="skills-list">
      ${skills.map((skill) => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join("")}
    </div>
  </div>
  ` : ""}

  ${projects && projects.length > 0 ? `
  <div class="section">
    <div class="section-title">Projects</div>
    ${projects.map((proj) => `
      <div class="project-item">
        <div class="project-name">${escapeHtml(proj.name)}</div>
        <div class="project-description">${escapeHtml(proj.description)}</div>
      </div>
    `).join("")}
  </div>
  ` : ""}

  ${certifications && certifications.length > 0 ? `
  <div class="section">
    <div class="section-title">Certifications</div>
    <div class="description">
      <ul>
        ${certifications.map((cert) => `<li>${escapeHtml(cert)}</li>`).join("")}
      </ul>
    </div>
  </div>
  ` : ""}

  ${languages && languages.length > 0 ? `
  <div class="section">
    <div class="section-title">Languages</div>
    <div class="skills-list">
      ${languages.map((lang) => `<span class="skill-tag">${escapeHtml(lang)}</span>`).join("")}
    </div>
  </div>
  ` : ""}
</body>
</html>
      `.trim();
    }

    // Creative template (two-column) HTML generation
    const photoHtml = template.hasPhoto && profilePhotoUrl 
      ? `<div class="photo-container">
          <img src="${escapeHtml(profilePhotoUrl)}" alt="${escapeHtml(header.name)}" class="profile-photo" />
        </div>`
      : "";

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume - ${escapeHtml(header.name || "Your Name")}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: ${fontFamily}; 
      line-height: 1.6; 
      color: #333; 
      background: #f5f5f5; 
      display: flex;
      justify-content: center;
      padding: 20px;
    }
    .resume-container { 
      max-width: 1000px; 
      width: 100%;
      background: #fff; 
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
      display: flex;
      min-height: 800px;
    }
    .sidebar { 
      width: 280px; 
      background: ${sidebarColor}; 
      color: #fff; 
      padding: 30px 20px;
      display: flex;
      flex-direction: column;
    }
    .main-content { 
      flex: 1; 
      padding: 30px 40px; 
      background: #fff;
    }
    .photo-container {
      width: 100%;
      margin-bottom: 25px;
      text-align: center;
    }
    .profile-photo {
      width: 150px;
      height: 150px;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid rgba(255,255,255,0.3);
      box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    }
    .name-title {
      margin-bottom: 20px;
    }
    .name {
      font-size: 28px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 5px;
      text-align: center;
    }
    .professional-title {
      font-size: 16px;
      color: rgba(255,255,255,0.9);
      text-align: center;
      font-weight: 400;
    }
    .sidebar-section {
      margin-bottom: 25px;
    }
    .sidebar-title {
      font-size: 18px;
      font-weight: 600;
      color: #fff;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 2px solid rgba(255,255,255,0.3);
      padding-bottom: 8px;
    }
    .sidebar-content {
      font-size: 14px;
      color: rgba(255,255,255,0.95);
      line-height: 1.8;
    }
    .sidebar-item {
      margin-bottom: 8px;
    }
    .sidebar-item strong {
      display: block;
      margin-bottom: 3px;
      color: #fff;
    }
    .skills-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .skill-tag {
      background: rgba(255,255,255,0.2);
      color: #fff;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 13px;
      border: 1px solid rgba(255,255,255,0.3);
    }
    .main-header {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid ${sidebarColor};
    }
    .main-name {
      font-size: 36px;
      font-weight: 700;
      color: ${sidebarColor};
      margin-bottom: 5px;
    }
    .main-title {
      font-size: 18px;
      color: #666;
      font-weight: 400;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 20px;
      font-weight: 600;
      color: ${sidebarColor};
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 2px solid ${sidebarColor};
      padding-bottom: 5px;
    }
    .summary-text {
      font-size: 15px;
      line-height: 1.8;
      color: #555;
      text-align: justify;
    }
    .experience-item, .education-item, .project-item {
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #eee;
    }
    .experience-item:last-child, .education-item:last-child, .project-item:last-child {
      border-bottom: none;
    }
    .job-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 8px;
    }
    .job-title {
      font-size: 18px;
      font-weight: 600;
      color: #222;
    }
    .company {
      font-size: 16px;
      color: ${sidebarColor};
      font-weight: 500;
      margin-top: 2px;
    }
    .dates {
      font-size: 14px;
      color: #888;
      white-space: nowrap;
    }
    .description {
      margin-top: 10px;
    }
    .description ul {
      list-style: none;
      padding-left: 0;
    }
    .description li {
      margin-bottom: 6px;
      padding-left: 20px;
      position: relative;
      font-size: 14px;
      color: #555;
    }
    .description li:before {
      content: "▸";
      position: absolute;
      left: 0;
      color: ${sidebarColor};
      font-weight: bold;
    }
    .project-name {
      font-size: 18px;
      font-weight: 600;
      color: #222;
      margin-bottom: 5px;
    }
    .project-duration {
      font-size: 13px;
      color: #888;
      margin-bottom: 8px;
    }
    .project-description {
      font-size: 14px;
      color: #555;
      line-height: 1.7;
    }
    @media print {
      body { padding: 0; background: #fff; }
      .resume-container { box-shadow: none; }
      .sidebar { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="resume-container">
    <div class="sidebar">
      ${photoHtml}
      <div class="name-title">
        <div class="name">${escapeHtml(header.name || "Your Name")}</div>
        ${professionalTitle ? `<div class="professional-title">${escapeHtml(professionalTitle)}</div>` : ""}
      </div>

      <div class="sidebar-section">
        <div class="sidebar-title">Personal Information</div>
        <div class="sidebar-content">
          ${header.email ? `<div class="sidebar-item"><strong>Email:</strong> ${escapeHtml(header.email)}</div>` : ""}
          ${header.phone ? `<div class="sidebar-item"><strong>Mobile:</strong> ${escapeHtml(header.phone)}</div>` : ""}
          ${header.workExperience ? `<div class="sidebar-item"><strong>Total work experience:</strong> ${escapeHtml(header.workExperience)}</div>` : ""}
          ${header.linkedin ? `<div class="sidebar-item"><strong>Social Link:</strong> <a href="${escapeHtml(header.linkedin)}" style="color: rgba(255,255,255,0.9); text-decoration: underline;">${escapeHtml(header.linkedin)}</a></div>` : ""}
          ${header.location ? `<div class="sidebar-item"><strong>City:</strong> ${escapeHtml(header.location.split(',')[0])}</div>` : ""}
          ${header.location ? `<div class="sidebar-item"><strong>Country:</strong> ${header.location.includes(',') ? escapeHtml(header.location.split(',')[1]?.trim() || '') : ''}</div>` : ""}
        </div>
      </div>

      ${skills.length > 0 ? `
      <div class="sidebar-section">
        <div class="sidebar-title">Key Skills</div>
        <div class="skills-list">
          ${skills.map((skill) => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join("")}
        </div>
      </div>
      ` : ""}

      ${languages && languages.length > 0 ? `
      <div class="sidebar-section">
        <div class="sidebar-title">Languages</div>
        <div class="sidebar-content">
          ${languages.map((lang) => `<div class="sidebar-item">${escapeHtml(lang)}</div>`).join("")}
        </div>
      </div>
      ` : ""}

      ${certifications && certifications.length > 0 ? `
      <div class="sidebar-section">
        <div class="sidebar-title">Courses & Certifications</div>
        <div class="sidebar-content">
          ${certifications.map((cert) => `<div class="sidebar-item">${escapeHtml(cert)}</div>`).join("")}
        </div>
      </div>
      ` : ""}
    </div>

    <div class="main-content">
      ${!photoHtml ? `
      <div class="main-header">
        <div class="main-name">${escapeHtml(header.name || "Your Name")}</div>
        ${professionalTitle ? `<div class="main-title">${escapeHtml(professionalTitle)}</div>` : ""}
      </div>
      ` : ""}

      ${summary ? `
      <div class="section">
        <div class="section-title">Profile Summary</div>
        <div class="summary-text"><p>${formatSummary(summary)}</p></div>
      </div>
      ` : ""}

      ${experience.length > 0 ? `
      <div class="section">
        <div class="section-title">Work Experience</div>
        ${experience.map((exp) => `
          <div class="experience-item">
            <div class="job-header">
              <div>
                <div class="job-title">${escapeHtml(exp.title)}</div>
                ${exp.company ? `<div class="company">${escapeHtml(exp.company)}</div>` : ""}
              </div>
              ${exp.dates ? `<div class="dates">${escapeHtml(exp.dates)}</div>` : ""}
            </div>
            ${exp.description.length > 0 ? `
            <div class="description">
              <ul>
                ${exp.description.map((desc) => `<li>${escapeHtml(desc)}</li>`).join("")}
              </ul>
            </div>
            ` : ""}
          </div>
        `).join("")}
      </div>
      ` : ""}

      ${education.length > 0 ? `
      <div class="section">
        <div class="section-title">Education</div>
        ${education.map((edu) => `
          <div class="education-item">
            <div class="job-header">
              <div>
                <div class="job-title">${escapeHtml(edu.degree)}</div>
                ${edu.institution ? `<div class="company">${escapeHtml(edu.institution)}</div>` : ""}
              </div>
              ${edu.dates ? `<div class="dates">${escapeHtml(edu.dates)}</div>` : ""}
            </div>
          </div>
        `).join("")}
      </div>
      ` : ""}

      ${projects && projects.length > 0 ? `
      <div class="section">
        <div class="section-title">Projects</div>
        ${projects.map((proj) => `
          <div class="project-item">
            <div class="project-name">${escapeHtml(proj.name)}</div>
            ${proj.duration ? `<div class="project-duration">Duration: ${escapeHtml(proj.duration)}</div>` : ""}
            <div class="project-description">${escapeHtml(proj.description)}</div>
          </div>
        `).join("")}
      </div>
      ` : ""}
    </div>
  </div>
</body>
</html>
    `;

    return html.trim();
  };

  const handlePreview = (template: ResumeTemplate) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  const handleDownload = async (template: ResumeTemplate, format: 'html' | 'pdf' = 'html') => {
    try {
      const html = generateTemplateHTML(template, currentResume, formattingData);
      
      if (format === 'pdf') {
        // Use html2pdf.js for PDF generation
        try {
          const html2pdf = (await import('html2pdf.js')).default;
          const element = document.createElement('div');
          element.innerHTML = html;
          // Hide the element but keep it in DOM for rendering
          element.style.position = 'absolute';
          element.style.left = '-9999px';
          document.body.appendChild(element);
          
          const opt = {
            margin: 0.5,
            filename: `resume_${template.id}_${new Date().toISOString().split("T")[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
          };
          
          await html2pdf().set(opt).from(element).save();
          document.body.removeChild(element);
          toast.success(`Downloaded ${template.name} as PDF!`);
        } catch (pdfError: any) {
          console.error("PDF generation error:", pdfError);
          toast.error("Failed to generate PDF. Downloading as HTML instead.");
          // Fallback to HTML download
          const blob = new Blob([html], { type: "text/html;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `resume_${template.id}_${new Date().toISOString().split("T")[0]}.html`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } else {
        // Download as HTML
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `resume_${template.id}_${new Date().toISOString().split("T")[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Downloaded ${template.name} template!`);
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download template");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose Resume Template</DialogTitle>
            <DialogDescription>
              Select a professional template for your resume. Preview and download as HTML.
            </DialogDescription>
          </DialogHeader>

          {optimizedResume && (
            <div className="mb-4 p-4 bg-accent/5 rounded-lg border border-accent/30">
              <Label className="text-sm font-medium mb-2 block">Resume Source</Label>
              <RadioGroup value={resumeSource} onValueChange={(value) => setResumeSource(value as "original" | "optimized")}>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="optimized" id="optimized" />
                    <Label htmlFor="optimized" className="cursor-pointer">
                      Optimized Resume
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="original" id="original" />
                    <Label htmlFor="original" className="cursor-pointer">
                      Original Resume
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map((template) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="h-full hover:border-accent/50 transition-colors cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: template.accentColor }}
                      />
                    </div>
                    <CardDescription className="text-xs">{template.style}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                    {template.hasPhoto && !profilePhotoUrl && (
                      <p className="text-xs text-yellow-600">Photo will be added if available</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(template)}
                      >
                        <Eye className="mr-2 h-3 w-3" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(template, 'html')}
                        title="Download as HTML"
                      >
                        <FileText className="mr-2 h-3 w-3" />
                        HTML
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDownload(template, 'pdf')}
                        title="Download as PDF"
                      >
                        <FileDown className="mr-2 h-3 w-3" />
                        PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name} Template Preview</DialogTitle>
            <DialogDescription>
              Preview your resume with the {selectedTemplate?.name} template
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded-lg bg-white">
            {selectedTemplate && (
              <iframe
                srcDoc={generateTemplateHTML(selectedTemplate, currentResume, formattingData)}
                className="w-full h-full min-h-[600px] border-0"
                title="Resume Preview"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
            {selectedTemplate && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => handleDownload(selectedTemplate, 'html')}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Download HTML
                </Button>
                <Button onClick={() => handleDownload(selectedTemplate, 'pdf')}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
