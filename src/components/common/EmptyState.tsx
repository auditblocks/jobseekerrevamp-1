/**
 * @fileoverview Reusable empty/error placeholder for lists and data sections.
 * Drops into pages that already provide their own container (bordered dashed
 * div, bare div, Card) without adding another wrapping box.
 */

import { AlertCircle, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  variant?: "empty" | "error";
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, variant = "empty", className }: EmptyStateProps) {
  const ResolvedIcon = Icon || (variant === "error" ? AlertCircle : undefined);

  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-12", className)}>
      {ResolvedIcon && (
        <div
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center mb-4",
            variant === "error" ? "bg-destructive/10" : "bg-muted"
          )}
        >
          <ResolvedIcon className={cn("h-8 w-8", variant === "error" ? "text-destructive" : "text-muted-foreground")} />
        </div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && (
        <Button variant="outline" size="sm" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
