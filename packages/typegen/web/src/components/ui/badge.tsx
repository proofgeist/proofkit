import { cva, type VariantProps } from "class-variance-authority";
import { Slot as SlotPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  asChild?: boolean;
  dotClassName?: string;
  disabled?: boolean;
}

export interface BadgeButtonProps
  extends React.ButtonHTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeButtonVariants> {
  asChild?: boolean;
}

export type BadgeDotProps = React.HTMLAttributes<HTMLSpanElement>;

const badgeVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap border border-transparent font-medium focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 [&_svg]:-ms-px [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        success:
          "bg-[var(--color-success-accent,var(--color-green-500))] text-[var(--color-success-foreground,var(--color-white))]",
        warning:
          "bg-[var(--color-warning-accent,var(--color-yellow-500))] text-[var(--color-warning-foreground,var(--color-white))]",
        info: "bg-[var(--color-info-accent,var(--color-violet-500))] text-[var(--color-info-foreground,var(--color-white))]",
        outline: "border border-border bg-transparent text-secondary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
      },
      appearance: {
        default: "",
        light: "",
        outline: "",
        ghost: "border-transparent bg-transparent",
      },
      disabled: {
        true: "pointer-events-none opacity-50",
      },
      size: {
        lg: "h-7 min-w-7 gap-1.5 rounded-md px-[0.5rem] text-xs [&_svg]:size-3.5",
        md: "h-6 min-w-6 gap-1.5 rounded-md px-[0.45rem] text-xs [&_svg]:size-3.5",
        sm: "h-5 min-w-5 gap-1 rounded-sm px-[0.325rem] text-[0.6875rem] leading-[0.75rem] [&_svg]:size-3",
        xs: "h-4 min-w-4 gap-1 rounded-sm px-[0.25rem] text-[0.625rem] leading-[0.5rem] [&_svg]:size-3",
      },
      shape: {
        default: "",
        circle: "rounded-full",
      },
    },
    compoundVariants: [
      /* Light */
      {
        variant: "primary",
        appearance: "light",
        className:
          "bg-[var(--color-primary-soft,var(--color-blue-50))] text-[var(--color-primary-accent,var(--color-blue-700))] dark:bg-[var(--color-primary-soft,var(--color-blue-950))] dark:text-[var(--color-primary-soft,var(--color-blue-600))]",
      },
      {
        variant: "secondary",
        appearance: "light",
        className: "bg-secondary text-secondary-foreground dark:bg-secondary/50",
      },
      {
        variant: "success",
        appearance: "light",
        className:
          "bg-[var(--color-success-soft,var(--color-green-100))] text-[var(--color-success-accent,var(--color-green-800))] dark:bg-[var(--color-success-soft,var(--color-green-950))] dark:text-[var(--color-success-soft,var(--color-green-600))]",
      },
      {
        variant: "warning",
        appearance: "light",
        className:
          "bg-[var(--color-warning-soft,var(--color-yellow-100))] text-[var(--color-warning-accent,var(--color-yellow-700))] dark:bg-[var(--color-warning-soft,var(--color-yellow-950))] dark:text-[var(--color-warning-soft,var(--color-yellow-600))]",
      },
      {
        variant: "info",
        appearance: "light",
        className:
          "bg-[var(--color-info-soft,var(--color-violet-100))] text-[var(--color-info-accent,var(--color-violet-700))] dark:bg-[var(--color-info-soft,var(--color-violet-950))] dark:text-[var(--color-info-soft,var(--color-violet-400))]",
      },
      {
        variant: "destructive",
        appearance: "light",
        className:
          "bg-[var(--color-destructive-soft,var(--color-red-50))] text-[var(--color-destructive-accent,var(--color-red-700))] dark:bg-[var(--color-destructive-soft,var(--color-red-950))] dark:text-[var(--color-destructive-soft,var(--color-red-600))]",
      },
      /* Outline */
      {
        variant: "primary",
        appearance: "outline",
        className:
          "border-[var(--color-primary-soft,var(--color-blue-100))] bg-[var(--color-primary-soft,var(--color-blue-50))] text-[var(--color-primary-accent,var(--color-blue-700))] dark:border-[var(--color-primary-soft,var(--color-blue-900))] dark:bg-[var(--color-primary-soft,var(--color-blue-950))] dark:text-[var(--color-primary-soft,var(--color-blue-600))]",
      },
      {
        variant: "success",
        appearance: "outline",
        className:
          "border-[var(--color-success-soft,var(--color-green-200))] bg-[var(--color-success-soft,var(--color-green-50))] text-[var(--color-success-accent,var(--color-green-700))] dark:border-[var(--color-success-soft,var(--color-green-900))] dark:bg-[var(--color-success-soft,var(--color-green-950))] dark:text-[var(--color-success-soft,var(--color-green-600))]",
      },
      {
        variant: "warning",
        appearance: "outline",
        className:
          "border-[var(--color-warning-soft,var(--color-yellow-200))] bg-[var(--color-warning-soft,var(--color-yellow-50))] text-[var(--color-warning-accent,var(--color-yellow-700))] dark:border-[var(--color-warning-soft,var(--color-yellow-900))] dark:bg-[var(--color-warning-soft,var(--color-yellow-950))] dark:text-[var(--color-warning-soft,var(--color-yellow-600))]",
      },
      {
        variant: "info",
        appearance: "outline",
        className:
          "border-[var(--color-info-soft,var(--color-violet-100))] bg-[var(--color-info-soft,var(--color-violet-50))] text-[var(--color-info-accent,var(--color-violet-700))] dark:border-[var(--color-info-soft,var(--color-violet-900))] dark:bg-[var(--color-info-soft,var(--color-violet-950))] dark:text-[var(--color-info-soft,var(--color-violet-400))]",
      },
      {
        variant: "destructive",
        appearance: "outline",
        className:
          "border-[var(--color-destructive-soft,var(--color-red-100))] bg-[var(--color-destructive-soft,var(--color-red-50))] text-[var(--color-destructive-accent,var(--color-red-700))] dark:border-[var(--color-destructive-soft,var(--color-red-900))] dark:bg-[var(--color-destructive-soft,var(--color-red-950))] dark:text-[var(--color-destructive-soft,var(--color-red-600))]",
      },
      /* Ghost */
      {
        variant: "primary",
        appearance: "ghost",
        className: "text-primary",
      },
      {
        variant: "secondary",
        appearance: "ghost",
        className: "text-secondary-foreground",
      },
      {
        variant: "success",
        appearance: "ghost",
        className: "text-[var(--color-success-accent,var(--color-green-500))]",
      },
      {
        variant: "warning",
        appearance: "ghost",
        className: "text-[var(--color-warning-accent,var(--color-yellow-500))]",
      },
      {
        variant: "info",
        appearance: "ghost",
        className: "text-[var(--color-info-accent,var(--color-violet-500))]",
      },
      {
        variant: "destructive",
        appearance: "ghost",
        className: "text-destructive",
      },

      { size: "lg", appearance: "ghost", className: "px-0" },
      { size: "md", appearance: "ghost", className: "px-0" },
      { size: "sm", appearance: "ghost", className: "px-0" },
      { size: "xs", appearance: "ghost", className: "px-0" },
    ],
    defaultVariants: {
      variant: "primary",
      appearance: "default",
      size: "md",
    },
  },
);

const badgeButtonVariants = cva(
  "-me-0.5 inline-flex size-3.5 cursor-pointer items-center justify-center rounded-md p-0 leading-none opacity-60 transition-all hover:opacity-100 [&>svg]:size-3.5! [&>svg]:opacity-100!",
  {
    variants: {
      variant: {
        default: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  size,
  appearance,
  shape,
  asChild = false,
  disabled,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? SlotPrimitive.Slot : "span";

  return (
    <Comp
      className={cn(badgeVariants({ variant, size, appearance, shape, disabled }), className)}
      data-slot="badge"
      {...props}
    />
  );
}

function BadgeButton({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof badgeButtonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? SlotPrimitive.Slot : "span";
  return (
    <Comp
      className={cn(badgeButtonVariants({ variant, className }))}
      data-slot="badge-button"
      role="button"
      {...props}
    />
  );
}

function BadgeDot({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("size-1.5 rounded-full bg-[currentColor] opacity-75", className)}
      data-slot="badge-dot"
      {...props}
    />
  );
}

export { Badge, BadgeButton, BadgeDot, badgeVariants };
