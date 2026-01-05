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
import { Download, Eye, Palette, FileText } from "lucide-react";
import { toast } from "sonner";

export interface ResumeTemplate {
  id: string;
  name: string;
  style: string;
  accentColor: string;
  description: string;
}

export interface ParsedResume {
  header: {
    name: string;
    email: string;
    phone: string;
    location: string;
  };
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
  }>;
}

interface ResumeTemplatesProps {
  originalResume: string;
  optimizedResume: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TEMPLATES: ResumeTemplate[] = [
  {
    id: "modern-professional",
    name: "Modern Professional",
    style: "Left border accent",
    accentColor: "#2563eb",
    description: "Clean layout with left border accent, perfect for corporate roles",
  },
  {
    id: "executive-elegant",
    name: "Executive Elegant",
    style: "Centered, double border",
    accentColor: "#475569",
    description: "Sophisticated centered design with elegant borders",
  },
  {
    id: "creative-minimal",
    name: "Creative Minimal",
    style: "Header gradient, rounded sections",
    accentColor: "#7c3aed",
    description: "Modern gradient header with rounded sections, ideal for creative fields",
  },
  {
    id: "tech-forward",
    name: "Tech Forward",
    style: "Grid layout, monospace fonts",
    accentColor: "#059669",
    description: "Tech-focused design with grid layout and monospace typography",
  },
  {
    id: "academic-classic",
    name: "Academic Classic",
    style: "Serif fonts, small-caps",
    accentColor: "#d97706",
    description: "Traditional academic style with serif fonts and small-caps headers",
  },
  {
    id: "simple-clean",
    name: "Simple & Clean",
    style: "Maximum ATS compatibility",
    accentColor: "#4b5563",
    description: "Minimal styling optimized for ATS systems",
  },
];

export const ResumeTemplates = ({
  originalResume,
  optimizedResume,
  open,
  onOpenChange,
}: ResumeTemplatesProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplate | null>(null);
  const [resumeSource, setResumeSource] = useState<"original" | "optimized">(
    optimizedResume ? "optimized" : "original"
  );
  const [previewOpen, setPreviewOpen] = useState(false);

  const currentResume = resumeSource === "optimized" && optimizedResume ? optimizedResume : originalResume;

  // Hybrid parsing: Regex first, fallback to simple structure
  const parseResumeContent = (text: string): ParsedResume => {
    const lines = text.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
    
    // Initialize parsed structure
    const parsed: ParsedResume = {
      header: { name: "", email: "", phone: "", location: "" },
      summary: "",
      experience: [],
      education: [],
      skills: [],
      projects: [],
    };

    // Extract header info (first few lines)
    const headerLines = lines.slice(0, 5);
    headerLines.forEach((line) => {
      // Email
      const emailMatch = line.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch && !parsed.header.email) {
        parsed.header.email = emailMatch[0];
        line = line.replace(emailMatch[0], "").trim();
      }
      // Phone
      const phoneMatch = line.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
      if (phoneMatch && !parsed.header.phone) {
        parsed.header.phone = phoneMatch[0];
        line = line.replace(phoneMatch[0], "").trim();
      }
      // Name (usually first line without email/phone)
      if (!parsed.header.name && !emailMatch && !phoneMatch && line.length > 2 && line.length < 50) {
        parsed.header.name = line;
      }
      // Location
      if (line.match(/\b[A-Z][a-z]+,\s*[A-Z]{2}\b/) && !parsed.header.location) {
        parsed.header.location = line;
      }
    });

    // Find section headers
    let currentSection = "";
    let currentExperience: any = null;
    let currentEducation: any = null;
    let currentProject: any = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();
      
      // Section detection
      if (line.match(/^(SUMMARY|PROFESSIONAL SUMMARY|OBJECTIVE|PROFILE)/)) {
        currentSection = "summary";
        continue;
      } else if (line.match(/^(EXPERIENCE|WORK EXPERIENCE|EMPLOYMENT|PROFESSIONAL EXPERIENCE)/)) {
        currentSection = "experience";
        continue;
      } else if (line.match(/^(EDUCATION|ACADEMIC BACKGROUND)/)) {
        currentSection = "education";
        continue;
      } else if (line.match(/^(SKILLS|TECHNICAL SKILLS|CORE SKILLS)/)) {
        currentSection = "skills";
        continue;
      } else if (line.match(/^(PROJECTS|PROJECT EXPERIENCE)/)) {
        currentSection = "projects";
        continue;
      }

      const originalLine = lines[i];

      // Process sections
      if (currentSection === "summary") {
        if (parsed.summary) parsed.summary += " ";
        parsed.summary += originalLine;
      } else if (currentSection === "experience") {
        // Look for job title patterns
        if (originalLine.match(/^[A-Z][^•\-\d]+$/) && !currentExperience) {
          if (currentExperience) parsed.experience.push(currentExperience);
          currentExperience = {
            title: originalLine,
            company: "",
            dates: "",
            description: [],
          };
        } else if (currentExperience) {
          // Company name (often on same line as title or next line)
          if (!currentExperience.company && originalLine.length < 50) {
            currentExperience.company = originalLine;
          }
          // Dates
          else if (originalLine.match(/\d{4}|\w+\s+\d{4}/)) {
            currentExperience.dates = originalLine;
          }
          // Bullet points
          else if (originalLine.match(/^[•\-\*]/) || originalLine.match(/^\d+\./)) {
            currentExperience.description.push(originalLine.replace(/^[•\-\*\d+\.]\s*/, ""));
          }
        }
      } else if (currentSection === "education") {
        if (originalLine.match(/^[A-Z][^•\-\d]+$/) && !currentEducation) {
          if (currentEducation) parsed.education.push(currentEducation);
          currentEducation = {
            degree: originalLine,
            institution: "",
            dates: "",
          };
        } else if (currentEducation) {
          if (!currentEducation.institution && originalLine.length < 80) {
            currentEducation.institution = originalLine;
          } else if (originalLine.match(/\d{4}/)) {
            currentEducation.dates = originalLine;
          }
        }
      } else if (currentSection === "skills") {
        // Skills can be comma-separated or bullet points
        const skills = originalLine
          .split(/[,•\-\*]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        parsed.skills.push(...skills);
      } else if (currentSection === "projects") {
        if (originalLine.match(/^[A-Z][^•\-\d]+$/) && !currentProject) {
          if (currentProject) parsed.projects!.push(currentProject);
          currentProject = {
            name: originalLine,
            description: "",
          };
        } else if (currentProject) {
          currentProject.description += (currentProject.description ? " " : "") + originalLine;
        }
      }
    }

    // Push last items
    if (currentExperience) parsed.experience.push(currentExperience);
    if (currentEducation) parsed.education.push(currentEducation);
    if (currentProject) parsed.projects!.push(currentProject);

    // Fallback: if no structured data found, use simple text blocks
    if (!parsed.header.name && lines.length > 0) {
      parsed.header.name = lines[0] || "Your Name";
    }
    if (parsed.experience.length === 0 && parsed.education.length === 0) {
      // Use first few lines as summary
      parsed.summary = lines.slice(1, 5).join(" ");
    }

    return parsed;
  };

