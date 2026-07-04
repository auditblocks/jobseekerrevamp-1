import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Eye, FileDown, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResumeTemplate, TEMPLATES } from "./templateRegistry";

interface ResumeTemplateGalleryProps {
  templates?: ResumeTemplate[];
  profilePhotoUrl?: string | null;
  selectedId?: string | null;
  isExporting?: boolean;
  onPreview: (template: ResumeTemplate) => void;
  onDownload: (template: ResumeTemplate, format: "html" | "pdf") => void;
}

function TemplatePreviewCard({ template, selected, onPreview, onDownload, isExporting }: {
  template: ResumeTemplate;
  selected: boolean;
  onPreview: () => void;
  onDownload: (format: "html" | "pdf") => void;
  isExporting?: boolean;
}) {
  const isSidebar = template.templateType === "creative";
  const color = template.accentColor;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div
        className={cn(
          "group rounded-xl border-2 transition-all cursor-pointer overflow-hidden bg-card",
          selected ? "border-accent shadow-md ring-1 ring-accent/20" : "border-border hover:border-accent/40 hover:shadow-sm",
        )}
        onClick={onPreview}
      >
        <div className="relative p-4 pb-3">
          <div className="w-full aspect-[3/4] bg-white rounded-lg border border-border overflow-hidden shadow-sm mx-auto max-w-[200px]">
            {isSidebar ? (
              <div className="flex h-full">
                <div className="w-[35%] h-full p-2 flex flex-col items-center pt-4 gap-2" style={{ background: color }}>
                  {template.hasPhoto && (
                    <div className="w-6 h-6 rounded-full bg-white/25 mb-1" />
                  )}
                  <div className="w-8 h-1 rounded-full bg-white/50" />
                  <div className="w-6 h-0.5 rounded-full bg-white/30" />
                  <div className="w-full h-[1px] bg-white/15 mt-1 mb-1" />
                  <div className="w-7 h-0.5 rounded-full bg-white/40" />
                  <div className="w-5 h-0.5 rounded-full bg-white/25" />
                  <div className="w-6 h-0.5 rounded-full bg-white/25" />
                  <div className="w-full h-[1px] bg-white/15 mt-1 mb-1" />
                  <div className="flex gap-0.5 flex-wrap justify-center">
                    <div className="w-4 h-1.5 rounded-sm bg-white/20" />
                    <div className="w-5 h-1.5 rounded-sm bg-white/20" />
                    <div className="w-3 h-1.5 rounded-sm bg-white/20" />
                  </div>
                </div>
                <div className="flex-1 p-3 pt-4 space-y-2">
                  <div className="space-y-1">
                    <div className="w-full h-0.5 rounded-full" style={{ background: color, opacity: 0.4 }} />
                    <div className="w-full h-0.5 rounded-full bg-gray-200" />
                    <div className="w-4/5 h-0.5 rounded-full bg-gray-200" />
                  </div>
                  <div className="w-full h-[1px]" style={{ background: color, opacity: 0.2 }} />
                  <div className="space-y-1">
                    <div className="w-2/3 h-0.5 rounded-full bg-gray-300" />
                    <div className="w-1/2 h-0.5 rounded-full bg-gray-200" />
                    <div className="w-full h-0.5 rounded-full bg-gray-200" />
                    <div className="w-4/5 h-0.5 rounded-full bg-gray-200" />
                  </div>
                  <div className="w-full h-[1px]" style={{ background: color, opacity: 0.2 }} />
                  <div className="space-y-1">
                    <div className="w-3/5 h-0.5 rounded-full bg-gray-300" />
                    <div className="w-full h-0.5 rounded-full bg-gray-200" />
                    <div className="w-3/4 h-0.5 rounded-full bg-gray-200" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 pt-4 space-y-2.5">
                <div className="flex flex-col items-center gap-1 pb-2" style={{ borderBottom: `2px solid ${color}` }}>
                  <div className="w-12 h-1.5 rounded-full" style={{ background: color }} />
                  <div className="w-8 h-0.5 rounded-full bg-gray-300" />
                  <div className="flex gap-1.5 mt-0.5">
                    <div className="w-4 h-0.5 rounded-full bg-gray-200" />
                    <div className="w-4 h-0.5 rounded-full bg-gray-200" />
                    <div className="w-4 h-0.5 rounded-full bg-gray-200" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="w-10 h-0.5 rounded-full" style={{ background: color, opacity: 0.5 }} />
                  <div className="w-full h-0.5 rounded-full bg-gray-200" />
                  <div className="w-4/5 h-0.5 rounded-full bg-gray-200" />
                </div>
                <div className="space-y-1">
                  <div className="w-8 h-0.5 rounded-full" style={{ background: color, opacity: 0.5 }} />
                  <div className="flex justify-between">
                    <div className="w-2/3 h-0.5 rounded-full bg-gray-300" />
                    <div className="w-1/5 h-0.5 rounded-full bg-gray-200" />
                  </div>
                  <div className="w-1/2 h-0.5 rounded-full bg-gray-200" />
                  <div className="pl-1.5 space-y-0.5">
                    <div className="w-full h-0.5 rounded-full bg-gray-200" />
                    <div className="w-4/5 h-0.5 rounded-full bg-gray-200" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="w-6 h-0.5 rounded-full" style={{ background: color, opacity: 0.5 }} />
                  <div className="flex gap-1 flex-wrap">
                    <div className="w-4 h-1.5 rounded-sm bg-gray-100 border border-gray-200" />
                    <div className="w-5 h-1.5 rounded-sm bg-gray-100 border border-gray-200" />
                    <div className="w-3 h-1.5 rounded-sm bg-gray-100 border border-gray-200" />
                  </div>
                </div>
              </div>
            )}
          </div>
          {selected && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
              <Check className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        <div className="px-4 pb-3 space-y-2">
          <div>
            <h3 className="text-sm font-semibold">{template.name}</h3>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{template.description}</p>
          </div>
          <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" onClick={onPreview} className="flex-1 h-8 text-xs">
              <Eye className="mr-1 h-3 w-3" />
              Preview
            </Button>
            <Button
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => onDownload("pdf")}
              disabled={isExporting}
            >
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
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {templates.map((template) => (
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
  );
}
