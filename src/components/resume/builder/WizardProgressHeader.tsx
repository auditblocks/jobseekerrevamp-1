/**
 * @fileoverview Step progress indicator for the resume builder wizard.
 * Modeled on `src/components/OnboardingProgress.tsx`'s Progress bar +
 * Framer-Motion staggered step badges.
 */

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { WizardStep } from "./builderSteps";

interface WizardProgressHeaderProps {
  steps: WizardStep[];
  currentStep: number;
}

export function WizardProgressHeader({ steps, currentStep }: WizardProgressHeaderProps) {
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Step {currentStep + 1} of {steps.length}
        </span>
        <span className="text-xs text-muted-foreground font-mono">{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} className="h-2" indicatorClassName="bg-accent" />
      <div className="flex flex-wrap gap-2">
        {steps.map((step, index) => {
          const completed = index < currentStep;
          const active = index === currentStep;
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border",
                completed && "bg-success/10 border-success/20 text-success",
                active && "bg-accent/10 border-accent/40 text-accent-foreground font-medium",
                !completed && !active && "bg-background border-border text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px]",
                  completed ? "bg-success text-success-foreground" : active ? "bg-accent text-accent-foreground" : "bg-muted"
                )}
              >
                {completed ? <Check className="w-2.5 h-2.5" /> : index + 1}
              </span>
              {step.label}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
