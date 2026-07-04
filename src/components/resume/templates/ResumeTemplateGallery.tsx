/**
 * @fileoverview Presentational grid of selectable resume template cards.
 * Shared by the standalone `TemplateGalleryDialog` and the wizard's final
 * `TemplateExportStep`.
 */

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, FileText, FileDown, Loader2 } from "lucide-react";
import { ResumeTemplate, TEMPLATES } from "./templateRegistry";

interface ResumeTemplateGalleryProps {
  templates?: ResumeTemplate[];
  profilePhotoUrl?: string | null;
  selectedId?: string | null;
  isExporting?: boolean;
  onPreview: (template: ResumeTemplate) => void;
  onDownload: (template: ResumeTemplate, format: "html" | "pdf") => void;
}

export function ResumeTemplateGallery({
  templates = TEMPLATES,
  profilePhotoUrl,
  selectedId,
  isExporting,
  onPreview,
  onDownload,
}: ResumeTemplateGalleryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => (
        <motion.div
          key={template.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card
            className={`h-full transition-colors cursor-pointer ${
              selectedId === template.id ? "border-accent ring-1 ring-accent" : "hover:border-accent/50"
            }`}
            onClick={() => onPreview(template)}
          >
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <div className="w-4 h-4 rounded" style={{ backgroundColor: template.accentColor }} />
              </div>
              <CardDescription className="text-xs">{template.style}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{template.description}</p>
              {template.hasPhoto && !profilePhotoUrl && (
                <p className="text-xs text-yellow-600">Photo will be added if available</p>
              )}
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm" onClick={() => onPreview(template)}>
                  <Eye className="mr-2 h-3 w-3" />
                  Preview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDownload(template, "html")}
                  title="Download as HTML"
                  disabled={isExporting}
                >
                  <FileText className="mr-2 h-3 w-3" />
                  HTML
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => onDownload(template, "pdf")}
                  title="Download as PDF"
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <FileDown className="mr-2 h-3 w-3" />
                  )}
                  PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
