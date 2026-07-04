/**
 * @fileoverview Wizard step 1: personal contact info + professional title.
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StructuredResumeData } from "@/types/resume";
import { StepProps } from "../stepTypes";

export function PersonalInfoStep({ data, onChange }: StepProps) {
  const updatePersonalInfo = (field: keyof StructuredResumeData["personalInfo"], value: string) => {
    onChange({ ...data, personalInfo: { ...data.personalInfo, [field]: value } });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input
              value={data.personalInfo.name}
              onChange={(e) => updatePersonalInfo("name", e.target.value)}
              placeholder="John Doe"
            />
          </div>
          <div className="space-y-2">
            <Label>Professional Title</Label>
            <Input
              value={data.professionalTitle || ""}
              onChange={(e) => onChange({ ...data, professionalTitle: e.target.value })}
              placeholder="Software Engineer"
            />
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              type="email"
              value={data.personalInfo.email}
              onChange={(e) => updatePersonalInfo("email", e.target.value)}
              placeholder="john@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone *</Label>
            <Input
              value={data.personalInfo.phone}
              onChange={(e) => updatePersonalInfo("phone", e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>
          <div className="space-y-2">
            <Label>Location *</Label>
            <Input
              value={data.personalInfo.location}
              onChange={(e) => updatePersonalInfo("location", e.target.value)}
              placeholder="City, State, Country"
            />
          </div>
          <div className="space-y-2">
            <Label>LinkedIn</Label>
            <Input
              value={data.personalInfo.linkedin || ""}
              onChange={(e) => updatePersonalInfo("linkedin", e.target.value)}
              placeholder="linkedin.com/in/username"
            />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input
              value={data.personalInfo.website || ""}
              onChange={(e) => updatePersonalInfo("website", e.target.value)}
              placeholder="www.example.com"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Requires name + email — matches the original builder's validation. */
export function validatePersonalStep(data: StructuredResumeData): string | null {
  if (!data.personalInfo.name.trim()) return "Please enter your name";
  if (!data.personalInfo.email.trim()) return "Please enter your email";
  return null;
}
