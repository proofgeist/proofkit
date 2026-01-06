import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ThemeProvider } from "./components/theme-provider";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 5,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
      refetchOnWindowFocus: false,
    },
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error(
    "Root element with id 'root' not found. Please ensure your HTML includes a <div id='root'></div> element.",
  );
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <QueryClientProvider client={queryClient}>
          <App />
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
