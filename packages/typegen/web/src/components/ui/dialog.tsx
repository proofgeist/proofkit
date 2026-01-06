"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

const dialogContentVariants = cva(
  "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed z-50 flex flex-col border border-border bg-background p-6 shadow-black/5 shadow-lg outline-0 duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in sm:rounded-lg",
  {
    variants: {
      variant: {
        default: "top-[50%] left-[50%] w-full max-w-lg translate-x-[-50%] translate-y-[-50%]",
        fullscreen: "inset-5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/30 [backdrop-filter:blur(4px)] data-[state=closed]:animate-out data-[state=open]:animate-in",
        className,
      )}
      data-slot="dialog-overlay"
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  overlay = true,
  variant,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> &
  VariantProps<typeof dialogContentVariants> & {
    showCloseButton?: boolean;
    overlay?: boolean;
  }) {
  return (
    <DialogPortal>
      {overlay && <DialogOverlay />}
      <DialogPrimitive.Content
        className={cn(dialogContentVariants({ variant }), className)}
        data-slot="dialog-content"
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogClose className="absolute end-5 top-5 cursor-pointer rounded-sm opacity-60 outline-0 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

export default DialogContent;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("mb-5 flex flex-col space-y-1 text-center sm:text-start", className)}
    data-slot="dialog-header"
    {...props}
  />
);

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse pt-5 sm:flex-row sm:justify-end sm:space-x-2.5", className)}
    data-slot="dialog-footer"
    {...props}
  />
);

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("font-semibold text-lg leading-none tracking-tight", className)}
      data-slot="dialog-title"
      {...props}
    />
  );
}

const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("grow", className)} data-slot="dialog-body" {...props} />
);

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="dialog-description"
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
