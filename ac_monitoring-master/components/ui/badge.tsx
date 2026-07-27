import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/15 text-primary-foreground/70",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        success: "border-emerald-500/30 bg-emerald-500/15 text-emerald-950 dark:text-emerald-300 font-semibold",
        warning: "border-amber-500/30 bg-amber-500/20 text-amber-950 dark:text-amber-200 font-semibold",
        destructive:
          "border-rose-500/30 bg-rose-500/15 text-rose-950 dark:text-rose-300 font-semibold",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
