import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Plugin to resolve @proofkit/typegen subpath exports
const resolveTypegenSubpaths = () => {
  const appPath = path.resolve(__dirname, "../src/server/app.ts");
  return {
    name: "resolve-typegen-subpaths",
    enforce: "pre" as const,
    resolveId(id) {
      if (id === "@proofkit/typegen/webui-server") {
        return appPath;
      }
      // Also handle if Vite is trying to resolve it as a file path
      if (id.endsWith("/webui-server") && id.includes("@proofkit/typegen")) {
        return appPath;
      }
      return null;
    },
  };
};

export default defineConfig({
  plugins: [react(), tailwindcss(), resolveTypegenSubpaths()],
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
  },
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
            if (err && "code" in err && err.code === "ECONNREFUSED" && res && !res.headersSent) {
              // Silently handle connection refused - the retry logic will handle it
              return;
            }
          });
        },
      },
    },
  },
});
