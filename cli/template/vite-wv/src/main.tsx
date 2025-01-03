import React from "react";
import ReactDOM from "react-dom/client";
import {
  RouterProvider,
  createHashHistory,
  createRouter,
} from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { MantineProvider } from "@mantine/core";
import { theme } from "./config/theme/mantine-theme";

import "@mantine/core/styles.css";
import "mantine-react-table/styles.css";
import "./config/theme/globals.css";

// Hash history is used since we are using a single file build
const hashHistory = createHashHistory();

// Set up a Router instance
const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  history: hashHistory,
});

// Register things for typesafety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("app")!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <MantineProvider theme={theme} forceColorScheme="light">
      <RouterProvider router={router} />
    </MantineProvider>
  );
}
