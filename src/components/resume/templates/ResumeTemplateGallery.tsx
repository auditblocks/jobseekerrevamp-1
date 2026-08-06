/**
 * @fileoverview Browsable gallery for the resume template catalogue.
 *
 * The catalogue is a layout × theme matrix (see templateRegistry), so it's large
 * enough to need filtering: users narrow by category, colour theme, and an
 * "ATS-safe only" toggle before picking. Thumbnails are CSS mockups keyed to the
 * template's `layout`, so each structural family is visually distinguishable at a
 * glance rather than every card looking the same.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, FileDown, Loader2, Check, ShieldCheck, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ResumeTemplate,
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  THEMES,
  TemplateCategory,
} from "./templateRegistry";

interface ResumeTemplateGalleryProps {
  templates?: ResumeTemplate[];
  profilePhotoUrl?: string | null;
  selectedId?: string | null;
  isExporting?: boolean;
  onPreview: (template: ResumeTemplate) => void;
  onDownload: (template: ResumeTemplate, format: "html" | "pdf") => void;
}

/** Small helper for the skeleton bars inside thumbnails. */
const Bar = ({ w, c, h = "h-0.5" }: { w: string; c?: string; h?: string }) => (
  <div className={cn("rounded-full", h, w)} style={{ background: c || "#e5e7eb" }} />
);

/**
 * Renders a miniature CSS mockup of the template's structure.
 * Keyed on `layout` so each structural family looks distinct in the grid.
 */
