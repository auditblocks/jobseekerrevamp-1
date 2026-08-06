/**
 * @fileoverview Resume template catalogue.
 *
 * Templates are generated as a matrix of LAYOUTS × THEMES rather than hand-authored
 * one by one — this is how the large commercial resume builders reach a big library
 * without maintaining hundreds of near-duplicate HTML files.
 *
 *   - A LAYOUT defines document structure (single column, left sidebar, timeline, …)
 *     and maps to a renderer function.
 *   - A THEME defines the palette + typeface applied on top of that structure.
 *
 * Every layout is designed to stay ATS-parseable: real text (never images of text),
 * a linear DOM order that matches reading order, and standard section headings.
 * Layouts carrying a higher parsing risk (multi-column) are flagged `atsSafe: false`
 * so the gallery can warn users who are optimising purely for ATS throughput.
 *
 * Backward compatibility: the first theme of each layout keeps the original bare
 * template id (e.g. `professional`, `creative`) so previously saved selections
 * continue to resolve.
 */

export type TemplateLayoutId =
  | "professional"
  | "modern"
  | "executive"
  | "minimal"
  | "compact"
  | "timeline"
  | "headerband"
  | "academic"
  | "creative"
  | "elegant";

export type TemplateCategory = "Classic" | "Modern" | "Creative" | "Technical" | "Academic";

export interface ResumeTemplate {
  id: string;
  name: string;
  style: string;
  accentColor: string;
  description: string;
  hasPhoto: boolean;
  /** Renderer family. Retained for backwards compatibility with existing renderers. */
  templateType: "simple" | "creative";
  /** Structural layout — what the renderer actually switches on. */
  layout: TemplateLayoutId;
  /** Theme id applied over the layout. */
  theme: string;
  themeName: string;
  fontFamily: string;
  category: TemplateCategory;
  /** False for multi-column layouts, which some older ATS parsers mis-read. */
  atsSafe: boolean;
}

interface LayoutDefinition {
  id: TemplateLayoutId;
  name: string;
  style: string;
  description: string;
  templateType: "simple" | "creative";
  hasPhoto: boolean;
  category: TemplateCategory;
  atsSafe: boolean;
}

interface ThemeDefinition {
  id: string;
  name: string;
  accentColor: string;
  fontFamily: string;
}

const SANS = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const SERIF = "'Georgia', 'Times New Roman', serif";
const MONO_SANS = "'IBM Plex Sans', 'Inter', -apple-system, 'Segoe UI', sans-serif";

/** Structural layouts. Each maps to a renderer branch. */
export const LAYOUTS: LayoutDefinition[] = [
  {
    id: "professional",
    name: "Professional",
    style: "Clean corporate layout",
    description: "ATS-friendly single-column design trusted by top firms",
    templateType: "simple",
    hasPhoto: false,
    category: "Classic",
    atsSafe: true,
  },
  {
    id: "modern",
    name: "Modern",
    style: "Contemporary with accent details",
    description: "Fresh single-column layout with coloured section rules",
    templateType: "simple",
    hasPhoto: false,
    category: "Modern",
    atsSafe: true,
  },
  {
    id: "executive",
    name: "Executive",
    style: "Sophisticated serif design",
    description: "Elegant typography and generous spacing for senior roles",
    templateType: "simple",
    hasPhoto: false,
    category: "Classic",
    atsSafe: true,
  },
  {
    id: "minimal",
    name: "Minimal",
    style: "Ultra-clean monochrome",
    description: "Maximum clarity with zero visual clutter",
    templateType: "simple",
    hasPhoto: false,
    category: "Modern",
    atsSafe: true,
  },
  {
    id: "compact",
    name: "Compact",
    style: "Dense one-page fit",
    description: "Tightened spacing to fit longer careers on a single page",
    templateType: "simple",
    hasPhoto: false,
    category: "Technical",
    atsSafe: true,
  },
  {
    id: "timeline",
    name: "Timeline",
    style: "Vertical career rail",
    description: "Experience plotted along a timeline rail for quick scanning",
    templateType: "simple",
    hasPhoto: false,
    category: "Modern",
    atsSafe: true,
  },
  {
    id: "headerband",
    name: "Header Band",
    style: "Full-width colour banner",
    description: "Bold coloured header band with a clean single-column body",
    templateType: "simple",
    hasPhoto: false,
    category: "Creative",
    atsSafe: true,
  },
  {
    id: "academic",
    name: "Academic",
    style: "Publication-style CV",
    description: "Serif CV layout suited to research, teaching and grants",
    templateType: "simple",
    hasPhoto: false,
    category: "Academic",
    atsSafe: true,
  },
  {
    id: "creative",
    name: "Creative",
    style: "Two-column sidebar layout",
    description: "Sidebar design with photo support and visual structure",
    templateType: "creative",
    hasPhoto: true,
    category: "Creative",
    atsSafe: false,
  },
  {
    id: "elegant",
    name: "Elegant",
    style: "Refined two-column design",
    description: "Sophisticated dark sidebar with serif accents",
    templateType: "creative",
    hasPhoto: true,
    category: "Creative",
    atsSafe: false,
  },
];

/** Palette + typeface variants applied across every layout. */
export const THEMES: ThemeDefinition[] = [
  { id: "navy", name: "Navy", accentColor: "#1a365d", fontFamily: SANS },
  { id: "teal", name: "Teal", accentColor: "#0f766e", fontFamily: SANS },
  { id: "charcoal", name: "Charcoal", accentColor: "#1f2937", fontFamily: SANS },
  { id: "burgundy", name: "Burgundy", accentColor: "#7f1d1d", fontFamily: SERIF },
  { id: "forest", name: "Forest", accentColor: "#14532d", fontFamily: SANS },
  { id: "indigo", name: "Indigo", accentColor: "#3730a3", fontFamily: MONO_SANS },
];

/**
 * Builds the full template catalogue: every layout in every theme.
 * The first theme keeps the bare layout id so historic selections still resolve.
 */
function buildTemplates(): ResumeTemplate[] {
  const templates: ResumeTemplate[] = [];

  for (const layout of LAYOUTS) {
    THEMES.forEach((theme, themeIndex) => {
      const isDefaultTheme = themeIndex === 0;
      templates.push({
        id: isDefaultTheme ? layout.id : `${layout.id}-${theme.id}`,
        name: isDefaultTheme ? layout.name : `${layout.name} ${theme.name}`,
        style: layout.style,
        description: layout.description,
        accentColor: theme.accentColor,
        fontFamily: theme.fontFamily,
        hasPhoto: layout.hasPhoto,
        templateType: layout.templateType,
        layout: layout.id,
        theme: theme.id,
        themeName: theme.name,
        category: layout.category,
        atsSafe: layout.atsSafe,
      });
    });
  }

  return templates;
}

/** Full catalogue — LAYOUTS.length × THEMES.length templates. */
export const TEMPLATES: ResumeTemplate[] = buildTemplates();

/** Distinct categories present in the catalogue, for gallery filtering. */
export const TEMPLATE_CATEGORIES: TemplateCategory[] = Array.from(
  new Set(TEMPLATES.map((t) => t.category)),
) as TemplateCategory[];

/** Looks up a template by id, falling back to the first template if not found. */
export function getTemplateById(id: string | null | undefined): ResumeTemplate {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}
