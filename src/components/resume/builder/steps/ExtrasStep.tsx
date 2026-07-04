import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { StructuredResumeData } from "@/types/resume";
import { StepProps } from "../stepTypes";
import { useFieldArray, useStringArrayField } from "../useFieldArray";

type Project = NonNullable<StructuredResumeData["projects"]>[number];

export function ExtrasStep({ data, onChange }: StepProps) {
  const projects = useFieldArray<Project>(data.projects || [], (next) => onChange({ ...data, projects: next }));
  const certifications = useStringArrayField(data.certifications || [], (next) => onChange({ ...data, certifications: next }));
  const languages = useStringArrayField(data.languages || [], (next) => onChange({ ...data, languages: next }));

  const addProject = () => projects.add({ name: "", description: "", technologies: [], duration: "" });

  return (
    <div className="space-y-5">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">Projects</Label>
          <Button onClick={addProject} variant="ghost" size="sm" className="h-7 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
        {(data.projects || []).map((proj, index) => (
          <div key={index} className="border rounded-lg p-3 space-y-2 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Project {index + 1}</span>
              <Button variant="ghost" size="sm" onClick={() => projects.remove(index)} className="h-7 w-7 p-0" aria-label="Remove project">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Input value={proj.name} onChange={(e) => projects.update(index, { name: e.target.value })} placeholder="Project Name" className="h-8 text-sm" />
            <Textarea
              value={proj.description}
              onChange={(e) => projects.update(index, { description: e.target.value })}
              placeholder="Brief description..."
              className="min-h-[60px] text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={(proj.technologies || []).join(", ")}
                onChange={(e) =>
                  projects.update(index, {
                    technologies: e.target.value.split(",").map((t) => t.trim()).filter((t) => t),
                  })
                }
                placeholder="React, Node.js..."
                className="h-8 text-sm"
              />
              <Input value={proj.duration || ""} onChange={(e) => projects.update(index, { duration: e.target.value })} placeholder="Duration" className="h-8 text-sm" />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">Certifications</Label>
          <Button onClick={() => certifications.add("")} variant="ghost" size="sm" className="h-7 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
        {(data.certifications || []).map((cert, index) => (
          <div key={index} className="flex gap-1.5">
            <Input value={cert} onChange={(e) => certifications.update(index, e.target.value)} placeholder="Certification name" className="h-8 text-sm" />
            <Button variant="ghost" size="sm" onClick={() => certifications.remove(index)} className="h-8 w-8 p-0" aria-label="Remove certification">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">Languages</Label>
          <Button onClick={() => languages.add("")} variant="ghost" size="sm" className="h-7 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
        {(data.languages || []).map((lang, index) => (
          <div key={index} className="flex gap-1.5">
            <Input value={lang} onChange={(e) => languages.update(index, e.target.value)} placeholder="Language" className="h-8 text-sm" />
            <Button variant="ghost" size="sm" onClick={() => languages.remove(index)} className="h-8 w-8 p-0" aria-label="Remove language">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function validateExtrasStep(): string | null {
  return null;
}
