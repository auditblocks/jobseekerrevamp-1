/**
 * @fileoverview Resume template metadata registry.
 * Defines the available templates (simple ATS-friendly single-column,
 * and creative two-column sidebar layouts) rendered by templateRenderers/.
 */

/** Metadata for a single resume template variant. */
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
  {
    id: "simple-executive",
    name: "Simple Executive",
    style: "Single-column with bold section headers",
    accentColor: "#1E3A5F",
    description: "Polished single-column layout with strong section dividers, ideal for senior roles",
    hasPhoto: false,
    templateType: "simple",
  },
  {
    id: "simple-compact",
    name: "Simple Compact",
    style: "Dense single-column for longer histories",
    accentColor: "#4B5563",
    description: "Space-efficient layout that fits more experience without feeling cluttered",
    hasPhoto: false,
    templateType: "simple",
  },
  {
    id: "crimson-sidebar",
    name: "Crimson Sidebar Bold",
    style: "Two-column with crimson sidebar",
    accentColor: "#B03A2E",
    description: "Bold, confident design with a deep red sidebar accent",
    hasPhoto: true,
    templateType: "creative",
  },
  {
    id: "slate-sidebar",
    name: "Slate Sidebar Refined",
    style: "Two-column with slate sidebar",
    accentColor: "#5D6D7E",
    description: "Refined, understated two-column layout with a cool slate accent",
    hasPhoto: true,
    templateType: "creative",
  },
];
