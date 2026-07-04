export interface ResumeTemplate {
  id: string;
  name: string;
  style: string;
  accentColor: string;
  description: string;
  hasPhoto: boolean;
  templateType: "simple" | "creative";
}

export const TEMPLATES: ResumeTemplate[] = [
  {
    id: "professional",
    name: "Professional",
    style: "Clean corporate layout",
    accentColor: "#1a365d",
    description: "ATS-friendly single-column design trusted by top firms",
    hasPhoto: false,
    templateType: "simple",
  },
  {
    id: "modern",
    name: "Modern",
    style: "Contemporary with accent details",
    accentColor: "#0f766e",
    description: "Fresh, modern layout with teal accents and clean typography",
    hasPhoto: false,
    templateType: "simple",
  },
  {
    id: "executive",
    name: "Executive",
    style: "Sophisticated serif design",
    accentColor: "#1e293b",
    description: "Elegant layout with refined typography for senior roles",
    hasPhoto: false,
    templateType: "simple",
  },
  {
    id: "minimal",
    name: "Minimal",
    style: "Ultra-clean monochrome",
    accentColor: "#111827",
    description: "Maximum clarity with zero visual clutter",
    hasPhoto: false,
    templateType: "simple",
  },
  {
    id: "creative",
    name: "Creative",
    style: "Two-column sidebar layout",
    accentColor: "#334155",
    description: "Modern sidebar design with photo and visual structure",
    hasPhoto: true,
    templateType: "creative",
  },
  {
    id: "elegant",
    name: "Elegant",
    style: "Refined two-column design",
    accentColor: "#1e293b",
    description: "Sophisticated dark sidebar with serif accents",
    hasPhoto: true,
    templateType: "creative",
  },
];