  const generateTemplateHTML = (template: ResumeTemplate, resumeText: string): string => {
    const parsed = parseResumeContent(resumeText);
    const { header, summary, experience, education, skills, projects } = parsed;

    const escapeHtml = (text: string) => {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    const templateStyles: Record<string, string> = {
      "modern-professional": `
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #fff; padding: 40px; }
          .container { max-width: 900px; margin: 0 auto; border-left: 4px solid ${template.accentColor}; padding-left: 30px; }
          .header { margin-bottom: 30px; }
          .name { font-size: 32px; font-weight: 700; color: ${template.accentColor}; margin-bottom: 10px; }
          .contact { display: flex; gap: 20px; flex-wrap: wrap; font-size: 14px; color: #666; }
          .section { margin-bottom: 25px; }
          .section-title { font-size: 20px; font-weight: 600; color: ${template.accentColor}; border-bottom: 2px solid ${template.accentColor}; padding-bottom: 5px; margin-bottom: 15px; text-transform: uppercase; }
          .summary { font-size: 15px; line-height: 1.8; color: #555; }
          .experience-item, .education-item { margin-bottom: 20px; }
          .job-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px; }
          .job-title { font-size: 18px; font-weight: 600; color: #222; }
          .company { font-size: 16px; color: #555; font-style: italic; }
          .dates { font-size: 14px; color: #888; }
          .description { margin-top: 8px; }
          .description ul { list-style: none; padding-left: 0; }
          .description li { margin-bottom: 5px; padding-left: 20px; position: relative; }
          .description li:before { content: "•"; position: absolute; left: 0; color: ${template.accentColor}; font-weight: bold; }
          .skills { display: flex; flex-wrap: wrap; gap: 10px; }
          .skill-tag { background: ${template.accentColor}15; color: ${template.accentColor}; padding: 5px 12px; border-radius: 4px; font-size: 14px; }
          @media print { body { padding: 20px; } }
        </style>
      `,
      "executive-elegant": `
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Georgia', 'Times New Roman', serif; line-height: 1.7; color: #2c3e50; background: #fff; padding: 50px; }
          .container { max-width: 850px; margin: 0 auto; border: 2px solid ${template.accentColor}; border-top: 4px solid ${template.accentColor}; padding: 40px; }
          .header { text-align: center; margin-bottom: 35px; border-bottom: 1px solid #ddd; padding-bottom: 25px; }
          .name { font-size: 36px; font-weight: 400; color: ${template.accentColor}; margin-bottom: 12px; letter-spacing: 2px; }
          .contact { display: flex; justify-content: center; gap: 25px; flex-wrap: wrap; font-size: 13px; color: #666; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 18px; font-weight: 600; color: ${template.accentColor}; text-align: center; margin-bottom: 18px; text-transform: uppercase; letter-spacing: 1px; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 8px 0; }
          .summary { font-size: 15px; line-height: 1.9; color: #444; text-align: justify; }
          .experience-item, .education-item { margin-bottom: 22px; }
          .job-header { text-align: center; margin-bottom: 10px; }
          .job-title { font-size: 17px; font-weight: 600; color: #222; }
          .company { font-size: 15px; color: #555; }
          .dates { font-size: 13px; color: #888; font-style: italic; }
          .description { margin-top: 10px; text-align: left; }
          .description ul { list-style: none; padding-left: 0; }
          .description li { margin-bottom: 6px; padding-left: 22px; position: relative; }
          .description li:before { content: "▸"; position: absolute; left: 0; color: ${template.accentColor}; }
          .skills { display: flex; justify-content: center; flex-wrap: wrap; gap: 12px; }
          .skill-tag { background: ${template.accentColor}20; color: ${template.accentColor}; padding: 6px 14px; border-radius: 3px; font-size: 13px; border: 1px solid ${template.accentColor}40; }
          @media print { body { padding: 30px; } }
        </style>
      `,
      "creative-minimal": `
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; padding: 0; }
          .container { max-width: 900px; margin: 0 auto; background: #fff; }
          .header-gradient { background: linear-gradient(135deg, ${template.accentColor} 0%, ${template.accentColor}dd 100%); padding: 40px; color: white; }
          .name { font-size: 38px; font-weight: 300; margin-bottom: 15px; letter-spacing: 1px; }
          .contact { display: flex; gap: 25px; flex-wrap: wrap; font-size: 14px; opacity: 0.95; }
          .content { padding: 40px; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 22px; font-weight: 600; color: ${template.accentColor}; margin-bottom: 18px; padding-bottom: 8px; border-bottom: 2px solid ${template.accentColor}30; }
          .summary { font-size: 15px; line-height: 1.8; color: #555; background: #f8f9fa; padding: 20px; border-radius: 8px; }
          .experience-item, .education-item { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 15px; }
          .job-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px; }
          .job-title { font-size: 19px; font-weight: 600; color: #222; }
          .company { font-size: 16px; color: ${template.accentColor}; font-weight: 500; }
          .dates { font-size: 13px; color: #888; }
          .description { margin-top: 10px; }
          .description ul { list-style: none; padding-left: 0; }
          .description li { margin-bottom: 6px; padding-left: 22px; position: relative; }
          .description li:before { content: "→"; position: absolute; left: 0; color: ${template.accentColor}; }
          .skills { display: flex; flex-wrap: wrap; gap: 10px; }
          .skill-tag { background: ${template.accentColor}15; color: ${template.accentColor}; padding: 8px 15px; border-radius: 20px; font-size: 14px; font-weight: 500; }
          @media print { body { background: #fff; } .header-gradient { background: ${template.accentColor}; } }
        </style>
      `,
      "tech-forward": `
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', 'Monaco', monospace; line-height: 1.5; color: #2d3748; background: #1a202c; color: #e2e8f0; padding: 30px; }
          .container { max-width: 1000px; margin: 0 auto; background: #2d3748; padding: 30px; border: 1px solid ${template.accentColor}; }
          .header { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid ${template.accentColor}; }
          .name { font-size: 32px; font-weight: 700; color: ${template.accentColor}; margin-bottom: 10px; }
          .contact { display: grid; gap: 8px; font-size: 13px; color: #cbd5e0; font-family: monospace; }
          .section { margin-bottom: 25px; }
          .section-title { font-size: 18px; font-weight: 700; color: ${template.accentColor}; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 2px; border-left: 4px solid ${template.accentColor}; padding-left: 10px; }
          .summary { font-size: 14px; line-height: 1.7; color: #e2e8f0; background: #1a202c; padding: 15px; border-left: 3px solid ${template.accentColor}; }
          .experience-item, .education-item { background: #1a202c; border: 1px solid #4a5568; padding: 15px; margin-bottom: 12px; }
          .job-header { display: grid; grid-template-columns: 2fr 1fr; gap: 15px; margin-bottom: 8px; }
          .job-title { font-size: 16px; font-weight: 600; color: ${template.accentColor}; }
          .company { font-size: 14px; color: #cbd5e0; }
          .dates { font-size: 12px; color: #718096; font-family: monospace; }
          .description { margin-top: 8px; }
          .description ul { list-style: none; padding-left: 0; }
          .description li { margin-bottom: 4px; padding-left: 20px; position: relative; font-size: 13px; }
          .description li:before { content: ">"; position: absolute; left: 0; color: ${template.accentColor}; }
          .skills { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
          .skill-tag { background: ${template.accentColor}25; color: ${template.accentColor}; padding: 6px 12px; border: 1px solid ${template.accentColor}50; font-size: 12px; font-family: monospace; text-align: center; }
          @media print { body { background: #fff; color: #000; } .container { background: #fff; border: 1px solid #000; } }
        </style>
      `,
      "academic-classic": `
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', 'Georgia', serif; line-height: 1.8; color: #2c2c2c; background: #fff; padding: 50px; }
          .container { max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 35px; border-bottom: 3px double ${template.accentColor}; padding-bottom: 20px; }
          .name { font-size: 34px; font-weight: 400; color: #1a1a1a; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 3px; }
          .contact { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; font-size: 12px; color: #555; text-transform: uppercase; letter-spacing: 1px; }
          .section { margin-bottom: 28px; }
          .section-title { font-size: 16px; font-weight: 600; color: ${template.accentColor}; text-align: center; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 2px; font-variant: small-caps; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .summary { font-size: 14px; line-height: 2; color: #444; text-align: justify; text-indent: 20px; }
          .experience-item, .education-item { margin-bottom: 20px; }
          .job-header { text-align: center; margin-bottom: 8px; }
          .job-title { font-size: 16px; font-weight: 600; color: #1a1a1a; font-style: italic; }
          .company { font-size: 14px; color: #555; }
          .dates { font-size: 12px; color: #888; }
          .description { margin-top: 8px; text-align: left; }
          .description ul { list-style: none; padding-left: 0; }
          .description li { margin-bottom: 5px; padding-left: 25px; position: relative; font-size: 13px; }
          .description li:before { content: "▪"; position: absolute; left: 0; color: ${template.accentColor}; }
          .skills { display: flex; justify-content: center; flex-wrap: wrap; gap: 15px; }
          .skill-tag { color: ${template.accentColor}; padding: 4px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid ${template.accentColor}; }
          @media print { body { padding: 40px; } }
        </style>
      `,
      "simple-clean": `
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, 'Helvetica Neue', sans-serif; line-height: 1.6; color: #000; background: #fff; padding: 40px; }
          .container { max-width: 850px; margin: 0 auto; }
          .header { margin-bottom: 25px; }
          .name { font-size: 28px; font-weight: 700; color: #000; margin-bottom: 8px; }
          .contact { display: flex; gap: 15px; flex-wrap: wrap; font-size: 13px; color: #333; }
          .section { margin-bottom: 20px; }
          .section-title { font-size: 16px; font-weight: 700; color: #000; margin-bottom: 12px; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 3px; }
          .summary { font-size: 14px; line-height: 1.7; color: #333; }
          .experience-item, .education-item { margin-bottom: 18px; }
          .job-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 6px; }
          .job-title { font-size: 16px; font-weight: 600; color: #000; }
          .company { font-size: 14px; color: #333; }
          .dates { font-size: 12px; color: #666; }
          .description { margin-top: 6px; }
          .description ul { list-style: none; padding-left: 0; }
          .description li { margin-bottom: 4px; padding-left: 18px; position: relative; font-size: 13px; }
          .description li:before { content: "•"; position: absolute; left: 0; }
          .skills { display: flex; flex-wrap: wrap; gap: 8px; }
          .skill-tag { color: #000; padding: 3px 10px; font-size: 12px; border: 1px solid #000; }
          @media print { body { padding: 20px; } }
        </style>
      `,
    };

    const baseHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume - ${escapeHtml(header.name || "Your Name")}</title>
  ${templateStyles[template.id] || templateStyles["simple-clean"]}
</head>
<body>
  <div class="container">
    ${template.id === "creative-minimal" ? `
    <div class="header-gradient">
      <div class="name">${escapeHtml(header.name || "Your Name")}</div>
      <div class="contact">
        ${header.email ? `<span>${escapeHtml(header.email)}</span>` : ""}
        ${header.phone ? `<span>${escapeHtml(header.phone)}</span>` : ""}
        ${header.location ? `<span>${escapeHtml(header.location)}</span>` : ""}
      </div>
    </div>
    <div class="content">
    ` : `
    <div class="header">
      <div class="name">${escapeHtml(header.name || "Your Name")}</div>
      <div class="contact">
        ${header.email ? `<span>${escapeHtml(header.email)}</span>` : ""}
        ${header.phone ? `<span>${escapeHtml(header.phone)}</span>` : ""}
        ${header.location ? `<span>${escapeHtml(header.location)}</span>` : ""}
      </div>
    </div>
    `}

    ${summary ? `
    <div class="section">
      <div class="section-title">${template.id === "academic-classic" ? "Summary" : "Professional Summary"}</div>
      <div class="summary">${escapeHtml(summary)}</div>
    </div>
    ` : ""}

    ${experience.length > 0 ? `
    <div class="section">
      <div class="section-title">Experience</div>
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
      <div class="skills">
        ${skills.map((skill) => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join("")}
      </div>
    </div>
    ` : ""}

    ${projects && projects.length > 0 ? `
    <div class="section">
      <div class="section-title">Projects</div>
      ${projects.map((proj) => `
        <div class="experience-item">
          <div class="job-title">${escapeHtml(proj.name)}</div>
          <div class="description">${escapeHtml(proj.description)}</div>
        </div>
      `).join("")}
    </div>
    ` : ""}

    ${template.id === "creative-minimal" ? `</div>` : ""}
  </div>
</body>
</html>
    `;

    return baseHTML.trim();
  };

  const handlePreview = (template: ResumeTemplate) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  const handleDownload = (template: ResumeTemplate) => {
    try {
      const html = generateTemplateHTML(template, currentResume);
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
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handlePreview(template)}
                      >
                        <Eye className="mr-2 h-3 w-3" />
                        Preview
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDownload(template)}
                      >
                        <Download className="mr-2 h-3 w-3" />
                        Download
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
                srcDoc={generateTemplateHTML(selectedTemplate, currentResume)}
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
              <Button onClick={() => handleDownload(selectedTemplate)}>
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

