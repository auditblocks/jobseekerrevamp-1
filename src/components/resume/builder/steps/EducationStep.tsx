import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { StructuredResumeData } from "@/types/resume";
import { StepProps } from "../stepTypes";
import { useFieldArray } from "../useFieldArray";

type Education = StructuredResumeData["education"][number];

export function EducationStep({ data, onChange }: StepProps) {
  const { add, update, remove } = useFieldArray<Education>(data.education, (next) =>
    onChange({ ...data, education: next })
  );

  const addEducation = () => add({ degree: "", institution: "", location: "", graduationDate: "", gpa: "" });

  return (
    <div className="space-y-3">
      {data.education.map((edu, index) => (
        <div key={index} className="border rounded-lg p-3 space-y-2.5 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Education {index + 1}</span>
            <Button variant="ghost" size="sm" onClick={() => remove(index)} className="h-7 w-7 p-0" aria-label="Remove education entry">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-xs">Degree *</Label>
              <Input
                value={edu.degree}
                onChange={(e) => update(index, { degree: e.target.value })}
                placeholder="B.Sc. Computer Science"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Institution *</Label>
              <Input
                value={edu.institution}
                onChange={(e) => update(index, { institution: e.target.value })}
                placeholder="University Name"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Graduation Date *</Label>
              <Input
                value={edu.graduationDate}
                onChange={(e) => update(index, { graduationDate: e.target.value })}
                placeholder="MM/YYYY"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">GPA (Optional)</Label>
              <Input value={edu.gpa || ""} onChange={(e) => update(index, { gpa: e.target.value })} placeholder="3.8/4.0" className="h-8 text-sm" />
            </div>
          </div>
        </div>
      ))}
      <Button onClick={addEducation} variant="outline" size="sm" className="w-full">
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Education
      </Button>
    </div>
  );
}

export function validateEducationStep(data: StructuredResumeData): string | null {
  if (data.education.length === 0) return "Please add at least one education entry";
  return null;
}
