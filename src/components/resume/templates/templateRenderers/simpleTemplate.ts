import { ResumeTemplate } from "../templateRegistry";
import { ParsedResume, FormattingData } from "../resumeParsing";
import { escapeHtml, formatSummary } from "./htmlUtils";
import {
  renderCompact,
  renderTimeline,
  renderHeaderBand,
  renderAcademic,
} from "./layoutTemplates";

export function renderSimpleTemplate(
  parsed: ParsedResume,
  template: ResumeTemplate,
  formatData?: FormattingData | null,
): string {
  // Dispatch on `layout`, not `id` — every layout ships in multiple theme variants
  // (professional-teal, professional-burgundy, …) that must share one renderer.
  switch (template.layout) {
    case "modern":
      return renderModern(parsed, template, formatData);
    case "executive":
      return renderExecutive(parsed, template, formatData);
    case "minimal":
      return renderMinimal(parsed, template, formatData);
    case "compact":
      return renderCompact(parsed, template, formatData);
    case "timeline":
      return renderTimeline(parsed, template, formatData);
    case "headerband":
      return renderHeaderBand(parsed, template, formatData);
    case "academic":
      return renderAcademic(parsed, template, formatData);
    default:
      return renderProfessional(parsed, template, formatData);
  }
}

function renderProfessional(
  parsed: ParsedResume,
  template: ResumeTemplate,
  formatData?: FormattingData | null,
): string {
  const { header, professionalTitle, summary, experience, education, skills, projects, languages, certifications } = parsed;
  const accent = template.accentColor;
  const font = formatData?.font_family || template.fontFamily;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Resume - ${escapeHtml(header.name || "Resume")}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:${font};line-height:1.55;color:#1f2937;background:#fff;-webkit-font-smoothing:antialiased}
.page{max-width:800px;margin:0 auto;padding:48px 56px}
.header{text-align:center;padding-bottom:24px;border-bottom:2px solid ${accent}}
.name{font-size:28px;font-weight:700;color:${accent};letter-spacing:-0.5px}
.title{font-size:15px;color:#4b5563;margin-top:4px;font-weight:500}
.contact{display:flex;justify-content:center;flex-wrap:wrap;gap:6px 16px;margin-top:12px;font-size:12.5px;color:#6b7280}
.contact a{color:${accent};text-decoration:none}
.section{margin-top:28px}
.section-title{font-size:11px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:2px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;margin-bottom:14px}
.summary{font-size:13.5px;color:#374151;line-height:1.7}
.summary p{margin-bottom:8px}
.entry{margin-bottom:18px}
.entry:last-child{margin-bottom:0}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.entry-title{font-size:14px;font-weight:600;color:#111827}
.entry-subtitle{font-size:13px;color:${accent};font-weight:500;margin-top:1px}
.entry-date{font-size:12px;color:#9ca3af;white-space:nowrap;font-weight:500}
.entry-bullets{margin-top:6px;padding-left:16px}
.entry-bullets li{font-size:13px;color:#4b5563;margin-bottom:4px;line-height:1.6}
.entry-bullets li::marker{color:${accent}}
.skills-row{display:flex;flex-wrap:wrap;gap:6px}
.skill{font-size:12px;padding:4px 10px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:4px;color:#374151}
.project-desc{font-size:13px;color:#4b5563;margin-top:3px;line-height:1.6}
@media print{.page{padding:32px 40px}.section{margin-top:22px}}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="name">${escapeHtml(header.name || "Your Name")}</div>
    ${professionalTitle ? `<div class="title">${escapeHtml(professionalTitle)}</div>` : ""}
    <div class="contact">
      ${header.email ? `<span>${escapeHtml(header.email)}</span>` : ""}
      ${header.phone ? `<span>${escapeHtml(header.phone)}</span>` : ""}
      ${header.location ? `<span>${escapeHtml(header.location)}</span>` : ""}
      ${header.linkedin ? `<a href="${escapeHtml(header.linkedin)}">${escapeHtml(header.linkedin.replace(/^https?:\/\//, ""))}</a>` : ""}
    </div>
  </div>

  ${summary ? `
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <div class="summary"><p>${formatSummary(summary)}</p></div>
  </div>` : ""}

  ${experience.length > 0 ? `
  <div class="section">
    <div class="section-title">Experience</div>
    ${experience.map(exp => `
    <div class="entry">
      <div class="entry-header">
        <div>
          <div class="entry-title">${escapeHtml(exp.title)}</div>
          ${exp.company ? `<div class="entry-subtitle">${escapeHtml(exp.company)}</div>` : ""}
        </div>
        ${exp.dates ? `<div class="entry-date">${escapeHtml(exp.dates)}</div>` : ""}
      </div>
      ${exp.description.length > 0 ? `<ul class="entry-bullets">${exp.description.map(d => `<li>${escapeHtml(d)}</li>`).join("")}</ul>` : ""}
    </div>`).join("")}
  </div>` : ""}

  ${education.length > 0 ? `
  <div class="section">
    <div class="section-title">Education</div>
    ${education.map(edu => `
    <div class="entry">
      <div class="entry-header">
        <div>
          <div class="entry-title">${escapeHtml(edu.degree)}</div>
          ${edu.institution ? `<div class="entry-subtitle">${escapeHtml(edu.institution)}</div>` : ""}
        </div>
        ${edu.dates ? `<div class="entry-date">${escapeHtml(edu.dates)}</div>` : ""}
      </div>
    </div>`).join("")}
  </div>` : ""}

  ${skills.length > 0 ? `
  <div class="section">
    <div class="section-title">Skills</div>
    <div class="skills-row">${skills.map(s => `<span class="skill">${escapeHtml(s)}</span>`).join("")}</div>
  </div>` : ""}

  ${projects && projects.length > 0 ? `
  <div class="section">
    <div class="section-title">Projects</div>
    ${projects.map(p => `
    <div class="entry">
      <div class="entry-header">
        <div class="entry-title">${escapeHtml(p.name)}</div>
        ${p.duration ? `<div class="entry-date">${escapeHtml(p.duration)}</div>` : ""}
      </div>
      <div class="project-desc">${escapeHtml(p.description)}</div>
    </div>`).join("")}
  </div>` : ""}

  ${certifications && certifications.length > 0 ? `
  <div class="section">
    <div class="section-title">Certifications</div>
    <ul class="entry-bullets">${certifications.map(c => `<li>${escapeHtml(c)}</li>`).join("")}</ul>
  </div>` : ""}

  ${languages && languages.length > 0 ? `
  <div class="section">
    <div class="section-title">Languages</div>
    <div class="skills-row">${languages.map(l => `<span class="skill">${escapeHtml(l)}</span>`).join("")}</div>
  </div>` : ""}
</div>
</body>
</html>`;
}

function renderModern(
  parsed: ParsedResume,
  template: ResumeTemplate,
  formatData?: FormattingData | null,
): string {
  const { header, professionalTitle, summary, experience, education, skills, projects, languages, certifications } = parsed;
  const accent = template.accentColor;
  const font = formatData?.font_family || template.fontFamily;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Resume - ${escapeHtml(header.name || "Resume")}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:${font};line-height:1.55;color:#1f2937;background:#fff;-webkit-font-smoothing:antialiased}
.page{max-width:800px;margin:0 auto;padding:48px 56px}
.header{padding-bottom:20px;margin-bottom:24px;border-bottom:3px solid ${accent}}
.name{font-size:32px;font-weight:700;color:#111827;letter-spacing:-0.5px}
.title{font-size:16px;color:${accent};margin-top:2px;font-weight:600}
.contact{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:10px;font-size:12.5px;color:#6b7280}
.contact a{color:${accent};text-decoration:none}
.section{margin-top:26px}
.section-title{font-size:13px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:1.5px;padding-left:12px;border-left:3px solid ${accent};margin-bottom:14px}
.summary{font-size:13.5px;color:#374151;line-height:1.7}
.summary p{margin-bottom:8px}
.entry{margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid #f3f4f6}
.entry:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.entry-title{font-size:14.5px;font-weight:600;color:#111827}
.entry-subtitle{font-size:13px;color:#6b7280;font-weight:500;margin-top:1px}
.entry-date{font-size:12px;color:#9ca3af;white-space:nowrap;font-weight:500}
.entry-bullets{margin-top:8px;padding-left:16px}
.entry-bullets li{font-size:13px;color:#4b5563;margin-bottom:4px;line-height:1.6}
.entry-bullets li::marker{color:${accent}}
.skills-row{display:flex;flex-wrap:wrap;gap:6px}
.skill{font-size:12px;padding:5px 12px;background:${accent}12;border:1px solid ${accent}30;border-radius:20px;color:${accent};font-weight:500}
.project-desc{font-size:13px;color:#4b5563;margin-top:3px;line-height:1.6}
@media print{.page{padding:32px 40px}.section{margin-top:20px}}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="name">${escapeHtml(header.name || "Your Name")}</div>
    ${professionalTitle ? `<div class="title">${escapeHtml(professionalTitle)}</div>` : ""}
    <div class="contact">
      ${header.email ? `<span>${escapeHtml(header.email)}</span>` : ""}
      ${header.phone ? `<span>${escapeHtml(header.phone)}</span>` : ""}
      ${header.location ? `<span>${escapeHtml(header.location)}</span>` : ""}
      ${header.linkedin ? `<a href="${escapeHtml(header.linkedin)}">${escapeHtml(header.linkedin.replace(/^https?:\/\//, ""))}</a>` : ""}
    </div>
  </div>

  ${summary ? `
  <div class="section">
    <div class="section-title">Summary</div>
    <div class="summary"><p>${formatSummary(summary)}</p></div>
  </div>` : ""}

  ${experience.length > 0 ? `
  <div class="section">
    <div class="section-title">Experience</div>
    ${experience.map(exp => `
    <div class="entry">
      <div class="entry-header">
        <div>
          <div class="entry-title">${escapeHtml(exp.title)}</div>
          ${exp.company ? `<div class="entry-subtitle">${escapeHtml(exp.company)}</div>` : ""}
        </div>
        ${exp.dates ? `<div class="entry-date">${escapeHtml(exp.dates)}</div>` : ""}
      </div>
      ${exp.description.length > 0 ? `<ul class="entry-bullets">${exp.description.map(d => `<li>${escapeHtml(d)}</li>`).join("")}</ul>` : ""}
    </div>`).join("")}
  </div>` : ""}

  ${education.length > 0 ? `
  <div class="section">
    <div class="section-title">Education</div>
    ${education.map(edu => `
    <div class="entry">
      <div class="entry-header">
        <div>
          <div class="entry-title">${escapeHtml(edu.degree)}</div>
          ${edu.institution ? `<div class="entry-subtitle">${escapeHtml(edu.institution)}</div>` : ""}
        </div>
        ${edu.dates ? `<div class="entry-date">${escapeHtml(edu.dates)}</div>` : ""}
      </div>
    </div>`).join("")}
  </div>` : ""}

  ${skills.length > 0 ? `
  <div class="section">
    <div class="section-title">Skills</div>
    <div class="skills-row">${skills.map(s => `<span class="skill">${escapeHtml(s)}</span>`).join("")}</div>
  </div>` : ""}

  ${projects && projects.length > 0 ? `
  <div class="section">
    <div class="section-title">Projects</div>
    ${projects.map(p => `
    <div class="entry">
      <div class="entry-header">
        <div class="entry-title">${escapeHtml(p.name)}</div>
        ${p.duration ? `<div class="entry-date">${escapeHtml(p.duration)}</div>` : ""}
      </div>
      <div class="project-desc">${escapeHtml(p.description)}</div>
    </div>`).join("")}
  </div>` : ""}

  ${certifications && certifications.length > 0 ? `
  <div class="section">
    <div class="section-title">Certifications</div>
    <ul class="entry-bullets">${certifications.map(c => `<li>${escapeHtml(c)}</li>`).join("")}</ul>
  </div>` : ""}

  ${languages && languages.length > 0 ? `
  <div class="section">
    <div class="section-title">Languages</div>
    <div class="skills-row">${languages.map(l => `<span class="skill">${escapeHtml(l)}</span>`).join("")}</div>
  </div>` : ""}
</div>
</body>
</html>`;
}

function renderExecutive(
  parsed: ParsedResume,
  template: ResumeTemplate,
  formatData?: FormattingData | null,
): string {
  const { header, professionalTitle, summary, experience, education, skills, projects, languages, certifications } = parsed;
  const accent = template.accentColor;
  const font = formatData?.font_family || template.fontFamily;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Resume - ${escapeHtml(header.name || "Resume")}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:${font};line-height:1.6;color:#1f2937;background:#fff;-webkit-font-smoothing:antialiased}
.page{max-width:800px;margin:0 auto;padding:56px 60px}
.header{text-align:center;padding-bottom:28px}
.name{font-family:'Playfair Display',Georgia,serif;font-size:30px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:3px}
.title{font-size:14px;color:#6b7280;margin-top:6px;font-weight:500;letter-spacing:1px}
.divider{width:60px;height:2px;background:${accent};margin:14px auto 0}
.contact{display:flex;justify-content:center;flex-wrap:wrap;gap:4px 20px;margin-top:16px;font-size:12px;color:#9ca3af;letter-spacing:0.5px}
.contact a{color:#6b7280;text-decoration:none}
.section{margin-top:32px}
.section-title{font-family:'Playfair Display',Georgia,serif;font-size:15px;font-weight:600;color:${accent};text-align:center;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px}
.section-line{width:100%;height:1px;background:#e5e7eb;margin-bottom:18px}
.summary{font-size:13.5px;color:#4b5563;line-height:1.75;text-align:center;max-width:640px;margin:0 auto}
.summary p{margin-bottom:8px}
.entry{margin-bottom:22px}
.entry:last-child{margin-bottom:0}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.entry-title{font-size:14px;font-weight:600;color:#111827}
.entry-subtitle{font-size:13px;color:#6b7280;font-weight:400;margin-top:2px;font-style:italic}
.entry-date{font-size:12px;color:#9ca3af;white-space:nowrap}
.entry-bullets{margin-top:8px;padding-left:16px}
.entry-bullets li{font-size:13px;color:#4b5563;margin-bottom:5px;line-height:1.65}
.entry-bullets li::marker{color:${accent}}
.skills-text{font-size:13px;color:#4b5563;line-height:1.7;text-align:center}
.project-desc{font-size:13px;color:#4b5563;margin-top:3px;line-height:1.65}
@media print{.page{padding:36px 44px}.section{margin-top:26px}}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="name">${escapeHtml(header.name || "Your Name")}</div>
    ${professionalTitle ? `<div class="title">${escapeHtml(professionalTitle)}</div>` : ""}
    <div class="divider"></div>
    <div class="contact">
      ${header.email ? `<span>${escapeHtml(header.email)}</span>` : ""}
      ${header.phone ? `<span>${escapeHtml(header.phone)}</span>` : ""}
      ${header.location ? `<span>${escapeHtml(header.location)}</span>` : ""}
      ${header.linkedin ? `<a href="${escapeHtml(header.linkedin)}">${escapeHtml(header.linkedin.replace(/^https?:\/\//, ""))}</a>` : ""}
    </div>
  </div>

  ${summary ? `
  <div class="section">
    <div class="section-title">Profile</div>
    <div class="section-line"></div>
    <div class="summary"><p>${formatSummary(summary)}</p></div>
  </div>` : ""}

  ${experience.length > 0 ? `
  <div class="section">
    <div class="section-title">Experience</div>
    <div class="section-line"></div>
    ${experience.map(exp => `
    <div class="entry">
      <div class="entry-header">
        <div>
          <div class="entry-title">${escapeHtml(exp.title)}</div>
          ${exp.company ? `<div class="entry-subtitle">${escapeHtml(exp.company)}</div>` : ""}
        </div>
        ${exp.dates ? `<div class="entry-date">${escapeHtml(exp.dates)}</div>` : ""}
      </div>
      ${exp.description.length > 0 ? `<ul class="entry-bullets">${exp.description.map(d => `<li>${escapeHtml(d)}</li>`).join("")}</ul>` : ""}
    </div>`).join("")}
  </div>` : ""}

  ${education.length > 0 ? `
  <div class="section">
    <div class="section-title">Education</div>
    <div class="section-line"></div>
    ${education.map(edu => `
    <div class="entry">
      <div class="entry-header">
        <div>
          <div class="entry-title">${escapeHtml(edu.degree)}</div>
          ${edu.institution ? `<div class="entry-subtitle">${escapeHtml(edu.institution)}</div>` : ""}
        </div>
        ${edu.dates ? `<div class="entry-date">${escapeHtml(edu.dates)}</div>` : ""}
      </div>
    </div>`).join("")}
  </div>` : ""}

  ${skills.length > 0 ? `
  <div class="section">
    <div class="section-title">Core Competencies</div>
    <div class="section-line"></div>
    <div class="skills-text">${skills.map(s => escapeHtml(s)).join("  &middot;  ")}</div>
  </div>` : ""}

  ${projects && projects.length > 0 ? `
  <div class="section">
    <div class="section-title">Projects</div>
    <div class="section-line"></div>
    ${projects.map(p => `
    <div class="entry">
      <div class="entry-header">
        <div class="entry-title">${escapeHtml(p.name)}</div>
        ${p.duration ? `<div class="entry-date">${escapeHtml(p.duration)}</div>` : ""}
      </div>
      <div class="project-desc">${escapeHtml(p.description)}</div>
    </div>`).join("")}
  </div>` : ""}

  ${certifications && certifications.length > 0 ? `
  <div class="section">
    <div class="section-title">Certifications</div>
    <div class="section-line"></div>
    <div class="skills-text">${certifications.map(c => escapeHtml(c)).join("  &middot;  ")}</div>
  </div>` : ""}

  ${languages && languages.length > 0 ? `
  <div class="section">
    <div class="section-title">Languages</div>
    <div class="section-line"></div>
    <div class="skills-text">${languages.map(l => escapeHtml(l)).join("  &middot;  ")}</div>
  </div>` : ""}
</div>
</body>
</html>`;
}

function renderMinimal(
  parsed: ParsedResume,
  template: ResumeTemplate,
  formatData?: FormattingData | null,
): string {
  const { header, professionalTitle, summary, experience, education, skills, projects, languages, certifications } = parsed;
  const font = formatData?.font_family || template.fontFamily;
  // Minimal stays near-monochrome, but the theme accent is applied sparingly (name,
  // section rule, list markers, links) so its theme variants are actually distinct
  // from one another instead of rendering identically.
  const accent = template.accentColor;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Resume - ${escapeHtml(header.name || "Resume")}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:${font};line-height:1.55;color:#111827;background:#fff;-webkit-font-smoothing:antialiased}
.page{max-width:780px;margin:0 auto;padding:48px 52px}
.header{padding-bottom:16px;border-bottom:2px solid ${accent}}
.name{font-size:24px;font-weight:700;color:${accent}}
.title{font-size:14px;color:#6b7280;margin-top:2px}
.contact{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:8px;font-size:12px;color:#9ca3af}
.contact a{color:${accent};text-decoration:none}
.section{margin-top:22px;padding-top:22px;border-top:1px solid #e5e7eb}
.section:first-of-type{border-top:none;padding-top:0;margin-top:20px}
.section-title{font-size:12px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px}
.summary{font-size:13px;color:#374151;line-height:1.7}
.summary p{margin-bottom:6px}
.entry{margin-bottom:14px}
.entry:last-child{margin-bottom:0}
.entry-row{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.entry-title{font-size:13.5px;font-weight:600;color:#111827}
.entry-subtitle{font-size:12.5px;color:#6b7280;margin-top:1px}
.entry-date{font-size:11.5px;color:#9ca3af;white-space:nowrap}
.entry-bullets{margin-top:4px;padding-left:14px}
.entry-bullets li{font-size:12.5px;color:#374151;margin-bottom:3px;line-height:1.6}
.entry-bullets li::marker{color:${accent}}
.skills-text{font-size:13px;color:#374151;line-height:1.8}
.project-desc{font-size:12.5px;color:#374151;margin-top:2px;line-height:1.6}
@media print{.page{padding:28px 36px}.section{margin-top:16px;padding-top:16px}}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="name">${escapeHtml(header.name || "Your Name")}</div>
    ${professionalTitle ? `<div class="title">${escapeHtml(professionalTitle)}</div>` : ""}
    <div class="contact">
      ${header.email ? `<span>${escapeHtml(header.email)}</span>` : ""}
      ${header.phone ? `<span>${escapeHtml(header.phone)}</span>` : ""}
      ${header.location ? `<span>${escapeHtml(header.location)}</span>` : ""}
      ${header.linkedin ? `<a href="${escapeHtml(header.linkedin)}">${escapeHtml(header.linkedin.replace(/^https?:\/\//, ""))}</a>` : ""}
    </div>
  </div>

  ${summary ? `
  <div class="section">
    <div class="section-title">Summary</div>
    <div class="summary"><p>${formatSummary(summary)}</p></div>
  </div>` : ""}

  ${experience.length > 0 ? `
  <div class="section">
    <div class="section-title">Experience</div>
    ${experience.map(exp => `
    <div class="entry">
      <div class="entry-row">
        <div>
          <div class="entry-title">${escapeHtml(exp.title)}</div>
          ${exp.company ? `<div class="entry-subtitle">${escapeHtml(exp.company)}</div>` : ""}
        </div>
        ${exp.dates ? `<div class="entry-date">${escapeHtml(exp.dates)}</div>` : ""}
      </div>
      ${exp.description.length > 0 ? `<ul class="entry-bullets">${exp.description.map(d => `<li>${escapeHtml(d)}</li>`).join("")}</ul>` : ""}
    </div>`).join("")}
  </div>` : ""}

  ${education.length > 0 ? `
  <div class="section">
    <div class="section-title">Education</div>
    ${education.map(edu => `
    <div class="entry">
      <div class="entry-row">
        <div>
          <div class="entry-title">${escapeHtml(edu.degree)}</div>
          ${edu.institution ? `<div class="entry-subtitle">${escapeHtml(edu.institution)}</div>` : ""}
        </div>
        ${edu.dates ? `<div class="entry-date">${escapeHtml(edu.dates)}</div>` : ""}
      </div>
    </div>`).join("")}
  </div>` : ""}

  ${skills.length > 0 ? `
  <div class="section">
    <div class="section-title">Skills</div>
    <div class="skills-text">${skills.map(s => escapeHtml(s)).join(", ")}</div>
  </div>` : ""}

  ${projects && projects.length > 0 ? `
  <div class="section">
    <div class="section-title">Projects</div>
    ${projects.map(p => `
    <div class="entry">
      <div class="entry-row">
        <div class="entry-title">${escapeHtml(p.name)}</div>
        ${p.duration ? `<div class="entry-date">${escapeHtml(p.duration)}</div>` : ""}
      </div>
      <div class="project-desc">${escapeHtml(p.description)}</div>
    </div>`).join("")}
  </div>` : ""}

  ${certifications && certifications.length > 0 ? `
  <div class="section">
    <div class="section-title">Certifications</div>
    <div class="skills-text">${certifications.map(c => escapeHtml(c)).join(", ")}</div>
  </div>` : ""}

  ${languages && languages.length > 0 ? `
  <div class="section">
    <div class="section-title">Languages</div>
    <div class="skills-text">${languages.map(l => escapeHtml(l)).join(", ")}</div>
  </div>` : ""}
</div>
</body>
</html>`;
}
