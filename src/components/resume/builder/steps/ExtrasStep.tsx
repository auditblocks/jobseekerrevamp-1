/**
 * @fileoverview Wizard step 6: projects, certifications, and languages.
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Projects</CardTitle>
            <Button onClick={addProject} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(data.projects || []).map((proj, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Project {index + 1}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => projects.remove(index)} aria-label="Remove project">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Project Name *</Label>
                  <Input value={proj.name} onChange={(e) => projects.update(index, { name: e.target.value })} placeholder="Project Name" />
                </div>
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={proj.description}
                    onChange={(e) => projects.update(index, { description: e.target.value })}
                    placeholder="Describe the project..."
                    className="min-h-[100px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Technologies (comma-separated)</Label>
                    <Input
                      value={(proj.technologies || []).join(", ")}
                      onChange={(e) =>
                        projects.update(index, {
                          technologies: e.target.value.split(",").map((t) => t.trim()).filter((t) => t),
                        })
                      }
                      placeholder="React, Node.js, MongoDB"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Input value={proj.duration || ""} onChange={(e) => projects.update(index, { duration: e.target.value })} placeholder="3 months" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Certifications</CardTitle>
            <Button onClick={() => certifications.add("")} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Certification
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data.certifications || []).map((cert, index) => (
            <div key={index} className="flex gap-2">
              <Input value={cert} onChange={(e) => certifications.update(index, e.target.value)} placeholder="Certification name" />
              <Button variant="ghost" size="sm" onClick={() => certifications.remove(index)} aria-label="Remove certification">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Languages</CardTitle>
            <Button onClick={() => languages.add("")} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Language
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data.languages || []).map((lang, index) => (
            <div key={index} className="flex gap-2">
              <Input value={lang} onChange={(e) => languages.update(index, e.target.value)} placeholder="Language name" />
              <Button variant="ghost" size="sm" onClick={() => languages.remove(index)} aria-label="Remove language">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/** No fields on this step are required. */
export function validateExtrasStep(): string | null {
  return null;
}
