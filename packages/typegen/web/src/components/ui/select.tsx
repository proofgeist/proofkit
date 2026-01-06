"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import { type ComponentProps, createContext, isValidElement, type ReactNode, useContext } from "react";
import { cn } from "@/lib/utils";

// Create a Context for `indicatorPosition` and `indicator` control
const SelectContext = createContext<{
  indicatorPosition: "left" | "right";
  indicatorVisibility: boolean;
  indicator: ReactNode;
}>({ indicatorPosition: "left", indicator: null, indicatorVisibility: true });

// Root Component
const Select = ({
  indicatorPosition = "left",
  indicatorVisibility = true,
  indicator,
  ...props
}: {
  indicatorPosition?: "left" | "right";
  indicatorVisibility?: boolean;
  indicator?: ReactNode;
} & ComponentProps<typeof SelectPrimitive.Root>) => {
  return (
    <SelectContext.Provider value={{ indicatorPosition, indicatorVisibility, indicator }}>
      <SelectPrimitive.Root {...props} />
    </SelectContext.Provider>
  );
};

function SelectGroup({ ...props }: ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({ ...props }: ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

// Define size variants for SelectTrigger
const selectTriggerVariants = cva(
  `
    flex bg-background w-full items-center justify-between outline-none border border-input shadow-xs shadow-black/5 transition-shadow 
    text-foreground data-placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] 
    focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 
    aria-invalid:border-destructive/60 aria-invalid:ring-destructive/10 dark:aria-invalid:border-destructive dark:aria-invalid:ring-destructive/20
    [[data-invalid=true]_&]:border-destructive/60 [[data-invalid=true]_&]:ring-destructive/10  dark:[[data-invalid=true]_&]:border-destructive dark:[[data-invalid=true]_&]:ring-destructive/20
  `,
  {
    variants: {
      size: {
        xs: "h-7 gap-1 rounded-md px-2 text-xs",
        sm: "h-8 gap-1 rounded-md px-2.5 text-xs",
        md: "h-9 gap-1 rounded-md px-3 text-sm",
        lg: "h-10 gap-1.5 rounded-md px-4 text-sm",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export interface SelectTriggerProps
  extends ComponentProps<typeof SelectPrimitive.Trigger>,
    VariantProps<typeof selectTriggerVariants> {}

function SelectTrigger({ className, children, size, ...props }: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      className={cn(selectTriggerVariants({ size }), className)}
      data-slot="select-trigger"
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="-me-0.5 h-4 w-4 opacity-60" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectScrollUpButton({ className, ...props }: ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      className={cn("flex cursor-default items-center justify-center py-1", className)}
      data-slot="select-scroll-up-button"
      {...props}
    >
      <ChevronUp className="h-4 w-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({ className, ...props }: ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      className={cn("flex cursor-default items-center justify-center py-1", className)}
      data-slot="select-scroll-down-button"
      {...props}
    >
      <ChevronDown className="h-4 w-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover text-secondary-foreground shadow-black/5 shadow-md data-[state=closed]:animate-out data-[state=open]:animate-in",
          position === "popper" &&
            "data-[side=left]:-translate-x-1.5 data-[side=right]:translate-x-1.5 data-[side=bottom]:translate-y-1.5 data-[side=top]:-translate-y-1.5",
          className,
        )}
        data-slot="select-content"
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1.5",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      className={cn("py-1.5 ps-8 pe-2 font-medium text-muted-foreground text-xs", className)}
      data-slot="select-label"
      {...props}
    />
  );
}

function SelectItem({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Item>) {
  const { indicatorPosition, indicatorVisibility, indicator } = useContext(SelectContext);

  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 text-foreground text-sm outline-hidden hover:bg-accent focus:bg-accent data-disabled:pointer-events-none data-disabled:opacity-50",
        indicatorPosition === "left" ? "ps-8 pe-2" : "ps-2 pe-8",
        className,
      )}
      data-slot="select-item"
      {...props}
    >
      {indicatorVisibility &&
        (indicator && isValidElement(indicator) ? (
          indicator
        ) : (
          <span
            className={cn(
              "absolute flex h-3.5 w-3.5 items-center justify-center",
              indicatorPosition === "left" ? "start-2" : "end-2",
            )}
          >
            <SelectPrimitive.ItemIndicator>
              <Check className="h-4 w-4 text-primary" />
            </SelectPrimitive.ItemIndicator>
          </span>
        ))}
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectIndicator({ children, className, ...props }: ComponentProps<typeof SelectPrimitive.ItemIndicator>) {
  const { indicatorPosition } = useContext(SelectContext);

  return (
    <span
      className={cn(
        "absolute top-1/2 flex -translate-y-1/2 items-center justify-center",
        indicatorPosition === "left" ? "start-2" : "end-2",
        className,
      )}
      data-slot="select-indicator"
      {...props}
    >
      <SelectPrimitive.ItemIndicator>{children}</SelectPrimitive.ItemIndicator>
    </span>
  );
}

function SelectSeparator({ className, ...props }: ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      className={cn("-mx-1.5 my-1.5 h-px bg-border", className)}
      data-slot="select-separator"
      {...props}
    />
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectIndicator,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
