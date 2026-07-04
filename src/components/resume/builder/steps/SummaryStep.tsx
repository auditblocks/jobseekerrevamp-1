/**
 * @fileoverview Wizard step 2: professional summary.
 */

import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StepProps } from "../stepTypes";

export function SummaryStep({ data, onChange }: StepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Professional Summary</CardTitle>
        <CardDescription>Write a compelling summary of your professional background</CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          value={data.summary}
          onChange={(e) => onChange({ ...data, summary: e.target.value })}
          placeholder="Experienced professional with expertise in..."
          className="min-h-[200px]"
        />
      </CardContent>
    </Card>
  );
}

/** No fields on this step are required. */
export function validateSummaryStep(): string | null {
  return null;
}
