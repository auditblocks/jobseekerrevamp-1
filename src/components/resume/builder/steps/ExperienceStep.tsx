/**
 * @fileoverview Wizard step 3: work experience, with nested bullet-point descriptions.
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Work Experience</CardTitle>
          <Button onClick={addExperience} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Experience
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {data.workExperience.map((exp, index) => (
          <ExperienceEntry
            key={index}
            exp={exp}
            index={index}
            onUpdate={(patch) => update(index, patch)}
            onRemove={() => remove(index)}
          />
        ))}
        {data.workExperience.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No work experience added yet. Click "Add Experience" to get started.
          </p>
        )}
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Experience {index + 1}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onRemove} aria-label="Remove experience entry">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Job Title *</Label>
            <Input value={exp.jobTitle} onChange={(e) => onUpdate({ jobTitle: e.target.value })} placeholder="Software Engineer" />
          </div>
          <div className="space-y-2">
            <Label>Company *</Label>
            <Input value={exp.company} onChange={(e) => onUpdate({ company: e.target.value })} placeholder="Company Name" />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input value={exp.location || ""} onChange={(e) => onUpdate({ location: e.target.value })} placeholder="City, State" />
          </div>
          <div className="space-y-2">
            <Label>Start Date *</Label>
            <Input value={exp.startDate} onChange={(e) => onUpdate({ startDate: e.target.value })} placeholder="MM/YYYY" />
          </div>
          <div className="space-y-2">
            <Label>End Date</Label>
            <Input
              value={exp.endDate}
              onChange={(e) => onUpdate({ endDate: e.target.value })}
              placeholder="MM/YYYY or Present"
              disabled={exp.current}
            />
          </div>
          <div className="space-y-2 flex items-end">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={exp.current}
                onChange={(e) => onUpdate({ current: e.target.checked })}
                className="rounded"
              />
              <Label>Current Position</Label>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Responsibilities & Achievements</Label>
          {exp.description.map((desc, descIndex) => (
            <div key={descIndex} className="flex gap-2">
              <Textarea
                value={desc}
                onChange={(e) => description.update(descIndex, e.target.value)}
                placeholder="Describe your responsibilities and achievements..."
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => description.remove(descIndex)}
                disabled={exp.description.length === 1}
                aria-label="Remove bullet point"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => description.add("")}>
            <Plus className="h-4 w-4 mr-2" />
            Add Bullet Point
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Requires at least one work experience entry — matches the original builder's validation. */
export function validateExperienceStep(data: StructuredResumeData): string | null {
  if (data.workExperience.length === 0) return "Please add at least one work experience";
  return null;
}
