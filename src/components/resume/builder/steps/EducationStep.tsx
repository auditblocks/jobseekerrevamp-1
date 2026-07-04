/**
 * @fileoverview Wizard step 4: education entries.
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Education</CardTitle>
          <Button onClick={addEducation} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Education
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.education.map((edu, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Education {index + 1}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => remove(index)} aria-label="Remove education entry">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Degree *</Label>
                  <Input
                    value={edu.degree}
                    onChange={(e) => update(index, { degree: e.target.value })}
                    placeholder="Bachelor of Science in Computer Science"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Institution *</Label>
                  <Input
                    value={edu.institution}
                    onChange={(e) => update(index, { institution: e.target.value })}
                    placeholder="University Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={edu.location || ""} onChange={(e) => update(index, { location: e.target.value })} placeholder="City, State" />
                </div>
                <div className="space-y-2">
                  <Label>Graduation Date *</Label>
                  <Input
                    value={edu.graduationDate}
                    onChange={(e) => update(index, { graduationDate: e.target.value })}
                    placeholder="MM/YYYY"
                  />
                </div>
                <div className="space-y-2">
                  <Label>GPA (Optional)</Label>
                  <Input value={edu.gpa || ""} onChange={(e) => update(index, { gpa: e.target.value })} placeholder="3.8/4.0" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {data.education.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No education entries added yet. Click "Add Education" to get started.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Requires at least one education entry — matches the original builder's validation. */
export function validateEducationStep(data: StructuredResumeData): string | null {
  if (data.education.length === 0) return "Please add at least one education entry";
  return null;
}
