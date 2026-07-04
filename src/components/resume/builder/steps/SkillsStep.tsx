/**
 * @fileoverview Wizard step 5: skills, entered via an input buffer + badge list.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle>Skills</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={currentSkill}
            onChange={(e) => setCurrentSkill(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
            placeholder="Enter a skill and press Enter"
          />
          <Button onClick={addSkill}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.skills.map((skill, index) => (
            <Badge key={index} variant="secondary" className="text-sm py-1 px-3">
              {skill}
              <button onClick={() => remove(index)} className="ml-2 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** No fields on this step are required. */
export function validateSkillsStep(): string | null {
  return null;
}