function TemplateThumb({ template }: { template: ResumeTemplate }) {
  const color = template.accentColor;

  switch (template.layout) {
    case "creative":
    case "elegant":
      return (
        <div className="flex h-full">
          <div
            className={cn("h-full p-2 flex flex-col items-center pt-4 gap-1.5", template.layout === "elegant" ? "w-[32%]" : "w-[35%]")}
            style={{ background: color }}
          >
            {template.hasPhoto && <div className="w-6 h-6 rounded-full bg-white/25 mb-1" />}
            <div className="w-8 h-1 rounded-full bg-white/50" />
            <div className="w-6 h-0.5 rounded-full bg-white/30" />
            <div className="w-full h-px bg-white/15 my-1" />
            <div className="w-7 h-0.5 rounded-full bg-white/40" />
            <div className="w-5 h-0.5 rounded-full bg-white/25" />
            <div className="flex gap-0.5 flex-wrap justify-center mt-1">
              <div className="w-4 h-1.5 rounded-sm bg-white/20" />
              <div className="w-5 h-1.5 rounded-sm bg-white/20" />
            </div>
          </div>
          <div className="flex-1 p-3 pt-4 space-y-2">
            <Bar w="w-full" c={`${color}66`} />
            <Bar w="w-full" />
            <Bar w="w-4/5" />
            <div className="w-full h-px" style={{ background: `${color}33` }} />
            <Bar w="w-2/3" c="#d1d5db" />
            <Bar w="w-full" />
            <Bar w="w-3/4" />
          </div>
        </div>
      );

    case "headerband":
      return (
        <div className="h-full">
          <div className="px-3 py-3 space-y-1" style={{ background: color }}>
            <div className="w-14 h-1.5 rounded-full bg-white/80" />
            <div className="w-9 h-0.5 rounded-full bg-white/50" />
            <div className="flex gap-1 mt-1">
              <div className="w-4 h-0.5 rounded-full bg-white/40" />
              <div className="w-4 h-0.5 rounded-full bg-white/40" />
            </div>
          </div>
          <div className="p-3 space-y-2">
            <Bar w="w-10" c={`${color}99`} />
            <Bar w="w-full" />
            <Bar w="w-4/5" />
            <Bar w="w-8" c={`${color}99`} />
            <Bar w="w-2/3" c="#d1d5db" />
            <Bar w="w-full" />
          </div>
        </div>
      );

    case "timeline":
      return (
        <div className="p-3 pt-4 space-y-2.5">
          <div className="space-y-1">
            <div className="w-12 h-1.5 rounded-full bg-gray-800" />
            <Bar w="w-8" c={color} />
          </div>
          <div className="pl-3 space-y-2.5 border-l-2" style={{ borderColor: `${color}33` }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="relative space-y-1">
                <div
                  className="absolute -left-[17px] top-0.5 w-1.5 h-1.5 rounded-full"
                  style={{ background: color }}
                />
                <Bar w="w-6" c={`${color}cc`} />
                <Bar w="w-3/4" c="#d1d5db" />
                <Bar w="w-full" />
              </div>
            ))}
          </div>
        </div>
      );

    case "academic":
      return (
        <div className="p-3 pt-4 space-y-2">
          <div className="flex flex-col items-center gap-1 pb-1.5 border-b border-gray-300">
            <div className="w-14 h-1.5 rounded-full bg-gray-800" />
            <div className="w-10 h-0.5 rounded-full" style={{ background: `${color}cc` }} />
            <div className="w-16 h-0.5 rounded-full bg-gray-200 mt-0.5" />
          </div>
          <Bar w="w-9" c={`${color}cc`} />
          <Bar w="w-full" />
          <Bar w="w-full" />
          <Bar w="w-3/4" />
          <Bar w="w-7" c={`${color}cc`} />
          <Bar w="w-2/3" c="#d1d5db" />
          <Bar w="w-full" />
        </div>
      );

    case "compact":
      return (
        <div className="p-2.5 pt-3 space-y-1.5">
          <div className="flex justify-between items-end pb-1 border-b-2" style={{ borderColor: color }}>
            <div className="space-y-0.5">
              <div className="w-11 h-1.5 rounded-full" style={{ background: color }} />
              <div className="w-7 h-0.5 rounded-full bg-gray-300" />
            </div>
            <div className="space-y-0.5 items-end flex flex-col">
              <div className="w-6 h-0.5 rounded-full bg-gray-200" />
              <div className="w-5 h-0.5 rounded-full bg-gray-200" />
            </div>
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-0.5">
              <Bar w="w-6" c={`${color}aa`} />
              <Bar w="w-full" />
              <Bar w="w-5/6" />
            </div>
          ))}
        </div>
      );

    case "minimal":
      return (
        <div className="p-3 pt-5 space-y-3">
          <div className="space-y-1">
            <div className="w-14 h-1.5 rounded-full bg-gray-900" />
            <Bar w="w-20" />
          </div>
          <div className="space-y-1.5">
            <Bar w="w-8" c="#9ca3af" />
            <Bar w="w-full" />
            <Bar w="w-5/6" />
          </div>
          <div className="space-y-1.5">
            <Bar w="w-7" c="#9ca3af" />
            <Bar w="w-2/3" c="#d1d5db" />
            <Bar w="w-full" />
            <Bar w="w-4/5" />
          </div>
        </div>
      );

    default:
      // professional / modern / executive — centred header, ruled sections
      return (
        <div className="p-3 pt-4 space-y-2.5">
          <div className="flex flex-col items-center gap-1 pb-2" style={{ borderBottom: `2px solid ${color}` }}>
            <div className="w-12 h-1.5 rounded-full" style={{ background: color }} />
            <div className="w-8 h-0.5 rounded-full bg-gray-300" />
            <div className="flex gap-1.5 mt-0.5">
              <Bar w="w-4" />
              <Bar w="w-4" />
              <Bar w="w-4" />
            </div>
          </div>
          <div className="space-y-1">
            <Bar w="w-10" c={`${color}99`} />
            <Bar w="w-full" />
            <Bar w="w-4/5" />
          </div>
          <div className="space-y-1">
            <Bar w="w-8" c={`${color}99`} />
            <div className="flex justify-between">
              <Bar w="w-2/3" c="#d1d5db" />
              <Bar w="w-1/5" />
            </div>
            <div className="pl-1.5 space-y-0.5">
              <Bar w="w-full" />
              <Bar w="w-4/5" />
            </div>
          </div>
          <div className="space-y-1">
            <Bar w="w-6" c={`${color}99`} />
            <div className="flex gap-1 flex-wrap">
              <div className="w-4 h-1.5 rounded-sm bg-gray-100 border border-gray-200" />
              <div className="w-5 h-1.5 rounded-sm bg-gray-100 border border-gray-200" />
              <div className="w-3 h-1.5 rounded-sm bg-gray-100 border border-gray-200" />
            </div>
          </div>
        </div>
      );
  }
}

