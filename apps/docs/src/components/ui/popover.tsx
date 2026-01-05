"use client";
// biome-ignore lint/performance/noNamespaceImport: Radix UI uses namespace exports
import * as PopoverPrimitive from "@radix-ui/react-popover";
// biome-ignore lint/performance/noNamespaceImport: React namespace import needed for type checking
import * as React from "react";
import { cn } from "../../lib/cn";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ComponentRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      align={align}
      className={cn(
        "z-50 min-w-[240px] max-w-[98vw] origin-(--radix-popover-content-transform-origin) rounded-xl border bg-fd-popover/60 p-2 text-fd-popover-foreground text-sm shadow-lg backdrop-blur-lg focus-visible:outline-none data-[state=closed]:animate-fd-popover-out data-[state=open]:animate-fd-popover-in",
        className,
      )}
      ref={ref}
      side="bottom"
      sideOffset={sideOffset}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

const PopoverClose = PopoverPrimitive.PopoverClose;

export { Popover, PopoverTrigger, PopoverContent, PopoverClose };
