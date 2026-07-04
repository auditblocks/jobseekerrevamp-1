import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, X } from "lucide-react";
import { StructuredResumeData } from "@/types/resume";
import { StepProps } from "../stepTypes";
import { useFieldArray, useStringArrayField } from "../useFieldArray";

type WorkExperience = StructuredResumeData["workExperience"][number];

export function ExperienceStep({ data, onChange }: StepProps) {
  const { add, update, remove } = useFieldArray<WorkExperience>(data.workExperience, (next) =>
    onChange({ ...data, workExperience: next })
  );

  const addExperience = () =>
    add({ jobTitle: "", company: "", location: "", startDate: "", endDate: "", current: false, description: [""] });

  return (
    <div className="space-y-3">
      {data.workExperience.map((exp, index) => (
        <ExperienceEntry
          key={index}
          exp={exp}
          index={index}
          onUpdate={(patch) => update(index, patch)}
          onRemove={() => remove(index)}
        />
      ))}
      <Button onClick={addExperience} variant="outline" size="sm" className="w-full">
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Experience
      </Button>
    </div>
  );
}

function ExperienceEntry({
  exp,
  index,
  onUpdate,
  onRemove,
}: {
  exp: WorkExperience;
  index: number;
  onUpdate: (patch: Partial<WorkExperience>) => void;
  onRemove: () => void;
}) {
  const description = useStringArrayField(exp.description, (next) => onUpdate({ description: next }));

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Position {index + 1}</span>
        <Button variant="ghost" size="sm" onClick={onRemove} className="h-7 w-7 p-0" aria-label="Remove experience entry">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <Label className="text-xs">Job Title *</Label>
          <Input value={exp.jobTitle} onChange={(e) => onUpdate({ jobTitle: e.target.value })} placeholder="Software Engineer" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Company *</Label>
          <Input value={exp.company} onChange={(e) => onUpdate({ company: e.target.value })} placeholder="Company Name" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Start Date *</Label>
          <Input value={exp.startDate} onChange={(e) => onUpdate({ startDate: e.target.value })} placeholder="MM/YYYY" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">End Date</Label>
          <div className="flex items-center gap-2">
            <Input
              value={exp.endDate}
              onChange={(e) => onUpdate({ endDate: e.target.value })}
              placeholder={exp.current ? "Present" : "MM/YYYY"}
              disabled={exp.current}
              className="h-8 text-sm flex-1"
            />
            <label className="flex items-center gap-1 text-xs whitespace-nowrap cursor-pointer">
              <input
                type="checkbox"
                checked={exp.current}
                onChange={(e) => onUpdate({ current: e.target.checked })}
                className="rounded"
              />
              Current
            </label>
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Key Achievements</Label>
        {exp.description.map((desc, descIndex) => (
          <div key={descIndex} className="flex gap-1.5">
            <Textarea
              value={desc}
              onChange={(e) => description.update(descIndex, e.target.value)}
              placeholder="Describe your impact..."
              className="flex-1 min-h-[60px] text-sm"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => description.remove(descIndex)}
              disabled={exp.description.length === 1}
              className="h-7 w-7 p-0 shrink-0 mt-1"
              aria-label="Remove bullet point"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={() => description.add("")} className="h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" />
          Add bullet
        </Button>
      </div>
    </div>
  );
}

export function validateExperienceStep(data: StructuredResumeData): string | null {
  if (data.workExperience.length === 0) return "Please add at least one work experience";
  return null;
}
