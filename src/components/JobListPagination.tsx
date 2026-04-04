import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildPaginationItems } from "@/lib/pagination";
import { cn } from "@/lib/utils";

type JobListPaginationProps = {
  safePage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  /** e.g. "Job list pagination" */
  ariaLabel?: string;
};

export function JobListPagination({
  safePage,
  totalPages,
  onPageChange,
  className,
  ariaLabel = "Pagination",
}: JobListPaginationProps) {
  const [jumpValue, setJumpValue] = useState(String(safePage));

  useEffect(() => {
    setJumpValue(String(safePage));
  }, [safePage]);

  if (totalPages <= 1) return null;

  const items = buildPaginationItems(safePage, totalPages);

  const commitJump = () => {
    const n = parseInt(jumpValue, 10);
    if (!Number.isFinite(n)) return;
    onPageChange(Math.min(totalPages, Math.max(1, n)));
  };

  return (
    <nav
      className={cn("flex flex-col gap-4 border-t border-border/60 pt-6", className)}
      aria-label={ariaLabel}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-center text-sm text-muted-foreground lg:text-left">
          Page <span className="font-medium text-foreground">{safePage}</span> of{" "}
          <span className="font-medium text-foreground">{totalPages}</span>
        </p>

        <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl shrink-0"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
          >
            Previous
          </Button>

          <div className="flex flex-wrap items-center justify-center gap-1 max-w-full">
            {items.map((item, idx) =>
              item === "ellipsis" ? (
                <span
                  key={`e-${idx}`}
                  className="px-1.5 text-muted-foreground select-none"
                  aria-hidden
                >
                  …
                </span>
              ) : (
                <Button
                  key={item}
                  type="button"
                  variant={item === safePage ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "min-w-9 rounded-xl px-2.5",
                    item === safePage && "pointer-events-none",
                  )}
                  aria-current={item === safePage ? "page" : undefined}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </Button>
              ),
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl shrink-0"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
        <span className="text-xs text-muted-foreground">Go to page</span>
        <Input
          type="number"
          min={1}
          max={totalPages}
          inputMode="numeric"
          className="h-9 w-16 rounded-lg text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          value={jumpValue}
          onChange={(e) => setJumpValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitJump();
            }
          }}
          aria-label="Page number"
        />
        <Button type="button" variant="secondary" size="sm" className="rounded-xl" onClick={commitJump}>
          Go
        </Button>
      </div>
    </nav>
  );
}
