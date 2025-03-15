// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

import vercel from "@astrojs/vercel/serverless";

import react from "@astrojs/react";

import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: "ProofKit CLI",
      social: {
        github: "https://github.com/proofgeist/proofkit",
      },
      components: {
        Header: "./src/components/Header.astro",
      },
      sidebar: [
        {
          label: "Guides",
          autogenerate: { directory: "guides" },
        },
        {
          label: "Reference",
          autogenerate: { directory: "reference" },
        },
        {
          label: "Webviewer",
          autogenerate: { directory: "webviewer" },
        },
        {
          label: "Auth",
          autogenerate: { directory: "auth" },
        },
        {
          label: "Templates",
          autogenerate: { directory: "templates" },
        },
      ],
    }),
    react(),
    tailwind({
      // Disable Tailwind's default reset styles
      applyBaseStyles: false,
    }),
  ],
  redirects: {
    "/auth/proofkit": "/auth/fm-addon",
  },

  output: "server",
  adapter: vercel(),
});
