"use client";

import { useNav } from "fumadocs-ui/contexts/layout";
import { useSidebar } from "fumadocs-ui/contexts/sidebar";
import { Sidebar as SidebarIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../../../lib/cn";
import { SearchToggle } from "../../search-toggle";
import { SidebarCollapseTrigger } from "../../sidebar";
import { buttonVariants } from "../../ui/button";

export function Navbar(props: ComponentProps<"header">) {
  const { isTransparent } = useNav();

  return (
    <header
      id="nd-subnav"
      {...props}
      className={cn(
        "fixed top-(--fd-banner-height) right-(--removed-body-scroll-bar-size,0) left-0 z-30 flex items-center border-b ps-4 pe-2.5 backdrop-blur-sm transition-colors",
        !isTransparent && "bg-fd-background/80",
        props.className,
      )}
    >
      {props.children}
    </header>
  );
}

export function LayoutBody(props: ComponentProps<"main">) {
  const { collapsed } = useSidebar();

  return (
    <main
      id="nd-docs-layout"
      {...props}
      className={cn(
        "fd-default-layout flex flex-1 flex-col pt-(--fd-nav-height) transition-[padding]",
        !collapsed && "mx-(--fd-layout-offset)",
        props.className,
      )}
      style={{
        ...props.style,
        paddingInlineStart: collapsed
          ? "min(calc(100vw - var(--fd-page-width)), var(--fd-sidebar-width))"
          : "var(--fd-sidebar-width)",
      }}
    >
      {props.children}
    </main>
  );
}

export function CollapsibleControl() {
  const { collapsed } = useSidebar();

  return (
    <div
      className={cn(
        "fixed z-10 flex rounded-xl border bg-fd-muted p-0.5 text-fd-muted-foreground shadow-lg transition-opacity max-md:hidden max-xl:end-4 xl:start-4",
        !collapsed && "pointer-events-none opacity-0",
      )}
      style={{
        top: "calc(var(--fd-banner-height) + var(--fd-tocnav-height) + var(--spacing) * 4)",
      }}
    >
      <SidebarCollapseTrigger
        className={cn(
          buttonVariants({
            color: "ghost",
            size: "icon-sm",
            className: "rounded-lg",
          }),
        )}
      >
        <SidebarIcon />
      </SidebarCollapseTrigger>
      <SearchToggle className="rounded-lg" hideIfDisabled />
    </div>
  );
}
