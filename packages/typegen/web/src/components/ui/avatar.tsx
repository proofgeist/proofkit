"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Avatar as AvatarPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

const avatarStatusVariants = cva("flex size-2 items-center rounded-full border-2 border-background", {
  variants: {
    variant: {
      online: "bg-green-600",
      offline: "bg-zinc-400 dark:bg-zinc-500",
      busy: "bg-yellow-600",
      away: "bg-blue-600",
    },
  },
  defaultVariants: {
    variant: "online",
  },
});

function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root className={cn("relative flex size-10 shrink-0", className)} data-slot="avatar" {...props} />
  );
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <div className={cn("relative overflow-hidden rounded-full", className)}>
      <AvatarPrimitive.Image className={cn("aspect-square h-full w-full")} data-slot="avatar-image" {...props} />
    </div>
  );
}

function AvatarFallback({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full border border-border bg-accent text-accent-foreground text-xs",
        className,
      )}
      data-slot="avatar-fallback"
      {...props}
    />
  );
}

function AvatarIndicator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("absolute flex size-6 items-center justify-center", className)}
      data-slot="avatar-indicator"
      {...props}
    />
  );
}

function AvatarStatus({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof avatarStatusVariants>) {
  return <div className={cn(avatarStatusVariants({ variant }), className)} data-slot="avatar-status" {...props} />;
}

export { Avatar, AvatarFallback, AvatarImage, AvatarIndicator, AvatarStatus, avatarStatusVariants };
