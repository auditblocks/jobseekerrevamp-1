/**
 * @fileoverview HTML renderer for the "simple" (single-column, ATS-friendly) template family.
 */

import { ResumeTemplate } from "../templateRegistry";
import { ParsedResume, FormattingData } from "../resumeParsing";
import { escapeHtml, formatSummary } from "./htmlUtils";

export function renderSimpleTemplate(
  parsed: ParsedResume,
  template: ResumeTemplate,
  formatData?: FormattingData | null,
): string {
  const { header, professionalTitle, summary, experience, education, skills, projects, languages, certifications } = parsed;

  const fontFamily = formatData?.font_family || "Arial, sans-serif";
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
