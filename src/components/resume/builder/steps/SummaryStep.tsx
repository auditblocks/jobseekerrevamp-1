import { Textarea } from "@/components/ui/textarea";
import { StepProps } from "../stepTypes";

export function SummaryStep({ data, onChange }: StepProps) {
  return (
    <Textarea
      value={data.summary}
      onChange={(e) => onChange({ ...data, summary: e.target.value })}
      placeholder="Experienced professional with expertise in..."
      className="min-h-[120px] text-sm"
    />
  );
}

export function validateSummaryStep(): string | null {
  return null;
}
