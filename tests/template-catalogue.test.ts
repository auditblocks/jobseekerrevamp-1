/**
 * Guards the resume template catalogue (layout × theme matrix).
 *
 * The duplicate-output check exists because `minimal` originally ignored
 * `accentColor` entirely, which silently produced six byte-identical templates —
 * the kind of regression that's invisible in a type check and easy to reintroduce
 * when adding a layout.
 */
import { describe, it, expect } from "vitest";
import { TEMPLATES } from "@/components/resume/templates/templateRegistry";
import { generateTemplateHTML } from "@/components/resume/templates/templateRenderers";
import { StructuredResumeData } from "@/types/resume";

const sample: StructuredResumeData = {
  personalInfo: {
    name: "Asha Rao",
    email: "asha@example.com",
    phone: "+91 90000 00000",
    location: "Bengaluru",
    linkedin: "https://linkedin.com/in/asha",
  },
  professionalTitle: "Senior Data Engineer",
  summary: "Data engineer with 8 years building pipelines. Led migration to Spark. Cut costs 30%.",
  workExperience: [
    {
      jobTitle: "Senior Data Engineer",
      company: "Acme",
      startDate: "2021",
      endDate: "Present",
      current: true,
      description: ["Built ETL pipeline processing 2TB/day", "Reduced query latency by 45%"],
    },
  ],
  education: [{ degree: "B.Tech Computer Science", institution: "IIT Madras", graduationDate: "2016" }],
  skills: ["Python", "Spark", "Airflow"],
  projects: [{ name: "Realtime Dashboard", description: "Streaming analytics on Kafka" }],
  certifications: ["AWS Solutions Architect"],
  languages: ["English", "Hindi"],
};

const render = (t: (typeof TEMPLATES)[number]) => generateTemplateHTML(t, "", null, sample, null);

describe("resume template catalogue", () => {
  it("offers at least 50 templates with unique ids", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(50);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
  });

  it("renders every template with the resume's real content", () => {
    for (const t of TEMPLATES) {
      const html = render(t);
      expect(html, `${t.id}: name`).toContain("Asha Rao");
      expect(html, `${t.id}: title`).toContain("Senior Data Engineer");
      expect(html, `${t.id}: experience bullet`).toContain("Built ETL pipeline processing 2TB/day");
      expect(html, `${t.id}: education`).toContain("IIT Madras");
      expect(html, `${t.id}: skills`).toContain("Airflow");
      expect(html, `${t.id}: accent colour applied`).toContain(t.accentColor);
    }
  });

  it("produces visually distinct output for every theme variant", () => {
    const byHtml = new Map<string, string[]>();
    for (const t of TEMPLATES) {
      const html = render(t);
      byHtml.set(html, [...(byHtml.get(html) || []), t.id]);
    }
    const duplicates = [...byHtml.values()].filter((ids) => ids.length > 1);
    expect(duplicates, `identical templates: ${duplicates.map((d) => d.join(" == ")).join(" | ")}`).toEqual([]);
  });
});