function TemplatePreviewCard({ template, selected, onPreview, onDownload, isExporting }: {
  template: ResumeTemplate;
  selected: boolean;
  onPreview: () => void;
  onDownload: (format: "html" | "pdf") => void;
  isExporting?: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <div
        className={cn(
          "group rounded-xl border-2 transition-all cursor-pointer overflow-hidden bg-card h-full flex flex-col",
          selected ? "border-accent shadow-md ring-1 ring-accent/20" : "border-border hover:border-accent/40 hover:shadow-sm",
        )}
        onClick={onPreview}
      >
        <div className="relative p-4 pb-3">
          <div className="w-full aspect-[3/4] bg-white rounded-lg border border-border overflow-hidden shadow-sm mx-auto max-w-[200px]">
            <TemplateThumb template={template} />
          </div>
          {selected && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
              <Check className="h-3 w-3 text-white" />
            </div>
          )}
          {template.atsSafe && (
            <div
              className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-success/10 text-success text-[9px] font-medium"
              title="Single-column layout — parses cleanly in applicant tracking systems"
            >
              <ShieldCheck className="h-2.5 w-2.5" />
              ATS
            </div>
          )}
        </div>

        <div className="px-4 pb-3 space-y-2 flex-1 flex flex-col">
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold leading-tight">{template.name}</h3>
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                style={{ background: template.accentColor }}
                title={template.themeName}
              />
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{template.style}</p>
          </div>
          <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" onClick={onPreview} className="flex-1 h-8 text-xs">
              <Eye className="mr-1 h-3 w-3" />
              Preview
            </Button>
            <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => onDownload("pdf")} disabled={isExporting}>
              {isExporting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <FileDown className="mr-1 h-3 w-3" />}
              PDF
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ResumeTemplateGallery({
  templates = TEMPLATES,
  selectedId,
  isExporting,
  onPreview,
  onDownload,
}: ResumeTemplateGalleryProps) {
  const [category, setCategory] = useState<TemplateCategory | "All">("All");
  const [theme, setTheme] = useState<string | "All">("All");
  const [atsOnly, setAtsOnly] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (category !== "All" && t.category !== category) return false;
      if (theme !== "All" && t.theme !== theme) return false;
      if (atsOnly && !t.atsSafe) return false;
      if (q && !`${t.name} ${t.style} ${t.description} ${t.category}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [templates, category, theme, atsOnly, query]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Button
            variant={atsOnly ? "secondary" : "outline"}
            size="sm"
            className="h-9 text-xs"
            onClick={() => setAtsOnly((v) => !v)}
          >
            <ShieldCheck className={cn("mr-1.5 h-3.5 w-3.5", atsOnly && "text-success")} />
            ATS-safe only
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={category === "All" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setCategory("All")}
          >
            All styles
          </Button>
          {TEMPLATE_CATEGORIES.map((c) => (
            <Button
              key={c}
              variant={category === c ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setCategory(c)}
            >
              {c}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground mr-1">Colour:</span>
          <button
            type="button"
            onClick={() => setTheme("All")}
            className={cn(
              "h-6 px-2 rounded-md text-[11px] border transition-colors",
              theme === "All" ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-accent/40",
            )}
          >
            All
          </button>
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              title={t.name}
              className={cn(
                "w-6 h-6 rounded-md border-2 transition-transform hover:scale-110",
                theme === t.id ? "border-accent scale-110" : "border-transparent",
              )}
              style={{ background: t.accentColor }}
            >
              <span className="sr-only">{t.name}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {templates.length} templates
          </p>
          {(category !== "All" || theme !== "All" || atsOnly || query) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => {
                setCategory("All");
                setTheme("All");
                setAtsOnly(false);
                setQuery("");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No templates match these filters.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((template) => (
            <TemplatePreviewCard
              key={template.id}
              template={template}
              selected={selectedId === template.id}
              onPreview={() => onPreview(template)}
              onDownload={(format) => onDownload(template, format)}
              isExporting={isExporting}
            />
          ))}
        </div>
      )}
    </div>
  );
}
