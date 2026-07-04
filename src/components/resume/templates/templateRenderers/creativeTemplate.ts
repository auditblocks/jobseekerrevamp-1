/**
 * @fileoverview HTML renderer for the "creative" (two-column sidebar) template family.
 */

import { ResumeTemplate } from "../templateRegistry";
import { ParsedResume, FormattingData } from "../resumeParsing";
import { escapeHtml, formatSummary } from "./htmlUtils";

export function renderCreativeTemplate(
  parsed: ParsedResume,
  template: ResumeTemplate,
  formatData?: FormattingData | null,
  profilePhotoUrl?: string | null,
): string {
  const { header, professionalTitle, summary, experience, education, skills, projects, languages, certifications } = parsed;

  const sidebarColor = formatData?.sidebar_color || (formatData as any)?.styling?.colors?.[0] || template.accentColor;
  const fontFamily = formatData?.font_family || (formatData as any)?.styling?.fonts?.[0] || "Arial, sans-serif";

  // Validate profilePhotoUrl - filter out empty strings and invalid data URLs
  const isValidPhotoUrl =
    profilePhotoUrl &&
    typeof profilePhotoUrl === "string" &&
    profilePhotoUrl.trim().length > 0 &&
    !profilePhotoUrl.startsWith("data:;base64") &&
    !profilePhotoUrl.startsWith("data:;base64,=");

  const photoHtml =
    template.hasPhoto && isValidPhotoUrl
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
}
