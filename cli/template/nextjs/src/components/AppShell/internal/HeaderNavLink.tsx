"use client";
import { Route } from "@/app/navigation";
import classes from "./Header.module.css";
import React from "react";
import { usePathname } from "next/navigation";

export default function HeaderNavLink(route: Route) {
  const pathname = usePathname();

  if (route.type === "function") {
    return <a className={classes.link}>{route.label}</a>;
  }

  if (route.type === "link") {
    return (
      <a
        href={route.href}
        className={classes.link}
        data-active={pathname.startsWith(route.href) || undefined}
      >
        {route.label}
      </a>
    );
  }
}
