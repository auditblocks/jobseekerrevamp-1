/**
 * @file utils.ts
 * Shared utility functions used across the application.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS class names with intelligent conflict resolution.
 * Combines `clsx` (conditional classnames) with `tailwind-merge` (deduplication).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
