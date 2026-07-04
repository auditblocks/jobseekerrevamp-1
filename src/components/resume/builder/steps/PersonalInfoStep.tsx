import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StructuredResumeData } from "@/types/resume";
import { StepProps } from "../stepTypes";

export function PersonalInfoStep({ data, onChange }: StepProps) {
  const updatePersonalInfo = (field: keyof StructuredResumeData["personalInfo"], value: string) => {
    onChange({ ...data, personalInfo: { ...data.personalInfo, [field]: value } });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Full Name *</Label>
          <Input
            value={data.personalInfo.name}
            onChange={(e) => updatePersonalInfo("name", e.target.value)}
            placeholder="John Doe"
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Professional Title</Label>
          <Input
            value={data.professionalTitle || ""}
            onChange={(e) => onChange({ ...data, professionalTitle: e.target.value })}
            placeholder="Software Engineer"
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Email *</Label>
          <Input
            type="email"
            value={data.personalInfo.email}
            onChange={(e) => updatePersonalInfo("email", e.target.value)}
            placeholder="john@example.com"
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Phone *</Label>
          <Input
            value={data.personalInfo.phone}
            onChange={(e) => updatePersonalInfo("phone", e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Location *</Label>
          <Input
            value={data.personalInfo.location}
            onChange={(e) => updatePersonalInfo("location", e.target.value)}
            placeholder="City, State, Country"
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">LinkedIn</Label>
          <Input
            value={data.personalInfo.linkedin || ""}
            onChange={(e) => updatePersonalInfo("linkedin", e.target.value)}
            placeholder="linkedin.com/in/username"
            className="h-9"
          />
        </div>
      </div>
    </div>
  );
}

export function validatePersonalStep(data: StructuredResumeData): string | null {
  if (!data.personalInfo.name.trim()) return "Please enter your name";
  if (!data.personalInfo.email.trim()) return "Please enter your email";
  return null;
}
