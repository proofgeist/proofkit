import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 5175,
  },
  plugins: [TanStackRouterVite({}), react(), viteSingleFile()],
});