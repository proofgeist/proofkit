// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import starlightLlmsTxt from "starlight-llms-txt";

// https://astro.build/config
export default defineConfig({
  site: "https://proofkit.dev",
  integrations: [
    starlight({
      description:
        "ProofKit is a CLI tool for quickly building JavaScript apps.",
      // @ts-expect-error not sure why
      plugins: [starlightLlmsTxt({ projectName: "ProofKit CLI" })],
      title: "ProofKit",
      social: {
        github: "https://github.com/proofgeist/proofkit",
      },
      components: {
        Header: "./src/components/Header.astro",
      },
      customCss: ["./src/tailwind.css"],
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
    "/rate-session":
      "https://platform.claris.com/form/3256/6?ShortText8=How%20to%20build%20next-level%20web%20apps%20with%20Claris%20FileMaker#s=bXN0XzJzZHFNVjdIMWpZaTlUVkZ1Q1FJVzV2ODJxM1YyRUowOjZlYmZlNWYzOWI5NmViNzI1NzRlZmJiNGM5NDdmYzdhYWZiZDM3N2I2M2ZlNjJmYTk2MTg2YTBmNzE5MzQ1Mjk=",
  },

  output: "static",
});
