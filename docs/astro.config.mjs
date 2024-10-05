// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

import vercel from "@astrojs/vercel/serverless";

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: "ProofKit CLI",
      social: {
        github: "https://github.com/proofgeist/kit",
      },
      sidebar: [
        {
          label: "Guides",
          items: [
            { label: "Getting Started", slug: "guides/getting-started" },
            { label: "Project Structure", slug: "guides/folder-structure" },
          ],
        },
        {
          label: "Templates",
          autogenerate: { directory: "templates" },
        },
      ],
    }),
  ],

  output: "server",
  adapter: vercel(),
});
