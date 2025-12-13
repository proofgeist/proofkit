import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Plugin to resolve @proofkit/typegen subpath exports
const resolveTypegenSubpaths = () => {
  const contractPath = path.resolve(__dirname, "../src/server/contract.ts");
  return {
    name: "resolve-typegen-subpaths",
    enforce: "pre",
    resolveId(id) {
      if (
        id === "@proofkit/typegen/api" ||
        id === "@proofkit/typegen/api-app"
      ) {
        return contractPath;
      }
      // Also handle if Vite is trying to resolve it as a file path
      if (id.endsWith("/api") && id.includes("@proofkit/typegen")) {
        return contractPath;
      }
      return null;
    },
  };
};

export default defineConfig({
  plugins: [react(), tailwindcss(), resolveTypegenSubpaths()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@proofkit/typegen": path.resolve(__dirname, "../src"),
    },
  },
  build: {
    outDir: "dist",
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3141",
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, res) => {
            // Suppress ECONNREFUSED errors during startup
            if (
              err &&
              (err as any).code === "ECONNREFUSED" &&
              res &&
              !res.headersSent
            ) {
              // Silently handle connection refused - the retry logic will handle it
              return;
            }
          });
        },
      },
    },
  },
});
