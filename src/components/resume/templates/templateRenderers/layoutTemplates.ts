/**
 * @fileoverview Renderers for the single-column layouts added alongside the original
 * four (professional / modern / executive / minimal): compact, timeline, header band
 * and academic.
 *
 * Each renderer emits a complete standalone HTML document and takes its palette and
 * typeface from the template's theme, so one layout serves every colour variant in
 * the catalogue. All four keep a linear DOM order matching visual reading order and
 * use real text throughout, so they remain ATS-parseable.
 */

import { ResumeTemplate } from "../templateRegistry";
import { ParsedResume, FormattingData } from "../resumeParsing";
import { escapeHtml, formatSummary } from "./htmlUtils";

/** Shared <head> block — theme font is requested from Google Fonts when it's a web font. */
function documentHead(name: string, font: string): string {
  return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Resume - ${escapeHtml(name || "Resume")}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">`;
}

/** Contact line shared across layouts; omits any field the user hasn't provided. */
function contactParts(header: ParsedResume["header"]): string[] {
  const parts: string[] = [];
  if (header.email) parts.push(escapeHtml(header.email));
  if (header.phone) parts.push(escapeHtml(header.phone));
  if (header.location) parts.push(escapeHtml(header.location));
  if (header.linkedin) parts.push(escapeHtml(header.linkedin.replace(/^https?:\/\//, "")));
  return parts;
}

function resolveFont(template: ResumeTemplate, formatData?: FormattingData | null): string {
  return formatData?.font_family || template.fontFamily;
}

/* ------------------------------------------------------------------ */
/* Compact — dense single page for long careers                        */
/* ------------------------------------------------------------------ */

export function renderCompact(
  parsed: ParsedResume,
  template: ResumeTemplate,
  formatData?: FormattingData | null,
): string {
  const { header, professionalTitle, summary, experience, education, skills, projects, languages, certifications } = parsed;
  const accent = template.accentColor;
  const font = resolveFont(template, formatData);

  return `<!DOCTYPE html>
<html lang="en">
<head>
${documentHead(header.name, font)}
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:${font};line-height:1.4;color:#1f2937;background:#fff;-webkit-font-smoothing:antialiased}
.page{max-width:800px;margin:0 auto;padding:32px 40px}
.header{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;padding-bottom:10px;border-bottom:2px solid ${accent}}
.name{font-size:23px;font-weight:700;color:${accent};letter-spacing:-0.3px}
.title{font-size:12.5px;color:#4b5563;font-weight:500}
.contact{font-size:11px;color:#6b7280;text-align:right;line-height:1.6}
.section{margin-top:16px}
.section-title{font-size:10px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:1.4px;margin-bottom:7px}
.summary{font-size:12px;color:#374151;line-height:1.55}
.entry{margin-bottom:11px}
.entry:last-child{margin-bottom:0}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.entry-title{font-size:12.5px;font-weight:600;color:#111827}
.entry-sub{font-size:11.5px;color:${accent};font-weight:500}
.entry-date{font-size:10.5px;color:#9ca3af;white-space:nowrap}
.entry-bullets{margin-top:3px;padding-left:14px}
.entry-bullets li{font-size:11.5px;color:#4b5563;margin-bottom:2px;line-height:1.45}
.entry-bullets li::marker{color:${accent}}
.inline-list{font-size:11.5px;color:#374151;line-height:1.6}
@media print{.page{padding:20px 28px}.section{margin-top:12px}}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="name">${escapeHtml(header.name || "Your Name")}</div>
      ${professionalTitle ? `<div class="title">${escapeHtml(professionalTitle)}</div>` : ""}
    </div>
    <div class="contact">${contactParts(header).join("<br>")}</div>
  </div>

  ${summary ? `<div class="section"><div class="section-title">Summary</div><div class="summary">${escapeHtml(summary)}</div></div>` : ""}

  ${experience.length > 0 ? `
  <div class="section">
    <div class="section-title">Experience</div>
    ${experience.map(exp => `
    <div class="entry">
      <div class="entry-header">
        <div>
          <div class="entry-title">${escapeHtml(exp.title)}</div>
          <div class="entry-sub">${escapeHtml(exp.company)}</div>
        </div>
        <div class="entry-date">${escapeHtml(exp.dates)}</div>
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
          <div class="entry-sub">${escapeHtml(edu.institution)}</div>
        </div>
        <div class="entry-date">${escapeHtml(edu.dates)}</div>
      </div>
    </div>`).join("")}
  </div>` : ""}

  ${skills.length > 0 ? `<div class="section"><div class="section-title">Skills</div><div class="inline-list">${skills.map(s => escapeHtml(s)).join(" &middot; ")}</div></div>` : ""}

  ${projects && projects.length > 0 ? `
  <div class="section">
    <div class="section-title">Projects</div>
    ${projects.map(p => `<div class="entry"><div class="entry-title">${escapeHtml(p.name)}</div><div class="summary">${escapeHtml(p.description)}</div></div>`).join("")}
  </div>` : ""}

  ${certifications && certifications.length > 0 ? `<div class="section"><div class="section-title">Certifications</div><div class="inline-list">${certifications.map(c => escapeHtml(c)).join(" &middot; ")}</div></div>` : ""}
  ${languages && languages.length > 0 ? `<div class="section"><div class="section-title">Languages</div><div class="inline-list">${languages.map(l => escapeHtml(l)).join(" &middot; ")}</div></div>` : ""}
</div>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* Timeline — experience plotted against a vertical rail               */
/* ------------------------------------------------------------------ */

export function renderTimeline(
  parsed: ParsedResume,
  template: ResumeTemplate,
  formatData?: FormattingData | null,
): string {
  const { header, professionalTitle, summary, experience, education, skills, projects, languages, certifications } = parsed;
  const accent = template.accentColor;
  const font = resolveFont(template, formatData);

  return `<!DOCTYPE html>
<html lang="en">
<head>
${documentHead(header.name, font)}
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:${font};line-height:1.55;color:#1f2937;background:#fff;-webkit-font-smoothing:antialiased}
.page{max-width:800px;margin:0 auto;padding:44px 52px}
.header{margin-bottom:26px}
.name{font-size:29px;font-weight:700;color:#111827;letter-spacing:-0.5px}
.title{font-size:14.5px;color:${accent};margin-top:3px;font-weight:600}
.contact{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;font-size:12px;color:#6b7280}
.section{margin-top:26px}
.section-title{font-size:11px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:2px;margin-bottom:14px}
.summary{font-size:13.5px;color:#374151;line-height:1.7}
.rail{position:relative;padding-left:22px;border-left:2px solid ${accent}22}
.rail .entry{position:relative;margin-bottom:20px}
.rail .entry:last-child{margin-bottom:0}
.rail .entry::before{content:"";position:absolute;left:-28px;top:5px;width:9px;height:9px;border-radius:50%;background:${accent};box-shadow:0 0 0 3px #fff}
.entry-date{font-size:11.5px;color:${accent};font-weight:600;text-transform:uppercase;letter-spacing:0.6px}
.entry-title{font-size:14.5px;font-weight:600;color:#111827;margin-top:2px}
.entry-sub{font-size:13px;color:#6b7280;margin-top:1px}
.entry-bullets{margin-top:7px;padding-left:16px}
.entry-bullets li{font-size:12.8px;color:#4b5563;margin-bottom:4px;line-height:1.6}
.entry-bullets li::marker{color:${accent}}
.skills-row{display:flex;flex-wrap:wrap;gap:6px}
.skill{font-size:12px;padding:4px 11px;background:${accent}0d;border:1px solid ${accent}33;border-radius:20px;color:${accent}}
.plain{font-size:13px;color:#4b5563;line-height:1.7}
@media print{.page{padding:28px 34px}}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="name">${escapeHtml(header.name || "Your Name")}</div>
    ${professionalTitle ? `<div class="title">${escapeHtml(professionalTitle)}</div>` : ""}
    <div class="contact">${contactParts(header).map(p => `<span>${p}</span>`).join("")}</div>
  </div>

  ${summary ? `<div class="section"><div class="section-title">Profile</div><div class="summary"><p>${formatSummary(summary)}</p></div></div>` : ""}

  ${experience.length > 0 ? `
  <div class="section">
    <div class="section-title">Experience</div>
    <div class="rail">
      ${experience.map(exp => `
      <div class="entry">
        <div class="entry-date">${escapeHtml(exp.dates)}</div>
        <div class="entry-title">${escapeHtml(exp.title)}</div>
        <div class="entry-sub">${escapeHtml(exp.company)}</div>
        ${exp.description.length > 0 ? `<ul class="entry-bullets">${exp.description.map(d => `<li>${escapeHtml(d)}</li>`).join("")}</ul>` : ""}
      </div>`).join("")}
    </div>
  </div>` : ""}

  ${education.length > 0 ? `
  <div class="section">
    <div class="section-title">Education</div>
    <div class="rail">
      ${education.map(edu => `
      <div class="entry">
        <div class="entry-date">${escapeHtml(edu.dates)}</div>
        <div class="entry-title">${escapeHtml(edu.degree)}</div>
        <div class="entry-sub">${escapeHtml(edu.institution)}</div>
      </div>`).join("")}
    </div>
  </div>` : ""}

  ${skills.length > 0 ? `<div class="section"><div class="section-title">Skills</div><div class="skills-row">${skills.map(s => `<span class="skill">${escapeHtml(s)}</span>`).join("")}</div></div>` : ""}

  ${projects && projects.length > 0 ? `
  <div class="section">
    <div class="section-title">Projects</div>
    ${projects.map(p => `<div style="margin-bottom:12px"><div class="entry-title">${escapeHtml(p.name)}</div><div class="plain">${escapeHtml(p.description)}</div></div>`).join("")}
  </div>` : ""}

  ${certifications && certifications.length > 0 ? `<div class="section"><div class="section-title">Certifications</div><div class="plain">${certifications.map(c => escapeHtml(c)).join(" &middot; ")}</div></div>` : ""}
  ${languages && languages.length > 0 ? `<div class="section"><div class="section-title">Languages</div><div class="plain">${languages.map(l => escapeHtml(l)).join(" &middot; ")}</div></div>` : ""}
</div>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* Header Band — full-width colour banner, clean body                  */
/* ------------------------------------------------------------------ */

export function renderHeaderBand(
  parsed: ParsedResume,
  template: ResumeTemplate,
  formatData?: FormattingData | null,
): string {
  const { header, professionalTitle, summary, experience, education, skills, projects, languages, certifications } = parsed;
  const accent = template.accentColor;
  const font = resolveFont(template, formatData);

  return `<!DOCTYPE html>
<html lang="en">
<head>
${documentHead(header.name, font)}
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:${font};line-height:1.55;color:#1f2937;background:#fff;-webkit-font-smoothing:antialiased}
.wrap{max-width:820px;margin:0 auto}
.band{background:${accent};color:#fff;padding:34px 52px}
.name{font-size:30px;font-weight:700;letter-spacing:-0.5px}
.title{font-size:14.5px;color:rgba(255,255,255,0.85);margin-top:4px;font-weight:500}
.contact{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:14px;font-size:12.5px;color:rgba(255,255,255,0.9)}
.body{padding:32px 52px}
.section{margin-bottom:26px}
.section:last-child{margin-bottom:0}
.section-title{font-size:11px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;display:flex;align-items:center;gap:10px}
.section-title::after{content:"";flex:1;height:1px;background:#e5e7eb}
.summary{font-size:13.5px;color:#374151;line-height:1.7}
.summary p{margin-bottom:8px}
.entry{margin-bottom:17px}
.entry:last-child{margin-bottom:0}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.entry-title{font-size:14px;font-weight:600;color:#111827}
.entry-sub{font-size:13px;color:${accent};font-weight:500;margin-top:1px}
.entry-date{font-size:12px;color:#9ca3af;white-space:nowrap;font-weight:500}
.entry-bullets{margin-top:6px;padding-left:16px}
.entry-bullets li{font-size:13px;color:#4b5563;margin-bottom:4px;line-height:1.6}
.entry-bullets li::marker{color:${accent}}
.skills-row{display:flex;flex-wrap:wrap;gap:6px}
.skill{font-size:12px;padding:4px 10px;background:${accent}0f;border-radius:4px;color:${accent};font-weight:500}
.plain{font-size:13px;color:#4b5563;line-height:1.7}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.band{padding:24px 34px}.body{padding:22px 34px}}
</style>
</head>
<body>
<div class="wrap">
  <div class="band">
    <div class="name">${escapeHtml(header.name || "Your Name")}</div>
    ${professionalTitle ? `<div class="title">${escapeHtml(professionalTitle)}</div>` : ""}
    <div class="contact">${contactParts(header).map(p => `<span>${p}</span>`).join("")}</div>
  </div>
  <div class="body">
    ${summary ? `<div class="section"><div class="section-title">Summary</div><div class="summary"><p>${formatSummary(summary)}</p></div></div>` : ""}

    ${experience.length > 0 ? `
    <div class="section">
      <div class="section-title">Experience</div>
      ${experience.map(exp => `
      <div class="entry">
        <div class="entry-header">
          <div>
            <div class="entry-title">${escapeHtml(exp.title)}</div>
            <div class="entry-sub">${escapeHtml(exp.company)}</div>
          </div>
          <div class="entry-date">${escapeHtml(exp.dates)}</div>
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
            <div class="entry-sub">${escapeHtml(edu.institution)}</div>
          </div>
          <div class="entry-date">${escapeHtml(edu.dates)}</div>
        </div>
      </div>`).join("")}
    </div>` : ""}

    ${skills.length > 0 ? `<div class="section"><div class="section-title">Skills</div><div class="skills-row">${skills.map(s => `<span class="skill">${escapeHtml(s)}</span>`).join("")}</div></div>` : ""}

    ${projects && projects.length > 0 ? `
    <div class="section">
      <div class="section-title">Projects</div>
      ${projects.map(p => `<div class="entry"><div class="entry-title">${escapeHtml(p.name)}</div><div class="plain">${escapeHtml(p.description)}</div></div>`).join("")}
    </div>` : ""}

    ${certifications && certifications.length > 0 ? `<div class="section"><div class="section-title">Certifications</div><div class="plain">${certifications.map(c => escapeHtml(c)).join(" &middot; ")}</div></div>` : ""}
    ${languages && languages.length > 0 ? `<div class="section"><div class="section-title">Languages</div><div class="plain">${languages.map(l => escapeHtml(l)).join(" &middot; ")}</div></div>` : ""}
  </div>
</div>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* Academic — serif CV for research / teaching                         */
/* ------------------------------------------------------------------ */

export function renderAcademic(
  parsed: ParsedResume,
  template: ResumeTemplate,
  formatData?: FormattingData | null,
): string {
  const { header, professionalTitle, summary, experience, education, skills, projects, languages, certifications } = parsed;
  const accent = template.accentColor;
  // Academic CVs read as serif regardless of theme font, unless the source resume said otherwise.
  const font = formatData?.font_family || "'Georgia', 'Times New Roman', serif";

  return `<!DOCTYPE html>
<html lang="en">
<head>
${documentHead(header.name, font)}
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:${font};line-height:1.6;color:#1f2937;background:#fff;-webkit-font-smoothing:antialiased}
.page{max-width:780px;margin:0 auto;padding:52px 60px}
.header{text-align:center;padding-bottom:16px;border-bottom:1px solid #d1d5db}
.name{font-size:27px;font-weight:700;color:#111827;letter-spacing:0.3px}
.title{font-size:14px;color:${accent};margin-top:5px;font-style:italic}
.contact{margin-top:10px;font-size:12.5px;color:#6b7280;line-height:1.7}
.section{margin-top:26px}
.section-title{font-size:13px;font-weight:700;color:${accent};letter-spacing:0.5px;padding-bottom:5px;border-bottom:1px solid #e5e7eb;margin-bottom:12px;font-variant:small-caps}
.summary{font-size:13.5px;color:#374151;line-height:1.75;text-align:justify}
.entry{margin-bottom:16px}
.entry:last-child{margin-bottom:0}
.entry-line{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.entry-title{font-size:14px;font-weight:700;color:#111827}
.entry-sub{font-size:13px;color:#4b5563;font-style:italic;margin-top:1px}
.entry-date{font-size:12.5px;color:#6b7280;white-space:nowrap}
.entry-bullets{margin-top:6px;padding-left:20px}
.entry-bullets li{font-size:13px;color:#4b5563;margin-bottom:4px;line-height:1.65}
.plain{font-size:13px;color:#4b5563;line-height:1.75}
@media print{.page{padding:32px 40px}}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="name">${escapeHtml(header.name || "Your Name")}</div>
    ${professionalTitle ? `<div class="title">${escapeHtml(professionalTitle)}</div>` : ""}
    <div class="contact">${contactParts(header).join(" &bull; ")}</div>
  </div>

  ${summary ? `<div class="section"><div class="section-title">Research Profile</div><div class="summary">${escapeHtml(summary)}</div></div>` : ""}

  ${education.length > 0 ? `
  <div class="section">
    <div class="section-title">Education</div>
    ${education.map(edu => `
    <div class="entry">
      <div class="entry-line">
        <div>
          <div class="entry-title">${escapeHtml(edu.degree)}</div>
          <div class="entry-sub">${escapeHtml(edu.institution)}</div>
        </div>
        <div class="entry-date">${escapeHtml(edu.dates)}</div>
      </div>
    </div>`).join("")}
  </div>` : ""}

  ${experience.length > 0 ? `
  <div class="section">
    <div class="section-title">Appointments &amp; Experience</div>
    ${experience.map(exp => `
    <div class="entry">
      <div class="entry-line">
        <div>
          <div class="entry-title">${escapeHtml(exp.title)}</div>
          <div class="entry-sub">${escapeHtml(exp.company)}</div>
        </div>
        <div class="entry-date">${escapeHtml(exp.dates)}</div>
      </div>
      ${exp.description.length > 0 ? `<ul class="entry-bullets">${exp.description.map(d => `<li>${escapeHtml(d)}</li>`).join("")}</ul>` : ""}
    </div>`).join("")}
  </div>` : ""}

  ${projects && projects.length > 0 ? `
  <div class="section">
    <div class="section-title">Projects &amp; Publications</div>
    ${projects.map(p => `<div class="entry"><div class="entry-title">${escapeHtml(p.name)}</div><div class="plain">${escapeHtml(p.description)}</div></div>`).join("")}
  </div>` : ""}

  ${skills.length > 0 ? `<div class="section"><div class="section-title">Skills &amp; Methods</div><div class="plain">${skills.map(s => escapeHtml(s)).join(", ")}</div></div>` : ""}
  ${certifications && certifications.length > 0 ? `<div class="section"><div class="section-title">Certifications</div><div class="plain">${certifications.map(c => escapeHtml(c)).join(", ")}</div></div>` : ""}
  ${languages && languages.length > 0 ? `<div class="section"><div class="section-title">Languages</div><div class="plain">${languages.map(l => escapeHtml(l)).join(", ")}</div></div>` : ""}
</div>
</body>
</html>`;
}
