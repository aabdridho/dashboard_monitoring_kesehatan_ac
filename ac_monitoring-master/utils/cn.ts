import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Standard shadcn-style `cn` helper.
 *
 * Combines `clsx` (conditional class names) with `tailwind-merge`
 * (resolves conflicting Tailwind utilities so the last one wins).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
