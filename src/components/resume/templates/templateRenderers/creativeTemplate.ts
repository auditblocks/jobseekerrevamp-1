import { ResumeTemplate } from "../templateRegistry";
import { ParsedResume, FormattingData } from "../resumeParsing";
import { escapeHtml, formatSummary } from "./htmlUtils";

export function renderCreativeTemplate(
  parsed: ParsedResume,
  template: ResumeTemplate,
  formatData?: FormattingData | null,
  profilePhotoUrl?: string | null,
): string {
  if (template.id === "elegant") {
    return renderElegant(parsed, template, formatData, profilePhotoUrl);
  }
  return renderCreative(parsed, template, formatData, profilePhotoUrl);
}

function isValidPhoto(url: string | null | undefined): url is string {
  return Boolean(
    url &&
    typeof url === "string" &&
    url.trim().length > 0 &&
    !url.startsWith("data:;base64") &&
    !url.startsWith("data:;base64,="),
  );
}

function renderCreative(
  parsed: ParsedResume,
  template: ResumeTemplate,
  formatData?: FormattingData | null,
  profilePhotoUrl?: string | null,
): string {
  const { header, professionalTitle, summary, experience, education, skills, projects, languages, certifications } = parsed;
  const sidebar = formatData?.sidebar_color || template.accentColor;
  const font = formatData?.font_family || "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const showPhoto = template.hasPhoto && isValidPhoto(profilePhotoUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Resume - ${escapeHtml(header.name || "Resume")}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:${font};line-height:1.55;color:#1f2937;background:#f8fafc;-webkit-font-smoothing:antialiased;display:flex;justify-content:center;padding:20px}
.resume{max-width:960px;width:100%;display:flex;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.08),0 8px 24px rgba(0,0,0,0.06);min-height:800px}
.sidebar{width:260px;background:${sidebar};color:#fff;padding:36px 24px;flex-shrink:0;display:flex;flex-direction:column}
.main{flex:1;padding:36px 40px}
.photo{width:120px;height:120px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,0.25);margin:0 auto 20px;display:block}
.sidebar .name{font-size:22px;font-weight:700;text-align:center;margin-bottom:2px}
.sidebar .title{font-size:13px;text-align:center;color:rgba(255,255,255,0.8);font-weight:400;margin-bottom:20px}
.sb-section{margin-bottom:22px}
.sb-heading{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.6);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.15)}
.sb-item{font-size:12.5px;color:rgba(255,255,255,0.9);margin-bottom:6px;line-height:1.5;word-break:break-word}
.sb-item a{color:rgba(255,255,255,0.9);text-decoration:none}
.sb-tag{display:inline-block;font-size:11px;padding:3px 8px;background:rgba(255,255,255,0.15);border-radius:3px;margin:0 4px 4px 0;color:#fff}
.section{margin-bottom:28px}
.section:last-child{margin-bottom:0}
.section-title{font-size:13px;font-weight:700;color:${sidebar};text-transform:uppercase;letter-spacing:1.5px;padding-bottom:6px;border-bottom:2px solid ${sidebar};margin-bottom:14px}
.summary{font-size:13.5px;color:#4b5563;line-height:1.7}
.summary p{margin-bottom:8px}
.entry{margin-bottom:18px}
.entry:last-child{margin-bottom:0}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.entry-title{font-size:14px;font-weight:600;color:#111827}
.entry-subtitle{font-size:13px;color:${sidebar};font-weight:500;margin-top:1px}
.entry-date{font-size:11.5px;color:#9ca3af;white-space:nowrap}
.entry-bullets{margin-top:6px;padding-left:14px}
.entry-bullets li{font-size:12.5px;color:#4b5563;margin-bottom:4px;line-height:1.6}
.entry-bullets li::marker{color:${sidebar}}
.project-desc{font-size:12.5px;color:#4b5563;margin-top:3px;line-height:1.6}
@media print{body{padding:0;background:#fff}.resume{box-shadow:none}.sidebar{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head>
<body>
<div class="resume">
  <div class="sidebar">
    ${showPhoto ? `<img src="${escapeHtml(profilePhotoUrl!)}" alt="${escapeHtml(header.name)}" class="photo">` : ""}
    <div class="name">${escapeHtml(header.name || "Your Name")}</div>
    ${professionalTitle ? `<div class="title">${escapeHtml(professionalTitle)}</div>` : ""}

    <div class="sb-section">
      <div class="sb-heading">Contact</div>
      ${header.email ? `<div class="sb-item">${escapeHtml(header.email)}</div>` : ""}
      ${header.phone ? `<div class="sb-item">${escapeHtml(header.phone)}</div>` : ""}
      ${header.location ? `<div class="sb-item">${escapeHtml(header.location)}</div>` : ""}
      ${header.linkedin ? `<div class="sb-item"><a href="${escapeHtml(header.linkedin)}">${escapeHtml(header.linkedin.replace(/^https?:\/\//, ""))}</a></div>` : ""}
    </div>

    ${skills.length > 0 ? `
    <div class="sb-section">
      <div class="sb-heading">Skills</div>
      <div>${skills.map(s => `<span class="sb-tag">${escapeHtml(s)}</span>`).join("")}</div>
    </div>` : ""}

    ${languages && languages.length > 0 ? `
    <div class="sb-section">
      <div class="sb-heading">Languages</div>
      ${languages.map(l => `<div class="sb-item">${escapeHtml(l)}</div>`).join("")}
    </div>` : ""}

    ${certifications && certifications.length > 0 ? `
    <div class="sb-section">
      <div class="sb-heading">Certifications</div>
      ${certifications.map(c => `<div class="sb-item">${escapeHtml(c)}</div>`).join("")}
    </div>` : ""}
  </div>

  <div class="main">
    ${summary ? `
    <div class="section">
      <div class="section-title">Profile</div>
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
  </div>
</div>
</body>
</html>`;
}

function renderElegant(
  parsed: ParsedResume,
  template: ResumeTemplate,
  formatData?: FormattingData | null,
  profilePhotoUrl?: string | null,
): string {
  const { header, professionalTitle, summary, experience, education, skills, projects, languages, certifications } = parsed;
  const sidebar = formatData?.sidebar_color || template.accentColor;
  const font = formatData?.font_family || "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const showPhoto = template.hasPhoto && isValidPhoto(profilePhotoUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Resume - ${escapeHtml(header.name || "Resume")}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:${font};line-height:1.55;color:#1f2937;background:#f8fafc;-webkit-font-smoothing:antialiased;display:flex;justify-content:center;padding:20px}
.resume{max-width:960px;width:100%;display:flex;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.08),0 8px 24px rgba(0,0,0,0.06);min-height:800px}
.sidebar{width:280px;background:${sidebar};color:#fff;padding:40px 28px;flex-shrink:0;display:flex;flex-direction:column}
.main{flex:1;padding:40px 44px}
.photo{width:130px;height:130px;border-radius:50%;object-fit:cover;border:4px solid rgba(255,255,255,0.2);margin:0 auto 22px;display:block;box-shadow:0 4px 12px rgba(0,0,0,0.15)}
.sidebar .name{font-family:'Playfair Display',Georgia,serif;font-size:24px;font-weight:700;text-align:center;margin-bottom:2px;letter-spacing:0.5px}
.sidebar .title{font-size:12px;text-align:center;color:rgba(255,255,255,0.7);font-weight:400;letter-spacing:1px;text-transform:uppercase;margin-bottom:24px}
.sb-divider{width:40px;height:1px;background:rgba(255,255,255,0.2);margin:0 auto 24px}
.sb-section{margin-bottom:24px}
.sb-heading{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.5);margin-bottom:10px}
.sb-item{font-size:12.5px;color:rgba(255,255,255,0.85);margin-bottom:7px;line-height:1.5;word-break:break-word}
.sb-item a{color:rgba(255,255,255,0.85);text-decoration:none}
.sb-tag{display:inline-block;font-size:11px;padding:3px 9px;border:1px solid rgba(255,255,255,0.2);border-radius:2px;margin:0 4px 5px 0;color:rgba(255,255,255,0.9)}
.section{margin-bottom:30px}
.section:last-child{margin-bottom:0}
.section-title{font-family:'Playfair Display',Georgia,serif;font-size:16px;font-weight:600;color:${sidebar};letter-spacing:0.5px;padding-bottom:8px;border-bottom:1px solid #e5e7eb;margin-bottom:16px}
.summary{font-size:13.5px;color:#4b5563;line-height:1.75}
.summary p{margin-bottom:8px}
.entry{margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #f3f4f6}
.entry:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.entry-title{font-size:14px;font-weight:600;color:#111827}
.entry-subtitle{font-size:13px;color:#6b7280;font-weight:400;margin-top:2px;font-style:italic}
.entry-date{font-size:11.5px;color:#9ca3af;white-space:nowrap}
.entry-bullets{margin-top:6px;padding-left:14px}
.entry-bullets li{font-size:12.5px;color:#4b5563;margin-bottom:4px;line-height:1.65}
.entry-bullets li::marker{color:${sidebar}}
.project-desc{font-size:12.5px;color:#4b5563;margin-top:3px;line-height:1.65}
@media print{body{padding:0;background:#fff}.resume{box-shadow:none}.sidebar{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head>
<body>
<div class="resume">
  <div class="sidebar">
    ${showPhoto ? `<img src="${escapeHtml(profilePhotoUrl!)}" alt="${escapeHtml(header.name)}" class="photo">` : ""}
    <div class="name">${escapeHtml(header.name || "Your Name")}</div>
    ${professionalTitle ? `<div class="title">${escapeHtml(professionalTitle)}</div>` : ""}
    <div class="sb-divider"></div>

    <div class="sb-section">
      <div class="sb-heading">Contact</div>
      ${header.email ? `<div class="sb-item">${escapeHtml(header.email)}</div>` : ""}
      ${header.phone ? `<div class="sb-item">${escapeHtml(header.phone)}</div>` : ""}
      ${header.location ? `<div class="sb-item">${escapeHtml(header.location)}</div>` : ""}
      ${header.linkedin ? `<div class="sb-item"><a href="${escapeHtml(header.linkedin)}">${escapeHtml(header.linkedin.replace(/^https?:\/\//, ""))}</a></div>` : ""}
    </div>

    ${skills.length > 0 ? `
    <div class="sb-section">
      <div class="sb-heading">Expertise</div>
      <div>${skills.map(s => `<span class="sb-tag">${escapeHtml(s)}</span>`).join("")}</div>
    </div>` : ""}

    ${languages && languages.length > 0 ? `
    <div class="sb-section">
      <div class="sb-heading">Languages</div>
      ${languages.map(l => `<div class="sb-item">${escapeHtml(l)}</div>`).join("")}
    </div>` : ""}

    ${certifications && certifications.length > 0 ? `
    <div class="sb-section">
      <div class="sb-heading">Certifications</div>
      ${certifications.map(c => `<div class="sb-item">${escapeHtml(c)}</div>`).join("")}
    </div>` : ""}
  </div>

  <div class="main">
    ${summary ? `
    <div class="section">
      <div class="section-title">Profile Summary</div>
      <div class="summary"><p>${formatSummary(summary)}</p></div>
    </div>` : ""}

    ${experience.length > 0 ? `
    <div class="section">
      <div class="section-title">Professional Experience</div>
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
  </div>
</div>
</body>
</html>`;
}
