"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

// Define input size variants
const textareaVariants = cva(
  `
    w-full bg-background border border-input bg-background text-foreground shadow-xs shadow-black/5 transition-[color,box-shadow] 
    text-foreground placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] 
    focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 [&[readonly]]:opacity-70 
    aria-invalid:border-destructive aria-invalid:border-destructive/60 aria-invalid:ring-destructive/10 dark:aria-invalid:border-destructive dark:aria-invalid:ring-destructive/20
  `,
  {
    variants: {
      variant: {
        sm: "rounded-md px-2.5 py-2.5 text-xs",
        md: "rounded-md px-3 py-3 text-sm",
        lg: "rounded-md px-4 py-4 text-sm",
      },
    },
    defaultVariants: {
      variant: "md",
    },
  },
);

function Textarea({
  className,
  variant,
  ...props
}: React.ComponentProps<"textarea"> & VariantProps<typeof textareaVariants>) {
  return <textarea className={cn(textareaVariants({ variant }), className)} data-slot="textarea" {...props} />;
}

export { Textarea, textareaVariants };
