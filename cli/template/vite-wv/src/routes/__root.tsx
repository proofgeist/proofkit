import * as React from "react";
import { Link, Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";

export const Route = createRootRoute({
  component: RootComponent,
});

/**
 * This component wraps all other routes
 */
function RootComponent() {
  return (
    <>
      <Outlet />

      {process.env.NODE_ENV === "development" && (
        <TanStackRouterDevtools position="bottom-right" />
      )}
    </>
  );
}