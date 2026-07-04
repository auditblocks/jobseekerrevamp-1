import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { StepProps } from "../stepTypes";
import { useStringArrayField } from "../useFieldArray";

export function SkillsStep({ data, onChange }: StepProps) {
  const [currentSkill, setCurrentSkill] = useState("");
  const { add, remove } = useStringArrayField(data.skills, (next) => onChange({ ...data, skills: next }));

  const addSkill = () => {
    if (currentSkill.trim()) {
      add(currentSkill.trim());
      setCurrentSkill("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={currentSkill}
          onChange={(e) => setCurrentSkill(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
          placeholder="Type a skill and press Enter"
          className="h-9 text-sm"
        />
        <Button onClick={addSkill} size="sm" className="h-9 px-4">Add</Button>
      </div>
      {data.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.skills.map((skill, index) => (
            <Badge key={index} variant="secondary" className="text-xs py-0.5 px-2.5 gap-1">
              {skill}
              <button onClick={() => remove(index)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function validateSkillsStep(): string | null {
  return null;
}
