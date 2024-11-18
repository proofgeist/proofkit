// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

import vercel from "@astrojs/vercel/serverless";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: "ProofKit CLI",
      social: {
        github: "https://github.com/proofgeist/proofkit",
      },
      sidebar: [
        {
          label: "Guides",
          autogenerate: { directory: "guides" },
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
  ],

  output: "server",
  adapter: vercel(),
});
