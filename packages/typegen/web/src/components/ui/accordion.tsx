"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDown, Plus } from "lucide-react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import { type ComponentProps, createContext, useContext } from "react";
import { cn } from "@/lib/utils";

// Variants
const accordionRootVariants = cva("", {
  variants: {
    variant: {
      default: "",
      outline: "space-y-2",
      solid: "space-y-2",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const accordionItemVariants = cva("", {
  variants: {
    variant: {
      default: "border-border border-b",
      outline: "rounded-lg border border-border px-4",
      solid: "rounded-lg bg-accent/70 px-4",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const accordionTriggerVariants = cva(
  "flex flex-1 cursor-pointer items-center justify-between gap-2.5 py-4 font-medium text-foreground transition-all [&[data-state=open]>svg]:rotate-180",
  {
    variants: {
      variant: {
        default: "",
        outline: "",
        solid: "",
      },
      indicator: {
        arrow: "",
        plus: "[&>svg>path:last-child]:origin-center [&>svg>path:last-child]:transition-all [&>svg>path:last-child]:duration-200 [&[data-state=open]>svg>path:last-child]:rotate-90 [&[data-state=open]>svg>path:last-child]:opacity-0 [&[data-state=open]>svg]:rotate-180",
        none: "",
      },
    },
    defaultVariants: {
      variant: "default",
      indicator: "arrow",
    },
  },
);

const accordionContentVariants = cva(
  "overflow-hidden text-accent-foreground text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
  {
    variants: {
      variant: {
        default: "",
        outline: "",
        solid: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

// Context
interface AccordionContextType {
  variant?: "default" | "outline" | "solid";
  indicator?: "arrow" | "plus" | "none";
}

const AccordionContext = createContext<AccordionContextType>({
  variant: "default",
  indicator: "arrow",
});

// Components
function Accordion(
  props: ComponentProps<typeof AccordionPrimitive.Root> &
    VariantProps<typeof accordionRootVariants> & {
      indicator?: "arrow" | "plus";
    },
) {
  const { className, variant = "default", indicator = "arrow", children, ...rest } = props;

  return (
    <AccordionContext.Provider value={{ variant: variant || "default", indicator }}>
      <AccordionPrimitive.Root
        className={cn(accordionRootVariants({ variant }), className)}
        data-slot="accordion"
        {...rest}
      >
        {children}
      </AccordionPrimitive.Root>
    </AccordionContext.Provider>
  );
}

function AccordionItem(props: ComponentProps<typeof AccordionPrimitive.Item>) {
  const { className, children, ...rest } = props;
  const { variant } = useContext(AccordionContext);

  return (
    <AccordionPrimitive.Item
      className={cn(accordionItemVariants({ variant }), className)}
      data-slot="accordion-item"
      {...rest}
    >
      {children}
    </AccordionPrimitive.Item>
  );
}

function AccordionTrigger(props: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  const { className, children, ...rest } = props;
  const { variant, indicator } = useContext(AccordionContext);

  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(accordionTriggerVariants({ variant, indicator }), className)}
        data-slot="accordion-trigger"
        {...rest}
      >
        {children}
        {indicator === "plus" && <Plus className="size-4 shrink-0 transition-transform duration-200" strokeWidth={1} />}
        {indicator === "arrow" && (
          <ChevronDown className="size-4 shrink-0 transition-transform duration-200" strokeWidth={1} />
        )}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent(props: ComponentProps<typeof AccordionPrimitive.Content>) {
  const { className, children, ...rest } = props;
  const { variant } = useContext(AccordionContext);

  return (
    <AccordionPrimitive.Content
      className={cn(accordionContentVariants({ variant }), className)}
      data-slot="accordion-content"
      {...rest}
    >
      <div className={cn("pt-0 pb-5", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}

// Exports
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
